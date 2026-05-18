from __future__ import annotations

import os
from pathlib import Path


def load_local_env(start: Path | None = None) -> Path | None:
    """Load simple KEY=VALUE pairs from the nearest .env without overwriting shell env."""
    env_path = find_env(start or Path.cwd())
    if env_path is None:
        return None
    for line in env_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and value:
            os.environ.setdefault(key, value)
    return env_path


def find_env(start: Path) -> Path | None:
    candidates = [start.resolve(), *start.resolve().parents]
    package_root = Path(__file__).resolve()
    candidates.extend(package_root.parents)
    seen: set[Path] = set()
    for folder in candidates:
        if folder in seen:
            continue
        seen.add(folder)
        env_path = folder / ".env"
        if env_path.exists():
            return env_path
    return None
