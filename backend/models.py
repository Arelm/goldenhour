from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class EmergencyRequest(BaseModel):
    symptoms: str
    incident_location: str
    incident_lat: float
    incident_lng: float
    patient_age: Optional[int] = None
    additional_info: Optional[str] = None


class TriageOutput(BaseModel):
    """Validated contract between the LLM triage step and routing policy."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    emergency_type: Literal[
        "CARDIAC_ARREST", "STROKE", "TRAUMA", "SEPSIS", "RESPIRATORY",
        "PEDIATRIC", "OBSTETRIC", "GENERAL",
    ]
    urgency_level: Literal["CRITICAL", "HIGH", "MODERATE", "LOW"]
    specialist_needed: Literal[
        "cardiologist", "neurologist", "trauma_surgeon", "general_surgeon",
        "pediatrician", "none",
    ]
    key_requirements: List[Literal["icu", "cath_lab", "ct_scanner", "blood_bank", "generator"]] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)
    summary: str = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def require_clinically_required_capabilities(self):
        required_by_type = {
            "CARDIAC_ARREST": ("cardiologist", "cath_lab"),
            "STROKE": ("neurologist", "ct_scanner"),
            "TRAUMA": ("trauma_surgeon", "blood_bank"),
        }
        specialist, requirement = required_by_type.get(self.emergency_type, (None, None))
        if specialist and self.specialist_needed != specialist:
            raise ValueError(f"{self.emergency_type} must require a {specialist}")
        if requirement and requirement not in self.key_requirements:
            raise ValueError(f"{self.emergency_type} must include {requirement} in key_requirements")
        if self.urgency_level in {"CRITICAL", "HIGH"} and "icu" not in self.key_requirements:
            raise ValueError("CRITICAL and HIGH emergencies must include icu in key_requirements")
        return self


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
