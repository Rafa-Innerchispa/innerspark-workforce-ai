import os
from datetime import datetime, timezone
from typing import Annotated

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="InnerSpark Device Gateway", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Demo cache. Production persists this data in PostgreSQL/Cloud SQL.
device_status: dict[str, dict] = {}
attendance_events: list[dict] = []


class MobilePunch(BaseModel):
    employee_id: str
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy_m: float = Field(gt=0)
    captured_at: datetime
    photo_object: str | None = None
    offline_id: str | None = None


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "device-gateway",
        "devices_seen": len(device_status),
        "events_received": len(attendance_events),
    }


def authorize_device(serial: str) -> None:
    allowed = {item.strip() for item in os.getenv("DEVICE_ALLOWLIST", "").split(",") if item.strip()}
    if allowed and serial not in allowed:
        raise HTTPException(status_code=403, detail="Device serial is not registered")


def touch_device(serial: str, **extra: object) -> None:
    device_status[serial] = {
        **device_status.get(serial, {}),
        "serial": serial,
        "last_seen": datetime.now(timezone.utc).isoformat(),
        **extra,
    }


@app.get("/iclock/cdata")
def adms_handshake(
    sn: Annotated[str, Query(alias="SN")],
    options: Annotated[str | None, Query(alias="options")] = None,
) -> str:
    """Handshake compatible with common ZKTeco ADMS/iClock firmware."""
    authorize_device(sn)
    touch_device(sn, state="online", options=options)
    return f"GET OPTION FROM: {sn}\nStamp=0\nOpStamp=0\nErrorDelay=30\nDelay=10\nTransTimes=00:00;14:05\nTransInterval=1\nTransFlag=1111000000\nRealtime=1\nEncrypt=0"


@app.post("/iclock/cdata")
async def receive_adms(
    request: Request,
    sn: Annotated[str, Query(alias="SN")],
    table: Annotated[str, Query(alias="table")] = "ATTLOG",
) -> str:
    authorize_device(sn)
    payload = (await request.body()).decode("utf-8", errors="replace")
    rows = [row for row in payload.splitlines() if row.strip()]
    touch_device(sn, state="online", last_table=table)
    if table.upper() == "ATTLOG":
        for row in rows:
            columns = row.split("\t")
            if len(columns) >= 2:
                event = {
                    "device_serial": sn,
                    "employee_code": columns[0],
                    "occurred_at": columns[1],
                    "verification": columns[3] if len(columns) > 3 else None,
                    "raw": row,
                }
                key = (event["device_serial"], event["employee_code"], event["occurred_at"])
                if not any((e["device_serial"], e["employee_code"], e["occurred_at"]) == key for e in attendance_events):
                    attendance_events.append(event)
    return f"OK: {len(rows)}"


@app.get("/iclock/getrequest")
def adms_poll(sn: Annotated[str, Query(alias="SN")]) -> str:
    """Long-poll endpoint used by TA Push firmware to request pending commands."""
    authorize_device(sn)
    touch_device(sn, state="online")
    return "OK"


@app.post("/iclock/devicecmd")
async def adms_command_result(request: Request, sn: Annotated[str, Query(alias="SN")]) -> str:
    authorize_device(sn)
    result = (await request.body()).decode("utf-8", errors="replace")
    touch_device(sn, state="online", last_command_result=result[:500])
    return "OK"


@app.get("/api/v1/devices")
def list_devices() -> list[dict]:
    return sorted(device_status.values(), key=lambda item: item["serial"])


@app.get("/api/v1/events")
def list_events(limit: Annotated[int, Query(ge=1, le=500)] = 100) -> list[dict]:
    return attendance_events[-limit:][::-1]


@app.post("/api/v1/mobile-punches", status_code=202)
def mobile_punch(punch: MobilePunch) -> dict:
    # TODO: verify geofence, signed upload object and offline-id idempotency.
    return {
        "accepted": True,
        "employee_id": punch.employee_id,
        "received_at": datetime.now(timezone.utc).isoformat(),
        "review_required": punch.accuracy_m > 100,
    }
