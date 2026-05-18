from __future__ import annotations

import base64
import json
import mimetypes
import os
import re
from pathlib import Path
from typing import Literal

from .config import load_local_env
from .models import FrameAnalysis

load_local_env()

VLMProvider = Literal["truth", "openai", "gemini"]

DEFAULT_OPENAI_MODEL = "gpt-5-mini"
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite"
DEFAULT_TIMEOUT_SECONDS = 60.0


class VLMConfigError(RuntimeError):
    pass


class VLMResponseError(RuntimeError):
    pass


ANALYSIS_PROMPT = """You are the vision layer for a bedside hospital monitoring prototype.
Return only strict JSON matching this schema:
{
  "bed_state": "unknown|in_bed|sitting_edge|out_of_bed|on_floor",
  "bed_state_confidence": 0.0-1.0,
  "staff_present": true|false,
  "staff_confidence": 0.0-1.0,
  "vitals": {
    "hr": {"value": number|null, "unit": "bpm", "confidence": 0.0-1.0},
    "spo2": {"value": number|null, "unit": "%", "confidence": 0.0-1.0},
    "rr": {"value": number|null, "unit": "/min", "confidence": 0.0-1.0},
    "bp": {"systolic": number|null, "diastolic": number|null, "unit": "mmHg", "confidence": 0.0-1.0}
  },
  "iv": {
    "state": "unknown|running|near_empty|completed_or_stopped|unclear|absent",
    "confidence": 0.0-1.0,
    "bag_fill_percent": number|null,
    "note": string|null
  },
  "fall": {"suspected": true|false, "confirmed": true|false, "confidence": 0.0-1.0},
  "scene": "short neutral description",
  "model_trace": {"provider": string, "model": string}
}

Rules:
- Use "sitting_edge" when the patient is seated on the mattress edge with legs over the side.
- Use "out_of_bed" when the patient is upright outside the bed zone.
- Use "on_floor" when the patient is lying/sitting on the floor beside the bed.
- Set fall.suspected true for any patient on floor or obvious fall posture.
- Set fall.confirmed true only when the image strongly supports a post-fall patient-on-floor state.
- Treat scrubs, PPE, stethoscope, or clinical activity as staff presence.
- OCR only monitor numbers you can read with reasonable confidence; otherwise omit or use low confidence.
- IV near_empty means the bag appears below roughly 15% fill.
- Do not infer patient identity, demographics, diagnosis, or anything not visible.
"""


def analyze_image(
    image_path: Path,
    *,
    provider: VLMProvider | None = None,
    model: str | None = None,
    prompt: str = ANALYSIS_PROMPT,
) -> FrameAnalysis:
    provider = provider or default_provider()
    if provider == "truth":
        raise VLMConfigError("truth provider requires a known manifest analysis, not an image call")
    if provider == "openai":
        return analyze_openai(
            image_path,
            model=model or os.getenv("OPENAI_VISION_MODEL") or DEFAULT_OPENAI_MODEL,
            prompt=prompt,
        )
    if provider == "gemini":
        return analyze_gemini(
            image_path,
            model=model or os.getenv("GEMINI_VISION_MODEL") or DEFAULT_GEMINI_MODEL,
            prompt=prompt,
        )
    raise VLMConfigError(f"unsupported VLM provider: {provider}")


def default_provider() -> VLMProvider:
    provider = os.getenv("HEALTHER_VISION_VLM_PROVIDER", "openai").strip().lower()
    if provider not in {"truth", "openai", "gemini"}:
        raise VLMConfigError(f"invalid HEALTHER_VISION_VLM_PROVIDER: {provider}")
    return provider  # type: ignore[return-value]


def analyze_openai(image_path: Path, *, model: str, prompt: str) -> FrameAnalysis:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise VLMConfigError("OPENAI_API_KEY is not set")
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise VLMConfigError('install VLM extras with: pip install -e ".[vlm]"') from exc

    client = OpenAI(api_key=api_key, timeout=vlm_timeout_seconds())
    response = client.responses.create(
        model=model,
        input=[
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {"type": "input_image", "image_url": image_data_url(image_path)},
                ],
            }
        ],
    )
    return parse_analysis_text(response.output_text, provider="openai", model=model)


def analyze_gemini(image_path: Path, *, model: str, prompt: str) -> FrameAnalysis:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise VLMConfigError("GEMINI_API_KEY or GOOGLE_API_KEY is not set")
    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise VLMConfigError('install VLM extras with: pip install -e ".[vlm]"') from exc

    client = genai.Client(api_key=api_key)
    image_bytes = image_path.read_bytes()
    mime_type = mimetypes.guess_type(image_path.name)[0] or "image/png"
    response = client.models.generate_content(
        model=model,
        contents=[
            prompt,
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        ],
    )
    return parse_analysis_text(response.text or "", provider="gemini", model=model)


def vlm_timeout_seconds() -> float:
    raw = os.getenv("HEALTHER_VISION_VLM_TIMEOUT_SECONDS")
    if not raw:
        return DEFAULT_TIMEOUT_SECONDS
    try:
        return max(1.0, float(raw))
    except ValueError:
        return DEFAULT_TIMEOUT_SECONDS


def image_data_url(path: Path) -> str:
    mime_type = mimetypes.guess_type(path.name)[0] or "image/png"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def parse_analysis_text(text: str, *, provider: str, model: str) -> FrameAnalysis:
    raw = extract_json(text)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise VLMResponseError(f"model returned non-JSON analysis: {text[:500]}") from exc
    data.setdefault("model_trace", {})
    data["model_trace"].update({"provider": provider, "model": model})
    return FrameAnalysis.model_validate(data)


def extract_json(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("{") and stripped.endswith("}"):
        return stripped
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", stripped, flags=re.DOTALL)
    if fenced:
        return fenced.group(1)
    match = re.search(r"\{.*\}", stripped, flags=re.DOTALL)
    if match:
        return match.group(0)
    return stripped
