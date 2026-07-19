import logging

from fastapi import APIRouter, HTTPException
from openai import OpenAI
from pydantic import ValidationError
import os, math, requests
from database import get_all_hospitals, log_dispatch
from models import EmergencyRequest, RoutingResponse, HospitalWithETA, TriageOutput
from routers.triage import run_triage
from routing_policy import NoEligibleHospitalError, POLICY_DESCRIPTION, RoutingPolicy, RoutingPolicyError

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
GMAPS_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
logger = logging.getLogger(__name__)

EXPLAIN_SYSTEM = """You are a Lagos emergency dispatch AI.
Explain in 2-3 plain sentences WHY this hospital was chosen.
Name the hospital, the key capability matched, the ETA, and one risk if relevant.
Be direct. No jargon. Dispatcher is making a life-or-death call."""


def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat, dlng = math.radians(lat2-lat1), math.radians(lng2-lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1))*math.cos(math.radians(lat2))*math.sin(dlng/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


def get_etas(origin_lat, origin_lng, hospitals):
    if not GMAPS_KEY:
        return {h["id"]: {"eta_minutes": max(5, int((haversine(origin_lat,origin_lng,h["lat"],h["lng"])/15)*60)),
                           "distance_km": round(haversine(origin_lat,origin_lng,h["lat"],h["lng"]),1)} for h in hospitals}
    dests = "|".join([f"{h['lat']},{h['lng']}" for h in hospitals])
    url = (f"https://maps.googleapis.com/maps/api/distancematrix/json"
           f"?origins={origin_lat},{origin_lng}&destinations={dests}"
           f"&mode=driving&departure_time=now&traffic_model=best_guess&key={GMAPS_KEY}")
    try:
        data = requests.get(url, timeout=10).json()
        etas = {}
        for i, h in enumerate(hospitals):
            el = data["rows"][0]["elements"][i]
            if el["status"] == "OK":
                dur = el.get("duration_in_traffic", el["duration"])
                etas[h["id"]] = {"eta_minutes": max(5,int(dur["value"]/60)),
                                  "distance_km": round(el["distance"]["value"]/1000,1)}
            else:
                dist = haversine(origin_lat,origin_lng,h["lat"],h["lng"])
                etas[h["id"]] = {"eta_minutes": max(5,int((dist/15)*60)), "distance_km": round(dist,1)}
        return etas
    except:
        return {h["id"]: {"eta_minutes": max(5,int((haversine(origin_lat,origin_lng,h["lat"],h["lng"])/15)*60)),
                           "distance_km": round(haversine(origin_lat,origin_lng,h["lat"],h["lng"]),1)} for h in hospitals}


def explain(triage, top, alts):
    alt_str = ", ".join([f"{a['short_name']} ({a['eta_minutes']}min)" for a in alts[:2]])
    prompt = (f"Emergency: {triage.emergency_type} — {triage.summary}\n"
              f"Recommended: {top['name']} in {top['area']}\n"
              f"ETA: {top['eta_minutes']} min | ICU: {top['available_icu']} | "
              f"Specialist available: {top.get('has_required_specialist')} | "
              f"Generator: {'Online' if top['generator_status'] else 'OFFLINE'}\n"
              f"Alternatives: {alt_str}")
    resp = client.chat.completions.create(
        model="gpt-5.6",
        messages=[{"role":"system","content":EXPLAIN_SYSTEM},{"role":"user","content":prompt}], max_completion_tokens=800
    )
    return resp.choices[0].message.content.strip()


@router.post("/route", response_model=RoutingResponse)
async def route_emergency(request: EmergencyRequest):
    try:
        triage = await run_triage(request.symptoms, request.patient_age, request.additional_info)
        hospitals = get_all_hospitals()
        etas = get_etas(request.incident_lat, request.incident_lng, hospitals)
        scored = RoutingPolicy().rank(hospitals, triage, etas)
        top, alts = scored[0], scored[1:3]
        explanation = explain(triage, top, alts)
        did = log_dispatch({"emergency_type":triage.emergency_type,
                            "incident_location":request.incident_location,
                            "symptoms":request.symptoms,
                            "recommended_hospital_id":top["id"],
                            "recommended_hospital_name":top["name"],
                            "triage_output":triage.model_dump_json(),
                            "routing_explanation":explanation})
        def to_eta(h):
            return HospitalWithETA(id=h["id"],name=h["name"],short_name=h["short_name"],
                area=h["area"],lat=h["lat"],lng=h["lng"],available_beds=h["available_beds"],
                available_icu=h["available_icu"],has_required_specialist=h["has_required_specialist"],
                generator_status=h["generator_status"],eta_minutes=h["eta_minutes"],
                distance_km=h["distance_km"],score=h["score"],
                score_breakdown=h["score_breakdown"],capacity_note=h.get("capacity_note",""))
        return RoutingResponse(dispatch_id=did, triage=triage,
            recommended_hospital=to_eta(top), alternatives=[to_eta(a) for a in alts],
            routing_explanation=explanation, codex_scoring_function=POLICY_DESCRIPTION,
            all_hospitals_ranked=[to_eta(h) for h in scored])
    except NoEligibleHospitalError as exc:
        logger.warning("Routing policy excluded every hospital: %s", exc.exclusions)
        raise HTTPException(status_code=422, detail={"message": str(exc), "exclusions": exc.exclusions})
    except ValidationError as exc:
        logger.warning("Invalid triage output rejected: %s", exc.errors())
        raise HTTPException(status_code=422, detail="Triage output failed validation. No recommendation was made.") from exc
    except RoutingPolicyError as exc:
        logger.exception("Routing policy failed")
        raise HTTPException(status_code=500, detail="Routing policy evaluation failed. No recommendation was made.") from exc
    except Exception as e:
        logger.exception("Emergency routing failed")
        raise HTTPException(status_code=500, detail="Emergency routing failed. No recommendation was made.") from e
