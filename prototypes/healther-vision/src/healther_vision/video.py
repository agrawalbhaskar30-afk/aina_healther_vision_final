from __future__ import annotations

from pathlib import Path

import cv2


def extract_frames(video_path: Path, out_dir: Path, every_seconds: float = 1.0, limit: int = 120) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {video_path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 25
    step = max(1, int(fps * every_seconds))
    written: list[Path] = []
    frame_index = 0
    saved_index = 0
    while len(written) < limit:
        ok, frame = cap.read()
        if not ok:
            break
        if frame_index % step == 0:
            path = out_dir / f"frame_{saved_index:04d}.jpg"
            cv2.imwrite(str(path), frame)
            written.append(path)
            saved_index += 1
        frame_index += 1
    cap.release()
    return written
