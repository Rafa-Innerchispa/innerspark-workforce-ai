#!/usr/bin/env python3
"""Bounded FunctionGemma live probe via inneros google_extra_models (Vertex ADC)."""
from __future__ import annotations

import json
import os
import sys

PLATFORM_ROOT = os.environ.get(
    "INNEROS_PLATFORM_ROOT",
    "/home/rlopez/inneros/inneros_core/platform",
)
if PLATFORM_ROOT not in sys.path:
    sys.path.insert(0, PLATFORM_ROOT)

from inneros_core_runtime import google_extra_models  # noqa: E402


def _load_platform_env() -> None:
    env_file = os.path.join(PLATFORM_ROOT, ".env")
    if not os.path.isfile(env_file):
        return
    with open(env_file, encoding="utf-8") as handle:
        for raw in handle:
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def main() -> int:
    _load_platform_env()
    os.environ.setdefault(
        "INNEROS_FUNCTION_GEMMA_ENDPOINT_ID",
        "mg-endpoint-98cacc40-0e4e-41fd-8f86-91a93146e936",
    )
    os.environ.setdefault("INNEROS_FUNCTION_GEMMA_ENDPOINT_REGION", "us-central1")
    # Stale dedicated DNS breaks predict; let google_extra_models describe the endpoint fresh.
    os.environ.pop("INNEROS_FUNCTION_GEMMA_ENDPOINT_DNS", None)
    project_id = os.environ.get("INNEROS_FUNCTION_GEMMA_PROJECT_ID", "innerops-agentic-platform")
    result = google_extra_models.function_gemma_route_preflight(project_id=project_id, allow_live=True)
    print(json.dumps(result))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
