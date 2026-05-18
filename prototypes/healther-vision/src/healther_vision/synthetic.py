from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from PIL import Image, ImageDraw

from .models import (
    BedState,
    CameraRole,
    FallSignal,
    FrameAnalysis,
    IVReading,
    IVState,
    SyntheticFrameMeta,
    SyntheticManifest,
    SyntheticScenario,
    VitalReading,
)


CANVAS = (1280, 720)
BG = (30, 36, 42)
FLOOR = (47, 54, 59)
BED = (202, 210, 216)
BED_RAIL = (128, 142, 154)
PATIENT = (236, 196, 142)
BLANKET = (78, 132, 180)
STAFF = (83, 189, 158)
MONITOR = (18, 22, 25)
MONITOR_GREEN = (64, 220, 136)
IV_BLUE = (159, 206, 235)
RED = (228, 80, 80)
AMBER = (232, 176, 77)
WHITE = (245, 248, 250)


def generate_scenario(
    scenario: SyntheticScenario,
    out_dir: Path,
    frames: int = 24,
    camera_role: CameraRole = CameraRole.CCTV,
    start_at: datetime | None = None,
) -> SyntheticManifest:
    out_dir.mkdir(parents=True, exist_ok=True)
    start = start_at or datetime.now(timezone.utc).replace(microsecond=0)
    metas: list[SyntheticFrameMeta] = []
    for i in range(frames):
        captured_at = start + timedelta(seconds=i * 2)
        analysis = analysis_for(scenario, i, frames, camera_role)
        image = render_frame(analysis, scenario=scenario, camera_role=camera_role, frame_index=i)
        filename = f"frame_{i:04d}.png"
        image.save(out_dir / filename)
        metas.append(
            SyntheticFrameMeta(
                index=i,
                filename=filename,
                camera_role=camera_role,
                scenario=scenario,
                captured_at=captured_at,
                analysis=analysis,
            )
        )
    manifest = SyntheticManifest(scenario=scenario, camera_role=camera_role, frames=metas)
    (out_dir / "manifest.json").write_text(manifest.model_dump_json(indent=2), encoding="utf-8")
    return manifest


def analysis_for(
    scenario: SyntheticScenario,
    index: int,
    total: int,
    camera_role: CameraRole,
) -> FrameAnalysis:
    pct = index / max(total - 1, 1)
    vitals = {
        "hr": VitalReading(value=88, unit="bpm", confidence=0.9),
        "spo2": VitalReading(value=97, unit="%", confidence=0.9),
        "rr": VitalReading(value=18, unit="/min", confidence=0.86),
        "bp": VitalReading(systolic=122, diastolic=78, unit="mmHg", confidence=0.85),
    }
    iv = IVReading(state=IVState.RUNNING, confidence=0.82, bag_fill_percent=58)
    bed_state = BedState.IN_BED
    staff_present = False
    fall = FallSignal()

    if scenario == SyntheticScenario.FALL:
        if pct < 0.35:
            bed_state = BedState.IN_BED
        elif pct < 0.55:
            bed_state = BedState.SITTING_EDGE
        elif pct < 0.72:
            bed_state = BedState.OUT_OF_BED
        else:
            bed_state = BedState.ON_FLOOR
            fall = FallSignal(suspected=True, confirmed=pct > 0.86, confidence=0.88)
    elif scenario == SyntheticScenario.OUT_OF_BED:
        bed_state = BedState.IN_BED if pct < 0.35 or pct > 0.8 else BedState.OUT_OF_BED
    elif scenario == SyntheticScenario.STAFF_VISIT:
        staff_present = 0.25 <= pct <= 0.7
        bed_state = BedState.IN_BED
    elif scenario == SyntheticScenario.VITALS_ALERT:
        vitals["hr"] = VitalReading(value=128, unit="bpm", confidence=0.9)
        vitals["spo2"] = VitalReading(value=88, unit="%", confidence=0.92)
    elif scenario == SyntheticScenario.IV_NEAR_EMPTY:
        fill = max(4, 60 - pct * 58)
        iv = IVReading(
            state=IVState.NEAR_EMPTY if fill < 15 else IVState.RUNNING,
            confidence=0.84,
            bag_fill_percent=round(fill, 1),
        )
    elif scenario == SyntheticScenario.TABLET_ROUND:
        staff_present = True
        bed_state = BedState.IN_BED
        iv = IVReading(state=IVState.UNCLEAR, confidence=0.45, note="round camera angle")

    return FrameAnalysis(
        bed_state=bed_state,
        bed_state_confidence=0.9 if bed_state != BedState.UNKNOWN else 0.5,
        staff_present=staff_present,
        staff_confidence=0.88 if staff_present else 0.7,
        vitals=vitals,
        iv=iv,
        fall=fall,
        scene=f"Synthetic {camera_role.value} frame for {scenario.value}",
        model_trace={"provider": "synthetic", "model": "pillow-scene-v0"},
    )


def render_frame(
    analysis: FrameAnalysis,
    *,
    scenario: SyntheticScenario,
    camera_role: CameraRole,
    frame_index: int,
) -> Image.Image:
    image = Image.new("RGB", CANVAS, BG)
    draw = ImageDraw.Draw(image)
    draw.rectangle((0, 500, CANVAS[0], CANVAS[1]), fill=FLOOR)

    if camera_role == CameraRole.CCTV:
        bed_box = (250, 260, 820, 470)
        monitor_box = (930, 170, 1165, 340)
        iv_x = 870
    else:
        bed_box = (140, 260, 930, 560)
        monitor_box = (960, 100, 1230, 310)
        iv_x = 1000

    draw_bed(draw, bed_box)
    draw_monitor(draw, monitor_box, analysis.vitals)
    draw_iv(draw, iv_x, 170, analysis.iv)
    draw_patient(draw, bed_box, analysis.bed_state)
    if analysis.staff_present:
        draw_staff(draw, x=180 if camera_role == CameraRole.CCTV else 1040, y=310)
    draw_overlay(draw, analysis, scenario, camera_role, frame_index)
    return image


def draw_bed(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int]) -> None:
    x1, y1, x2, y2 = box
    draw.rounded_rectangle(box, radius=22, fill=BED)
    draw.rectangle((x1 + 20, y1 + 28, x2 - 20, y2 - 28), fill=(230, 235, 239))
    draw.line((x1 + 8, y1 + 15, x2 - 8, y1 + 15), fill=BED_RAIL, width=8)
    draw.line((x1 + 8, y2 - 15, x2 - 8, y2 - 15), fill=BED_RAIL, width=8)
    draw.rectangle((x1 + 10, y1 - 30, x1 + 80, y1 + 20), fill=(224, 230, 235))


def draw_patient(draw: ImageDraw.ImageDraw, bed_box: tuple[int, int, int, int], state: BedState) -> None:
    x1, y1, x2, y2 = bed_box
    cx = (x1 + x2) // 2
    cy = (y1 + y2) // 2
    if state == BedState.IN_BED:
        draw.ellipse((cx - 145, cy - 72, cx - 95, cy - 22), fill=PATIENT)
        draw.rounded_rectangle((cx - 85, cy - 70, cx + 150, cy + 70), radius=35, fill=BLANKET)
    elif state == BedState.SITTING_EDGE:
        draw.ellipse((x2 - 125, cy - 95, x2 - 75, cy - 45), fill=PATIENT)
        draw.rounded_rectangle((x2 - 120, cy - 40, x2 - 45, cy + 70), radius=24, fill=BLANKET)
        draw.line((x2 - 75, cy + 60, x2 - 35, cy + 135), fill=PATIENT, width=18)
        draw.line((x2 - 105, cy + 60, x2 - 105, cy + 140), fill=PATIENT, width=18)
    elif state == BedState.OUT_OF_BED:
        draw.ellipse((x2 + 65, y2 - 180, x2 + 120, y2 - 125), fill=PATIENT)
        draw.rounded_rectangle((x2 + 72, y2 - 120, x2 + 115, y2 - 20), radius=20, fill=BLANKET)
        draw.line((x2 + 80, y2 - 25, x2 + 55, y2 + 55), fill=PATIENT, width=14)
        draw.line((x2 + 108, y2 - 25, x2 + 135, y2 + 55), fill=PATIENT, width=14)
    elif state == BedState.ON_FLOOR:
        fy = y2 + 100
        draw.ellipse((x2 - 65, fy - 45, x2 - 15, fy + 5), fill=PATIENT)
        draw.rounded_rectangle((x2 - 15, fy - 35, x2 + 190, fy + 25), radius=28, fill=BLANKET)


def draw_staff(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    draw.ellipse((x - 24, y - 80, x + 24, y - 32), fill=(210, 178, 135))
    draw.rounded_rectangle((x - 32, y - 28, x + 32, y + 85), radius=18, fill=STAFF)
    draw.rectangle((x - 30, y - 4, x + 30, y + 10), fill=WHITE)
    draw.line((x - 18, y + 85, x - 40, y + 155), fill=(36, 80, 120), width=12)
    draw.line((x + 18, y + 85, x + 40, y + 155), fill=(36, 80, 120), width=12)


def draw_monitor(draw: ImageDraw.ImageDraw, box: tuple[int, int, int, int], vitals: dict[str, VitalReading]) -> None:
    draw.rounded_rectangle(box, radius=14, fill=MONITOR, outline=(72, 82, 90), width=3)
    x1, y1, _, _ = box
    lines = [
        ("HR", _value(vitals.get("hr")), "bpm"),
        ("SpO2", _value(vitals.get("spo2")), "%"),
        ("RR", _value(vitals.get("rr")), "/min"),
        ("BP", _bp(vitals.get("bp")), "mmHg"),
    ]
    for i, (label, value, unit) in enumerate(lines):
        y = y1 + 22 + i * 34
        draw.text((x1 + 18, y), label, fill=(150, 160, 166))
        color = RED if label == "SpO2" and str(value).isdigit() and int(value) < 92 else MONITOR_GREEN
        draw.text((x1 + 86, y), str(value), fill=color)
        draw.text((x1 + 160, y), unit, fill=(150, 160, 166))


def draw_iv(draw: ImageDraw.ImageDraw, x: int, y: int, iv: IVReading) -> None:
    draw.line((x, y, x, y + 330), fill=(180, 188, 194), width=5)
    draw.line((x - 45, y + 18, x + 45, y + 18), fill=(180, 188, 194), width=5)
    bag = (x + 24, y + 35, x + 96, y + 170)
    draw.rounded_rectangle(bag, radius=12, outline=WHITE, width=3)
    fill = max(0, min(100, iv.bag_fill_percent if iv.bag_fill_percent is not None else 50))
    fill_h = int((bag[3] - bag[1] - 10) * fill / 100)
    fill_color = AMBER if iv.state == IVState.NEAR_EMPTY else IV_BLUE
    draw.rectangle((bag[0] + 5, bag[3] - 5 - fill_h, bag[2] - 5, bag[3] - 5), fill=fill_color)
    draw.line((x + 60, bag[3], x + 20, y + 320), fill=IV_BLUE, width=3)


def draw_overlay(
    draw: ImageDraw.ImageDraw,
    analysis: FrameAnalysis,
    scenario: SyntheticScenario,
    camera_role: CameraRole,
    frame_index: int,
) -> None:
    text = f"{scenario.value} | {camera_role.value} | frame {frame_index:04d} | {analysis.bed_state.value}"
    draw.rounded_rectangle((24, 22, 650, 70), radius=12, fill=(12, 16, 20))
    draw.text((42, 38), text, fill=WHITE)
    if analysis.fall.suspected:
        draw.rounded_rectangle((24, 86, 300, 132), radius=12, fill=RED)
        draw.text((42, 101), "FALL CUE", fill=WHITE)


def _value(vital: VitalReading | None) -> str:
    if vital is None or vital.value is None:
        return "--"
    return str(int(vital.value))


def _bp(vital: VitalReading | None) -> str:
    if vital is None or vital.systolic is None or vital.diastolic is None:
        return "--/--"
    return f"{int(vital.systolic)}/{int(vital.diastolic)}"


def manifest_to_json(manifest: SyntheticManifest) -> dict:
    return json.loads(manifest.model_dump_json())
