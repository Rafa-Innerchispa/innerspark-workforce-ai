#!/usr/bin/env python3
"""Install Firebase Trigger Email on innerspark-workforce-ai."""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

PROJECT = os.environ.get("FIREBASE_PROJECT", "innerspark-workforce-ai")
FROM_ACCOUNT = os.environ.get("INNEROS_SMTP_USER", "info@pcdoctor.ai")
SECRETS_FILE = Path(
    os.environ.get("RALFIA_EMAIL_SECRETS", Path.home() / ".config/ralfia/email_secrets.json")
)
WORKDIR = Path(__file__).resolve().parent.parent
PARAMS_FILE = WORKDIR / "extensions/firestore-send-email.env"
SECRET_NAME = os.environ.get("INNEROS_SMTP_SECRET_NAME", "inneros-smtp-password")
GCLOUD = Path.home() / ".local/bin/gcloud"


def run(cmd: list[str], *, input_data: bytes | None = None) -> None:
    subprocess.run(cmd, input=input_data, check=True)


def ensure_adc_quota() -> None:
    adc = Path.home() / ".config/gcloud/application_default_credentials.json"
    if not adc.is_file():
        return
    data = json.loads(adc.read_text(encoding="utf-8"))
    data["quota_project_id"] = PROJECT
    adc.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print("ADC quota_project_id set")


def ensure_secret(smtp_pass: str) -> str:
    tmp = WORKDIR / ".tmp-smtp-secret.txt"
    tmp.write_text(smtp_pass, encoding="utf-8")
    try:
        probe = subprocess.run(
            [str(GCLOUD), "secrets", "describe", SECRET_NAME, f"--project={PROJECT}"],
            capture_output=True,
            text=True,
        )
        if probe.returncode == 0:
            run([str(GCLOUD), "secrets", "versions", "add", SECRET_NAME, f"--project={PROJECT}", f"--data-file={tmp}"])
        else:
            run(
                [
                    str(GCLOUD),
                    "secrets",
                    "create",
                    SECRET_NAME,
                    f"--project={PROJECT}",
                    "--replication-policy=automatic",
                    f"--data-file={tmp}",
                ]
            )
    finally:
        tmp.unlink(missing_ok=True)
    return f"projects/{PROJECT}/secrets/{SECRET_NAME}/versions/latest"


def write_params(secret_ref: str) -> None:
    template = (WORKDIR / "extensions/firestore-send-email.env.example").read_text(encoding="utf-8")
    lines = []
    for line in template.splitlines():
        if line.startswith("SMTP_PASSWORD="):
            lines.append(f"SMTP_PASSWORD={secret_ref}")
        else:
            lines.append(line)
    PARAMS_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("Wrote params file:", PARAMS_FILE)


def deploy_extension() -> None:
    env = os.environ.copy()
    env["GOOGLE_CLOUD_PROJECT"] = PROJECT
    env["CLOUDSDK_CORE_PROJECT"] = PROJECT
    env["GOOGLE_CLOUD_QUOTA_PROJECT"] = PROJECT
    run(
        [
            "npx",
            "--yes",
            "firebase-tools@latest",
            "deploy",
            "--only",
            "extensions",
            f"--project={PROJECT}",
            "--force",
        ],
        input_data=None,
    )


def main() -> int:
    if not SECRETS_FILE.is_file():
        print(f"Missing {SECRETS_FILE}", file=sys.stderr)
        return 1
    data = json.loads(SECRETS_FILE.read_text(encoding="utf-8"))
    smtp_pass = (data.get(FROM_ACCOUNT) or "").strip()
    if not smtp_pass:
        print(f"No SMTP password for {FROM_ACCOUNT}", file=sys.stderr)
        return 1

    ensure_adc_quota()
    secret_ref = ensure_secret(smtp_pass)
    print("SMTP secret ref:", secret_ref)
    write_params(secret_ref)

    print(f"Deploying firebase/firestore-send-email on {PROJECT} ...")
    os.chdir(WORKDIR)
    deploy_extension()
    print("Done. Verify Firebase Console → Extensions → Trigger Email.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
