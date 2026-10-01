"""Limpieza manual de archivos huérfanos en R2. Wrapper de
`python -m app.services.r2_cleanup` (lo mismo que corre el Cron de Railway).

Desde backend/ con el .venv:
    python scripts/cleanup_r2_orphans.py                          # dry run
    python scripts/cleanup_r2_orphans.py --apply --include-existing-users
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.r2_cleanup import _cli  # noqa: E402

if __name__ == "__main__":
    sys.exit(asyncio.run(_cli()))
