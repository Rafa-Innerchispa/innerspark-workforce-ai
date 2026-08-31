#!/usr/bin/env bash
# Hackathon E2E evidence — login → Judge A2A → ISKCON PDF (curl, prod-safe)
set -euo pipefail

BASE="${INNEROS_E2E_BASE:-https://inneros.creatorcore.ai}"
ISKCON_BASE="${ISKCON_E2E_BASE:-https://iskcon.creatorcore.ai}"
PHONE="${INNEROS_DEMO_CEDULA:-HACKATHON-JUDGE}"
PASS="${INNEROS_DEMO_PASS:-demo123}"
OUT="${INNEROS_E2E_OUT:-/tmp/inneros_hackathon_e2e_$(date +%Y%m%d_%H%M%S).json}"
JAR=$(mktemp)

cleanup() { rm -f "$JAR"; }
trap cleanup EXIT

log() { echo "[e2e] $*" >&2; }

login() {
  curl -sS -c "$JAR" -b "$JAR" -X POST "$BASE/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"cedula\":\"$PHONE\",\"password\":\"$PASS\"}" | python3 -c "import sys,json; d=json.load(sys.stdin); print('login_ok', d.get('success')); sys.exit(0 if d.get('success') else 1)"
}

judge_a2a() {
  curl -sS -b "$JAR" -X POST "$BASE/api/ecosystem/judge" \
    -H 'Content-Type: application/json' \
    -d '{"action":"a2a_handshake"}' | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('a2a_state', (d.get('status') or {}).get('state'))
print('a2a_agents', d.get('agent_count'))
"
}

iskcon_pdf() {
  local rel
  rel=$(curl -sS -b "$JAR" -X POST "$BASE/api/ecosystem/module-actions" \
    -H 'Content-Type: application/json' \
    -d '{"hubId":"festivals","subActionId":"emergency","lang":"es","prompt":"E2E PDF Panihati 2026"}' \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print('action_status', d.get('status')); arts=d.get('artifacts') or []; print('artifact_url', (arts[0].get('url','') if arts else '')[:120]); print((arts[0].get('url','') if arts else ''))" | tail -1)
  if [[ -z "$rel" ]]; then exit 2; fi
  if [[ "$rel" == http* ]]; then pdf_url="$rel"; else pdf_url="$BASE$rel"; fi
  head_bytes=$(curl -sS -b "$JAR" "$pdf_url" | head -c 5)
  if [[ "$head_bytes" == "%PDF-" ]]; then echo "pdf_magic OK"; else echo "pdf_magic FAIL"; exit 3; fi
}

aria_tts() {
  code=$(curl -sS -o /dev/null -w '%{http_code}' -b "$JAR" -X POST "$BASE/api/ecosystem/aria/tts" \
    -H 'Content-Type: application/json' \
    -d '{"text":"E2E ARIA TTS","lang":"es"}')
  echo "aria_tts_http $code"
}

judge_demo_steps() {
  local steps_file=/tmp/e2e_judge_steps.txt
  : > "$steps_file"
  local pass=0 total=0
  while IFS='|' read -r action payload; do
    total=$((total + 1))
    if curl -sS -b "$JAR" -X POST "$BASE/api/ecosystem/judge" \
      -H 'Content-Type: application/json' \
      -d "$payload" | python3 -c "
import sys,json
d=json.load(sys.stdin)
action='$action'
ok=d.get('ok') is not False
if action=='a2a_handshake':
  st=(d.get('status') or {}).get('state') if isinstance(d.get('status'),dict) else d.get('state')
  ok = st=='online'
elif action=='a2a_cards':
  cards=d.get('cards')
  n=len(cards) if isinstance(cards,list) else len(cards or {}) if isinstance(cards,dict) else int(d.get('count') or 0)
  ok = n>0
elif action=='iskcon_emergency_pdf':
  ok = bool(d.get('pdf_url') or (d.get('artifacts') or [{}])[0].get('url'))
print('step', action, 'OK' if ok else 'FAIL')
sys.exit(0 if ok else 1)
"; then
      pass=$((pass + 1))
    fi
  done <<'STEPS'
safe_trigger|{"action":"safe_trigger","trigger":"verify_system","dry_run":false}
a2a_handshake|{"action":"a2a_handshake"}
a2a_cards|{"action":"a2a_cards","limit":5}
iskcon_emergency_pdf|{"action":"iskcon_emergency_pdf"}
a2a_dispatch|{"action":"a2a_dispatch","agent_id":"AG-25","title":"E2E","body":"dry","dry_run":true}
STEPS
  echo "demo_steps ${pass}/${total}" | tee -a "$steps_file"
  cat "$steps_file"
  [[ "$pass" -eq "$total" ]]
}

main() {
  log "base=$BASE out=$OUT"
  login
  judge_a2a | tee /tmp/e2e_judge.txt
  judge_demo_steps | tee /tmp/e2e_judge_demo.txt
  iskcon_pdf | tee /tmp/e2e_iskcon.txt
  aria_tts | tee /tmp/e2e_aria.txt
  python3 - <<PY
import json, pathlib
out = {
  "ok": True,
  "base": "$BASE",
  "iskcon_base": "$ISKCON_BASE",
  "judge": pathlib.Path("/tmp/e2e_judge.txt").read_text(),
  "judge_demo": pathlib.Path("/tmp/e2e_judge_demo.txt").read_text(),
  "iskcon": pathlib.Path("/tmp/e2e_iskcon.txt").read_text(),
  "aria": pathlib.Path("/tmp/e2e_aria.txt").read_text(),
}
pathlib.Path("$OUT").write_text(json.dumps(out, indent=2))
print("evidence", "$OUT")
PY
}

main "$@"
