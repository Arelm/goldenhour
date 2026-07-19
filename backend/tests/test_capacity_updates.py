import asyncio
import os
import unittest
from pathlib import Path

import database
from fastapi import HTTPException
from models import CapacityUpdate
from routers import hospitals


class CapacityUpdateTests(unittest.TestCase):
    def setUp(self):
        self.original_db_path = database.DB_PATH
        self.test_db = Path(__file__).parent / ".test_capacity_updates.db"
        if self.test_db.exists():
            self.test_db.unlink()
        database.DB_PATH = self.test_db
        database.init_db()
        self.original_api_key = os.environ.get("HOSPITAL_CAPACITY_API_KEY")
        os.environ["HOSPITAL_CAPACITY_API_KEY"] = "capacity-test-key"

    def tearDown(self):
        database.DB_PATH = self.original_db_path
        if self.original_api_key is None:
            os.environ.pop("HOSPITAL_CAPACITY_API_KEY", None)
        else:
            os.environ["HOSPITAL_CAPACITY_API_KEY"] = self.original_api_key
        if self.test_db.exists():
            self.test_db.unlink()

    def test_new_field_names_update_routing_columns(self):
        update = CapacityUpdate(
            general_beds=12,
            icu_beds=3,
            generator_online=False,
            has_cardiologist=False,
            has_general_surgeon=True,
            has_pediatrician=True,
        )
        response = asyncio.run(hospitals.update_capacity(1, update, "capacity-test-key"))
        saved = database.get_hospital_by_id(1)
        self.assertEqual(response["updates"]["available_beds"], 12)
        self.assertEqual(saved["available_beds"], 12)
        self.assertEqual(saved["available_icu"], 3)
        self.assertEqual(saved["generator_status"], 0)
        self.assertEqual(saved["has_cardiologist"], 0)
        self.assertEqual(saved["has_general_surgeon"], 1)
        self.assertEqual(saved["has_pediatrician"], 1)

    def test_legacy_admin_fields_remain_supported(self):
        update = CapacityUpdate(available_beds=11, available_icu=2, generator_status=True)
        asyncio.run(hospitals.update_capacity(1, update, "capacity-test-key"))
        saved = database.get_hospital_by_id(1)
        self.assertEqual(saved["available_beds"], 11)
        self.assertEqual(saved["available_icu"], 2)

    def test_rejects_bad_key_and_invalid_capacity(self):
        with self.assertRaises(HTTPException) as auth_error:
            asyncio.run(hospitals.update_capacity(1, CapacityUpdate(general_beds=5), "wrong-key"))
        self.assertEqual(auth_error.exception.status_code, 401)

        with self.assertRaises(HTTPException) as capacity_error:
            asyncio.run(hospitals.update_capacity(1, CapacityUpdate(general_beds=999), "capacity-test-key"))
        self.assertEqual(capacity_error.exception.status_code, 422)

    def test_rejects_conflicting_aliases(self):
        with self.assertRaises(ValueError):
            CapacityUpdate(general_beds=5, available_beds=6)


if __name__ == "__main__":
    unittest.main()
