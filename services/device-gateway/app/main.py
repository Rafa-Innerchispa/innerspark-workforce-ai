from datetime import datetime, timezone
from typing import Annotated

from fastapi import FastAPI, Form, Query, Request
from pydantic import BaseModel, Field

app = FastAPI(title="InnerSpark Device Gateway", version="0.1.0")


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
    return {"status": "ok", "service": "device-gateway"}


@app.get("/iclock/cdata")
def adms_handshake(
    sn: Annotated[str, Query(alias="SN")],
    options: Annotated[str | None, Query(alias="options")] = None,
) -> str:
    """Handshake compatible with common ZKTeco ADMS/iClock firmware."""
    return f"GET OPTION FROM: {sn}\nStamp=0\nOpStamp=0\nErrorDelay=30\nDelay=10\nTransTimes=00:00;14:05\nTransInterval=1\nTransFlag=1111000000\nRealtime=1\nEncrypt=0"


@app.post("/iclock/cdata")
async def receive_adms(
    request: Request,
    sn: Annotated[str, Query(alias="SN")],
    table: Annotated[str, Query(alias="table")] = "ATTLOG",
) -> str:
    payload = (await request.body()).decode("utf-8", errors="replace")
    rows = [row for row in payload.splitlines() if row.strip()]
    # TODO: persist normalized rows idempotently using (device, employee, timestamp).
    return f"OK: {len(rows)}"


@app.post("/api/v1/mobile-punches", status_code=202)
def mobile_punch(punch: MobilePunch) -> dict:
    # TODO: verify geofence, signed upload object and offline-id idempotency.
    return {
        "accepted": True,
        "employee_id": punch.employee_id,
        "received_at": datetime.now(timezone.utc).isoformat(),
        "review_required": punch.accuracy_m > 100,
    }
