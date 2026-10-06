#!/usr/bin/env python3
"""Hook PreToolUse del agente testing: bloquea Edit/Write fuera de rutas de tests."""
import json, re, sys

data = json.load(sys.stdin)
path = (data.get("tool_input") or {}).get("file_path", "")
ALLOWED = [
    r"/frontend/src/.*/__tests__/",
    r"/frontend/src/.*\.test\.(ts|tsx)$",
    r"/backend/tests/",
]
if any(re.search(p, path) for p in ALLOWED):
    sys.exit(0)
print(
    f"BLOQUEADO: el agente testing solo puede escribir en tests ({path} no esta permitido). "
    "No corrijas codigo de produccion ni docs: reportalo como hallazgo en tu reporte final.",
    file=sys.stderr,
)
sys.exit(2)
