import asyncio
import os
import unittest

from models import TriageOutput
from routing_policy import NoEligibleHospitalError, RoutingPolicy


def hospital(hospital_id=1, **overrides):
    data = {
        "id": hospital_id,
        "name": f"Hospital {hospital_id}",
        "short_name": f"H{hospital_id}",
        "area": "Lagos",
        "lat": 6.5,
        "lng": 3.4,
        "capacity_note": "Available",
        "available_beds": 20,
        "available_icu": 4,
        "has_cardiologist": 1,
        "has_neurologist": 1,
        "has_trauma_surgeon": 1,
        "has_general_surgeon": 1,
        "has_pediatrician": 1,
        "generator_status": 1,
        "blood_bank": 1,
        "cath_lab": 1,
        "ct_scanner": 1,
    }
    data.update(overrides)
    return data


class RoutingPolicyTests(unittest.TestCase):
    def setUp(self):
        self.policy = RoutingPolicy()
        self.cardiac = TriageOutput(
            emergency_type="CARDIAC_ARREST", urgency_level="CRITICAL",
            specialist_needed="cardiologist", key_requirements=["icu", "cath_lab", "generator"],
            red_flags=["No pulse"], summary="Critical cardiac emergency.",
        )

    def test_hard_gates_exclude_missing_critical_capability(self):
        result = self.policy.score_hospital(hospital(available_icu=0, cath_lab=0), self.cardiac, 8)
        self.assertFalse(result.eligible)
        self.assertEqual(result.score, 0)
        self.assertIn("NO_AVAILABLE_ICU", result.reason_codes)
        self.assertIn("MISSING_CATH_LAB", result.reason_codes)

    def test_triage_rejects_missing_mandatory_cardiac_capability(self):
        with self.assertRaises(ValueError):
            TriageOutput(
                emergency_type="CARDIAC_ARREST", urgency_level="CRITICAL",
                specialist_needed="cardiologist", key_requirements=["icu", "generator"],
                summary="Critical cardiac emergency.",
            )

    def test_rank_uses_score_then_documented_stable_tie_breakers(self):
        first = hospital(1, available_icu=5, available_beds=30)
        second = hospital(2, available_icu=5, available_beds=30)
        ranked = self.policy.rank(
            [second, first], self.cardiac,
            {1: {"eta_minutes": 10, "distance_km": 1}, 2: {"eta_minutes": 10, "distance_km": 1}},
        )
        self.assertEqual([row["id"] for row in ranked], [1, 2])

    def test_no_eligible_hospital_is_explicit_failure(self):
        with self.assertRaises(NoEligibleHospitalError) as context:
            self.policy.rank([hospital(1, available_beds=0)], self.cardiac, {1: {"eta_minutes": 10}})
        self.assertEqual(context.exception.exclusions[1], ["NO_AVAILABLE_BEDS"])

    def test_route_response_remains_frontend_compatible(self):
        os.environ.setdefault("OPENAI_API_KEY", "test-key")
        from models import EmergencyRequest
        from routers import routing

        original = routing.run_triage, routing.get_all_hospitals, routing.get_etas, routing.explain, routing.log_dispatch
        async def fake_triage(*_args):
            return self.cardiac
        try:
            routing.run_triage = fake_triage
            routing.get_all_hospitals = lambda: [hospital(1), hospital(2, available_icu=2)]
            routing.get_etas = lambda *_args: {
                1: {"eta_minutes": 8, "distance_km": 2.1},
                2: {"eta_minutes": 12, "distance_km": 3.2},
            }
            routing.explain = lambda *_args: "Deterministic test explanation."
            routing.log_dispatch = lambda _data: 42
            response = asyncio.run(routing.route_emergency(EmergencyRequest(
                symptoms="No pulse", incident_location="Victoria Island", incident_lat=6.42, incident_lng=3.42,
            )))
        finally:
            routing.run_triage, routing.get_all_hospitals, routing.get_etas, routing.explain, routing.log_dispatch = original
        self.assertEqual(response.dispatch_id, 42)
        self.assertEqual(response.recommended_hospital.id, 1)
        self.assertIn("RoutingPolicy v1", response.codex_scoring_function)
        self.assertIn("contributions", response.recommended_hospital.score_breakdown)


if __name__ == "__main__":
    unittest.main()
