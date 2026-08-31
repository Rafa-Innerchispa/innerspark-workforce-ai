#!/usr/bin/env bash
set -euo pipefail
exec python3 "$(dirname "$0")/install_firebase_trigger_email.py" "$@"
