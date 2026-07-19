import hmac
import os

from fastapi import APIRouter, Header, HTTPException, status
from database import get_all_hospitals, get_hospital_by_id, update_hospital_capacity, log_override
from models import CapacityUpdate, OverrideRequest

router = APIRouter()


def require_capacity_api_key(x_api_key: str | None = Header(default=None)):
    expected_key = os.getenv("HOSPITAL_CAPACITY_API_KEY")
    if not expected_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Capacity updates are not configured.",
        )
    if not x_api_key or not hmac.compare_digest(x_api_key, expected_key):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid capacity update API key.")


@router.get("/")
async def list_hospitals():
    return get_all_hospitals()


@router.get("/{hospital_id}")
async def get_hospital(hospital_id: int):
    h = get_hospital_by_id(hospital_id)
    if not h:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return h


@router.patch("/{hospital_id}/capacity")
async def update_capacity(hospital_id: int, update: CapacityUpdate, x_api_key: str | None = Header(default=None)):
    require_capacity_api_key(x_api_key)
    h = get_hospital_by_id(hospital_id)
    if not h:
        raise HTTPException(status_code=404, detail="Hospital not found")
    updates = update.routing_updates()
    if updates.get("available_beds", 0) > h["total_beds"]:
        raise HTTPException(status_code=422, detail=f"general_beds cannot exceed {h['total_beds']} total beds")
    if updates.get("available_icu", 0) > h["icu_beds"]:
        raise HTTPException(status_code=422, detail=f"icu_beds cannot exceed {h['icu_beds']} total ICU beds")
    update_hospital_capacity(hospital_id, updates)
    return {"message": f"Updated {h['name']}", "updates": updates}


@router.post("/override")
async def dispatcher_override(override: OverrideRequest):
    h = get_hospital_by_id(override.override_hospital_id)
    if not h:
        raise HTTPException(status_code=404, detail="Override hospital not found")
    log_override(override.dispatch_id, override.override_hospital_id, override.reason)
    return {"message": "Override logged", "overridden_to": h["name"]}
