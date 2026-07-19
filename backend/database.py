import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "goldenhour.db"

LAGOS_HOSPITALS = [
    {"id":1,"name":"Lagos University Teaching Hospital (LUTH)","short_name":"LUTH","area":"Idi-Araba, Surulere","lat":6.5155,"lng":3.3669,"total_beds":761,"available_beds":42,"icu_beds":24,"available_icu":3,"has_cardiologist":1,"has_neurologist":1,"has_trauma_surgeon":1,"has_general_surgeon":1,"has_pediatrician":1,"generator_status":1,"blood_bank":1,"cath_lab":1,"ct_scanner":1,"phone":"+234-1-7919100","capacity_note":"ICU near capacity"},
    {"id":2,"name":"Reddington Hospital","short_name":"Reddington","area":"Victoria Island","lat":6.4298,"lng":3.4203,"total_beds":120,"available_beds":31,"icu_beds":16,"available_icu":7,"has_cardiologist":1,"has_neurologist":1,"has_trauma_surgeon":1,"has_general_surgeon":1,"has_pediatrician":0,"generator_status":1,"blood_bank":1,"cath_lab":1,"ct_scanner":1,"phone":"+234-1-4618034","capacity_note":"Full cardiac team on duty"},
    {"id":3,"name":"Eko Hospital","short_name":"Eko Hospital","area":"Ikeja GRA","lat":6.5901,"lng":3.3471,"total_beds":200,"available_beds":58,"icu_beds":20,"available_icu":9,"has_cardiologist":1,"has_neurologist":1,"has_trauma_surgeon":0,"has_general_surgeon":1,"has_pediatrician":1,"generator_status":1,"blood_bank":1,"cath_lab":0,"ct_scanner":1,"phone":"+234-1-4936842","capacity_note":"Good capacity"},
    {"id":4,"name":"Lagos Island General Hospital","short_name":"Lagos Island General","area":"Lagos Island","lat":6.4510,"lng":3.3950,"total_beds":300,"available_beds":67,"icu_beds":12,"available_icu":1,"has_cardiologist":0,"has_neurologist":0,"has_trauma_surgeon":1,"has_general_surgeon":1,"has_pediatrician":1,"generator_status":0,"blood_bank":1,"cath_lab":0,"ct_scanner":0,"phone":"+234-1-2630315","capacity_note":"Generator down"},
    {"id":5,"name":"First Cardiology Consultants","short_name":"First Cardiology","area":"Ikoyi","lat":6.4572,"lng":3.4333,"total_beds":50,"available_beds":18,"icu_beds":10,"available_icu":5,"has_cardiologist":1,"has_neurologist":0,"has_trauma_surgeon":0,"has_general_surgeon":0,"has_pediatrician":0,"generator_status":1,"blood_bank":0,"cath_lab":1,"ct_scanner":1,"phone":"+234-1-2690762","capacity_note":"Cardiac ICU available"},
    {"id":6,"name":"St. Nicholas Hospital","short_name":"St. Nicholas","area":"Lagos Island","lat":6.4557,"lng":3.3894,"total_beds":100,"available_beds":22,"icu_beds":8,"available_icu":2,"has_cardiologist":1,"has_neurologist":1,"has_trauma_surgeon":0,"has_general_surgeon":1,"has_pediatrician":1,"generator_status":1,"blood_bank":1,"cath_lab":0,"ct_scanner":1,"phone":"+234-1-2663576","capacity_note":"Limited ICU"},
    {"id":7,"name":"Lagoon Hospitals","short_name":"Lagoon Hospital","area":"Apapa","lat":6.4488,"lng":3.3586,"total_beds":150,"available_beds":45,"icu_beds":14,"available_icu":6,"has_cardiologist":1,"has_neurologist":1,"has_trauma_surgeon":1,"has_general_surgeon":1,"has_pediatrician":1,"generator_status":1,"blood_bank":1,"cath_lab":0,"ct_scanner":1,"phone":"+234-1-5806000","capacity_note":"Full team available"},
    {"id":8,"name":"LASUTH","short_name":"LASUTH","area":"Ikeja","lat":6.5883,"lng":3.3373,"total_beds":500,"available_beds":89,"icu_beds":30,"available_icu":11,"has_cardiologist":1,"has_neurologist":1,"has_trauma_surgeon":1,"has_general_surgeon":1,"has_pediatrician":1,"generator_status":1,"blood_bank":1,"cath_lab":0,"ct_scanner":1,"phone":"+234-1-4934212","capacity_note":"Good ICU availability"},
    {"id":9,"name":"Gbagada General Hospital","short_name":"Gbagada General","area":"Gbagada","lat":6.5502,"lng":3.3783,"total_beds":220,"available_beds":54,"icu_beds":10,"available_icu":4,"has_cardiologist":0,"has_neurologist":0,"has_trauma_surgeon":1,"has_general_surgeon":1,"has_pediatrician":1,"generator_status":1,"blood_bank":1,"cath_lab":0,"ct_scanner":0,"phone":"+234-1-7748900","capacity_note":"No specialist cardiac team"},
    {"id":10,"name":"Doyen Hospital","short_name":"Doyen Hospital","area":"Lekki Phase 1","lat":6.4375,"lng":3.5000,"total_beds":80,"available_beds":29,"icu_beds":8,"available_icu":4,"has_cardiologist":1,"has_neurologist":0,"has_trauma_surgeon":0,"has_general_surgeon":1,"has_pediatrician":1,"generator_status":1,"blood_bank":0,"cath_lab":0,"ct_scanner":1,"phone":"+234-1-4533060","capacity_note":"Good for Lekki emergencies"},
    {"id":11,"name":"Island Hospital","short_name":"Island Hospital","area":"Victoria Island","lat":6.4352,"lng":3.4198,"total_beds":90,"available_beds":24,"icu_beds":10,"available_icu":3,"has_cardiologist":1,"has_neurologist":1,"has_trauma_surgeon":0,"has_general_surgeon":1,"has_pediatrician":0,"generator_status":1,"blood_bank":1,"cath_lab":0,"ct_scanner":1,"phone":"+234-1-4617100","capacity_note":"VI location"},
    {"id":12,"name":"Harvey Road Medical Centre","short_name":"Harvey Road Medical","area":"Yaba","lat":6.5038,"lng":3.3745,"total_beds":60,"available_beds":19,"icu_beds":6,"available_icu":2,"has_cardiologist":0,"has_neurologist":0,"has_trauma_surgeon":1,"has_general_surgeon":1,"has_pediatrician":1,"generator_status":0,"blood_bank":0,"cath_lab":0,"ct_scanner":0,"phone":"+234-1-7748801","capacity_note":"Basic emergency care only"},
]

CREATE_HOSPITALS = """
CREATE TABLE IF NOT EXISTS hospitals (
    id INTEGER PRIMARY KEY,
    name TEXT,
    short_name TEXT,
    area TEXT,
    lat REAL,
    lng REAL,
    total_beds INTEGER,
    available_beds INTEGER,
    icu_beds INTEGER,
    available_icu INTEGER,
    has_cardiologist INTEGER,
    has_neurologist INTEGER,
    has_trauma_surgeon INTEGER,
    has_general_surgeon INTEGER,
    has_pediatrician INTEGER,
    generator_status INTEGER,
    blood_bank INTEGER,
    cath_lab INTEGER,
    ct_scanner INTEGER,
    phone TEXT,
    capacity_note TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

CREATE_DISPATCH_LOG = """
CREATE TABLE IF NOT EXISTS dispatch_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    emergency_type TEXT,
    incident_location TEXT,
    symptoms TEXT,
    recommended_hospital_id INTEGER,
    recommended_hospital_name TEXT,
    triage_output TEXT,
    routing_explanation TEXT,
    dispatcher_override INTEGER,
    override_hospital_id INTEGER,
    override_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

INSERT_HOSPITAL = """
INSERT OR IGNORE INTO hospitals (
    id, name, short_name, area, lat, lng,
    total_beds, available_beds, icu_beds, available_icu,
    has_cardiologist, has_neurologist, has_trauma_surgeon,
    has_general_surgeon, has_pediatrician, generator_status,
    blood_bank, cath_lab, ct_scanner, phone, capacity_note
) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
"""


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    c = conn.cursor()
    c.execute(CREATE_HOSPITALS)
    c.execute(CREATE_DISPATCH_LOG)
    for h in LAGOS_HOSPITALS:
        c.execute(INSERT_HOSPITAL, (
            h["id"], h["name"], h["short_name"], h["area"],
            h["lat"], h["lng"], h["total_beds"], h["available_beds"],
            h["icu_beds"], h["available_icu"], h["has_cardiologist"],
            h["has_neurologist"], h["has_trauma_surgeon"], h["has_general_surgeon"],
            h["has_pediatrician"], h["generator_status"], h["blood_bank"],
            h["cath_lab"], h["ct_scanner"], h["phone"], h["capacity_note"]
        ))
    conn.commit()
    conn.close()
    print("GoldenHour DB initialized — 12 Lagos hospitals loaded")


def get_all_hospitals():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM hospitals ORDER BY id").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_hospital_by_id(hid):
    conn = get_connection()
    row = conn.execute("SELECT * FROM hospitals WHERE id=?", (hid,)).fetchone()
    conn.close()
    return dict(row) if row else None


def update_hospital_capacity(hid, updates):
    allowed = [
        "available_beds", "available_icu", "has_cardiologist",
        "has_neurologist", "has_trauma_surgeon", "has_general_surgeon",
        "has_pediatrician", "generator_status", "capacity_note"
    ]
    conn = get_connection()
    sets, vals = [], []
    for k, v in updates.items():
        if k in allowed:
            sets.append(k + "=?")
            vals.append(v)
    if sets:
        sets.append("last_updated=CURRENT_TIMESTAMP")
        vals.append(hid)
        conn.execute("UPDATE hospitals SET " + ",".join(sets) + " WHERE id=?", vals)
        conn.commit()
    conn.close()


def log_dispatch(data):
    conn = get_connection()
    c = conn.cursor()
    c.execute(
        "INSERT INTO dispatch_log (emergency_type,incident_location,symptoms,"
        "recommended_hospital_id,recommended_hospital_name,triage_output,routing_explanation) "
        "VALUES (?,?,?,?,?,?,?)",
        (
            data.get("emergency_type"), data.get("incident_location"),
            data.get("symptoms"), data.get("recommended_hospital_id"),
            data.get("recommended_hospital_name"), data.get("triage_output"),
            data.get("routing_explanation")
        )
    )
    did = c.lastrowid
    conn.commit()
    conn.close()
    return did


def log_override(dispatch_id, override_hospital_id, reason):
    conn = get_connection()
    conn.execute(
        "UPDATE dispatch_log SET dispatcher_override=1, "
        "override_hospital_id=?, override_reason=? WHERE id=?",
        (override_hospital_id, reason, dispatch_id)
    )
    conn.commit()
    conn.close()
