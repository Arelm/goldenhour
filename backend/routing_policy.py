"""Deterministic, auditable hospital-selection policy for emergency routing."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from models import TriageOutput


SPECIALIST_FIELDS = {
    "cardiologist": "has_cardiologist",
    "neurologist": "has_neurologist",
    "trauma_surgeon": "has_trauma_surgeon",
    "general_surgeon": "has_general_surgeon",
    "pediatrician": "has_pediatrician",
}
REQUIREMENT_FIELDS = {
    "cath_lab": "cath_lab",
    "ct_scanner": "ct_scanner",
    "blood_bank": "blood_bank",
    "generator": "generator_status",
}
EMERGENCY_REQUIREMENTS = {
    "CARDIAC_ARREST": {"cath_lab"},
    "STROKE": {"ct_scanner"},
    "TRAUMA": {"blood_bank"},
}

# All factor values are normalized to [0, 1]. Weights total 100 for each urgency.
WEIGHTS = {
    "CRITICAL": {"specialist": 32, "requirements": 28, "icu": 24, "eta": 12, "bed_capacity": 4},
    "HIGH": {"specialist": 30, "requirements": 25, "icu": 20, "eta": 18, "bed_capacity": 7},
    "MODERATE": {"specialist": 28, "requirements": 25, "icu": 12, "eta": 25, "bed_capacity": 10},
    "LOW": {"specialist": 25, "requirements": 20, "icu": 5, "eta": 35, "bed_capacity": 15},
}

POLICY_DESCRIPTION = """RoutingPolicy v1 (deterministic; no generated code):
1. Exclude hospitals without an available bed, a required specialist, required equipment/power,
   or an available ICU when ICU is required.
2. Score eligible hospitals with normalized specialist, requirements, ICU capacity, ETA, and
   general-bed-capacity factors. Weights vary by triage urgency and sum to 100.
3. Resolve ties by lower ETA, then more available ICU beds, then more available beds, then ID."""


class RoutingPolicyError(RuntimeError):
    """A policy evaluation failed and must not be silently converted into a score."""


class NoEligibleHospitalError(RoutingPolicyError):
    def __init__(self, exclusions: dict[int, list[str]]):
        super().__init__("No hospital satisfies the hard routing eligibility gates.")
        self.exclusions = exclusions


@dataclass(frozen=True)
class PolicyScore:
    score: float
    eligible: bool
    reason_codes: list[str]
    breakdown: dict[str, Any]


class RoutingPolicy:
    """Pure scoring policy. It makes no network or database calls."""

    def required_specialist_present(self, hospital: dict[str, Any], triage: TriageOutput) -> bool:
        field = SPECIALIST_FIELDS.get(triage.specialist_needed)
        return field is None or bool(hospital.get(field, False))

    @staticmethod
    def effective_requirements(triage: TriageOutput) -> set[str]:
        requirements = set(triage.key_requirements) | EMERGENCY_REQUIREMENTS.get(triage.emergency_type, set())
        if triage.urgency_level in {"CRITICAL", "HIGH"}:
            requirements.add("icu")
        return requirements

    def eligibility_reasons(self, hospital: dict[str, Any], triage: TriageOutput) -> list[str]:
        reasons: list[str] = []
        if int(hospital.get("available_beds", 0)) <= 0:
            reasons.append("NO_AVAILABLE_BEDS")
        if not self.required_specialist_present(hospital, triage):
            reasons.append("MISSING_REQUIRED_SPECIALIST")

        for requirement in sorted(self.effective_requirements(triage)):
            if requirement == "icu":
                if int(hospital.get("available_icu", 0)) <= 0:
                    reasons.append("NO_AVAILABLE_ICU")
            elif not bool(hospital.get(REQUIREMENT_FIELDS[requirement], False)):
                reasons.append(f"MISSING_{requirement.upper()}")
        return reasons

    @staticmethod
    def _capacity_factor(value: int, target: int) -> float:
        return round(min(max(value, 0) / target, 1.0), 4)

    @staticmethod
    def _eta_factor(eta_minutes: int, urgency: str) -> float:
        # Critical cases lose their ETA credit by 30 minutes; low urgency by 90.
        window = {"CRITICAL": 30, "HIGH": 45, "MODERATE": 60, "LOW": 90}[urgency]
        return round(max(0.0, 1 - (max(eta_minutes, 0) / window)), 4)

    def score_hospital(self, hospital: dict[str, Any], triage: TriageOutput, eta_minutes: int) -> PolicyScore:
        reasons = self.eligibility_reasons(hospital, triage)
        if reasons:
            return PolicyScore(
                score=0.0,
                eligible=False,
                reason_codes=reasons,
                breakdown={"eligible": False, "reason_codes": reasons, "factors": {}, "weights": WEIGHTS[triage.urgency_level]},
            )

        weights = WEIGHTS[triage.urgency_level]
        requirements = self.effective_requirements(triage)
        # Gates guarantee each required item is present. This remains explicit for auditability.
        requirement_factor = 1.0 if requirements else 1.0
        factors = {
            "specialist": 1.0,
            "requirements": requirement_factor,
            "icu": self._capacity_factor(int(hospital.get("available_icu", 0)), 10),
            "eta": self._eta_factor(eta_minutes, triage.urgency_level),
            "bed_capacity": self._capacity_factor(int(hospital.get("available_beds", 0)), 50),
        }
        contributions = {name: round(factors[name] * weight, 2) for name, weight in weights.items()}
        score = round(sum(contributions.values()), 2)
        breakdown = {
            "eligible": True,
            "reason_codes": ["ELIGIBLE"],
            "factors": factors,
            "weights": weights,
            "contributions": contributions,
            "score": score,
            "eta_minutes": eta_minutes,
            "available_icu": int(hospital.get("available_icu", 0)),
            "available_beds": int(hospital.get("available_beds", 0)),
        }
        return PolicyScore(score=score, eligible=True, reason_codes=["ELIGIBLE"], breakdown=breakdown)

    def rank(self, hospitals: list[dict[str, Any]], triage: TriageOutput, etas: dict[int, dict[str, Any]]) -> list[dict[str, Any]]:
        scored: list[dict[str, Any]] = []
        exclusions: dict[int, list[str]] = {}
        for hospital in hospitals:
            eta_data = etas.get(hospital["id"], {"eta_minutes": 30, "distance_km": 10})
            result = self.score_hospital(hospital, triage, int(eta_data["eta_minutes"]))
            row = {**hospital, **eta_data, "score": result.score, "score_breakdown": result.breakdown,
                   "has_required_specialist": self.required_specialist_present(hospital, triage)}
            if result.eligible:
                scored.append(row)
            else:
                exclusions[hospital["id"]] = result.reason_codes
        if not scored:
            raise NoEligibleHospitalError(exclusions)
        return sorted(scored, key=lambda h: (-h["score"], h["eta_minutes"], -h["available_icu"], -h["available_beds"], h["id"]))
