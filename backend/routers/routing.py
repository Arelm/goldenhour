from fastapi import APIRouter, HTTPException
from openai import OpenAI
import json, os, math, requests
from database import get_all_hospitals, log_dispatch
from models import EmergencyRequest, RoutingResponse, HospitalWithETA, TriageOutput
from routers.triage import run_triage

router = APIRouter()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
GMAPS_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

CODEX_SYSTEM = """You are Codex. Generate a Python function to score Lagos hospitals for emergency routing.
Return ONLY a valid Python function named score_hospital.
Signature: def score_hospital(hospital: dict, triage: dict, eta_minutes: int) -> float
Score range: 0-100. Higher = better match.
Weight based on emergency_type and urgency_level in triage.
CRITICAL urgency: ICU + required specialist = 60%+ of score.
Cardiac: prioritise cath_lab, cardiologist, available_icu.
Stroke: prioritise ct_scanner, neurologist. Penalise ETA heavily — every 5min = -8pts.
Trauma: prioritise trauma_surgeon, blood_bank.
Always penalise generator_status=False for CRITICAL cases (-15pts)."""

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


def codex_score_fn(triage):
    prompt = (f"Emergency: {triage['emergency_type']} | Urgency: {triage['urgency_level']} | "
              f"Specialist: {triage['specialist_needed']} | Requirements: {triage['key_requirements']}")
    resp = client.chat.completions.create(
        model="codex-mini-latest",
        messages=[{"role":"system","content":CODEX_SYSTEM},{"role":"user","content":prompt}],
        temperature=0.1
    )
    code = resp.choices[0].message.content.strip()
    if "```python" in code: code = code.split("```python")[1].split("```")[0].strip()
    elif "```" in code: code = code.split("```")[1].split("```")[0].strip()
    ns = {}
    exec(code, ns)
    return code, ns["score_hospital"]


def explain(triage, top, alts):
    alt_str = ", ".join([f"{a['short_name']} ({a['eta_minutes']}min)" for a in alts[:2]])
    prompt = (f"Emergency: {triage['emergency_type']} — {triage['summary']}\n"
              f"Recommended: {top['name']} in {top['area']}\n"
              f"ETA: {top['eta_minutes']} min | ICU: {top['available_icu']} | "
              f"Specialist available: {top.get('has_required_specialist')} | "
              f"Generator: {'Online' if top['generator_status'] else 'OFFLINE'}\n"
              f"Alternatives: {alt_str}")
    resp = client.chat.completions.create(
        model="gpt-5.6",
        messages=[{"role":"system","content":EXPLAIN_SYSTEM},{"role":"user","content":prompt}],
        temperature=0.3, max_tokens=150
    )
    return resp.choices[0].message.content.strip()


def specialist_match(h, specialist):
    mapping = {"cardiologist":"has_cardiologist","neurologist":"has_neurologist",
               "trauma_surgeon":"has_trauma_surgeon","general_surgeon":"has_general_surgeon",
               "pediatrician":"has_pediatrician","none":None}
    field = mapping.get(specialist.lower())
    return True if not field else bool(h.get(field, False))


@router.post("/route", response_model=RoutingResponse)
async def route_emergency(request: EmergencyRequest):
    try:
        triage = await run_triage(request.symptoms, request.patient_age, request.additional_info)
        hospitals = get_all_hospitals()
        etas = get_etas(request.incident_lat, request.incident_lng, hospitals)
        code, score_fn = codex_score_fn(triage)
        scored = []
        for h in hospitals:
            eta_data = etas.get(h["id"], {"eta_minutes":30,"distance_km":10})
            try:
                score = max(0, min(100, float(score_fn(h, triage, eta_data["eta_minutes"]))))
            except:
                score = 0
            scored.append({**h, **eta_data, "score": score,
                           "has_required_specialist": specialist_match(h, triage.get("specialist_needed","none")),
                           "score_breakdown":{"score":score,"eta":eta_data["eta_minutes"],
                                              "icu":h["available_icu"],"generator":h["generator_status"]}})
        scored.sort(key=lambda x: x["score"], reverse=True)
        top, alts = scored[0], scored[1:3]
        explanation = explain(triage, top, alts)
        did = log_dispatch({"emergency_type":triage["emergency_type"],
                            "incident_location":request.incident_location,
                            "symptoms":request.symptoms,
                            "recommended_hospital_id":top["id"],
                            "recommended_hospital_name":top["name"],
                            "triage_output":json.dumps(triage),
                            "routing_explanation":explanation})
        def to_eta(h):
            return HospitalWithETA(id=h["id"],name=h["name"],short_name=h["short_name"],
                area=h["area"],lat=h["lat"],lng=h["lng"],available_beds=h["available_beds"],
                available_icu=h["available_icu"],has_required_specialist=h["has_required_specialist"],
                generator_status=h["generator_status"],eta_minutes=h["eta_minutes"],
                distance_km=h["distance_km"],score=h["score"],
                score_breakdown=h["score_breakdown"],capacity_note=h.get("capacity_note",""))
        return RoutingResponse(dispatch_id=did, triage=TriageOutput(**triage),
            recommended_hospital=to_eta(top), alternatives=[to_eta(a) for a in alts],
            routing_explanation=explanation, codex_scoring_function=code,
            all_hospitals_ranked=[to_eta(h) for h in scored])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
