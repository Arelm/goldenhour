from pydantic import BaseModel
from typing import Optional, List


class EmergencyRequest(BaseModel):
    symptoms: str
    incident_location: str
    incident_lat: float
    incident_lng: float
    patient_age: Optional[int] = None
    additional_info: Optional[str] = None


class TriageOutput(BaseModel):
    emergency_type: str
    urgency_level: str
    specialist_needed: str
    key_requirements: List[str]
    red_flags: List[str]
    summary: str


class HospitalWithETA(BaseModel):
    id: int
    name: str
    short_name: str
    area: str
    lat: float
    lng: float
    available_beds: int
    available_icu: int
    has_required_specialist: bool
    generator_status: bool
    eta_minutes: int
    distance_km: float
    score: float
    score_breakdown: dict
    capacity_note: str


class RoutingResponse(BaseModel):
    dispatch_id: int
    triage: TriageOutput
    recommended_hospital: HospitalWithETA
    alternatives: List[HospitalWithETA]
    routing_explanation: str
    codex_scoring_function: str
    all_hospitals_ranked: List[HospitalWithETA]


class CapacityUpdate(BaseModel):
    available_beds: Optional[int] = None
    available_icu: Optional[int] = None
    has_cardiologist: Optional[bool] = None
    has_neurologist: Optional[bool] = None
    has_trauma_surgeon: Optional[bool] = None
    generator_status: Optional[bool] = None
    capacity_note: Optional[str] = None


class OverrideRequest(BaseModel):
    dispatch_id: int
    override_hospital_id: int
    reason: str


class Hospital(BaseModel):
    id: int
    name: str
    short_name: str
    area: str
    lat: float
    lng: float
    total_beds: int
    available_beds: int
    icu_beds: int
    available_icu: int
    has_cardiologist: bool
    has_neurologist: bool
    has_trauma_surgeon: bool
    has_general_surgeon: bool
    has_pediatrician: bool
    generator_status: bool
    blood_bank: bool
    cath_lab: bool
    ct_scanner: bool
    phone: Optional[str]
    capacity_note: Optional[str]
    last_updated: Optional[str]
