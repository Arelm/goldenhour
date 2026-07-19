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
    """Capacity input supporting both legacy Admin UI and current API field names."""

    model_config = ConfigDict(extra="forbid")

    # New API names: available general and ICU beds, respectively.
    general_beds: Optional[int] = Field(default=None, ge=0)
    icu_beds: Optional[int] = Field(default=None, ge=0)
    generator_online: Optional[bool] = None
    # Legacy names remain accepted so the current Hospitals page keeps working.
    available_beds: Optional[int] = Field(default=None, ge=0)
    available_icu: Optional[int] = Field(default=None, ge=0)
    has_cardiologist: Optional[bool] = None
    has_neurologist: Optional[bool] = None
    has_trauma_surgeon: Optional[bool] = None
    has_general_surgeon: Optional[bool] = None
    has_pediatrician: Optional[bool] = None
    generator_status: Optional[bool] = None
    capacity_note: Optional[str] = None

    @model_validator(mode="after")
    def validate_aliases_and_content(self):
        if self.general_beds is not None and self.available_beds is not None and self.general_beds != self.available_beds:
            raise ValueError("general_beds and available_beds must match when both are supplied")
        if self.icu_beds is not None and self.available_icu is not None and self.icu_beds != self.available_icu:
            raise ValueError("icu_beds and available_icu must match when both are supplied")
        if self.generator_online is not None and self.generator_status is not None and self.generator_online != self.generator_status:
            raise ValueError("generator_online and generator_status must match when both are supplied")
        if not self.model_dump(exclude_none=True):
            raise ValueError("At least one capacity field is required")
        return self

    def routing_updates(self) -> dict:
        """Translate accepted input aliases to the columns used by routing."""
        updates = self.model_dump(exclude_none=True)
        if "general_beds" in updates:
            updates["available_beds"] = updates.pop("general_beds")
        if "icu_beds" in updates:
            updates["available_icu"] = updates.pop("icu_beds")
        if "generator_online" in updates:
            updates["generator_status"] = updates.pop("generator_online")
        return updates


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
