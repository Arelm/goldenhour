import { useState, useEffect } from "react";

const HOSPITALS = [
  { id: 1, name: "Lagos University Teaching Hospital (LUTH)", area: "Surulere", total_beds: 761, icu_beds: 24 },
  { id: 2, name: "Reddington Hospital", area: "Victoria Island", total_beds: 120, icu_beds: 16 },
  { id: 3, name: "Eko Hospital", area: "Ikeja GRA", total_beds: 200, icu_beds: 20 },
  { id: 4, name: "Lagos Island General Hospital", area: "Lagos Island", total_beds: 300, icu_beds: 12 },
  { id: 5, name: "First Cardiology Consultants", area: "Ikoyi", total_beds: 50, icu_beds: 10 },
  { id: 6, name: "St. Nicholas Hospital", area: "Lagos Island", total_beds: 100, icu_beds: 8 },
  { id: 7, name: "Lagoon Hospitals", area: "Apapa", total_beds: 150, icu_beds: 14 },
  { id: 8, name: "LASUTH", area: "Ikeja", total_beds: 500, icu_beds: 30 },
  { id: 9, name: "Gbagada General Hospital", area: "Gbagada", total_beds: 220, icu_beds: 10 },
  { id: 10, name: "Doyen Hospital", area: "Lekki Phase 1", total_beds: 80, icu_beds: 8 },
  { id: 11, name: "Island Hospital", area: "Victoria Island", total_beds: 90, icu_beds: 10 },
  { id: 12, name: "Harvey Road Medical Centre", area: "Yaba", total_beds: 60, icu_beds: 6 },
];

const SHIFTS = ["Morning (6AM–2PM)", "Afternoon (2PM–10PM)", "Night (10PM–6AM)"];

const SPECIALISTS = [
  { key: "has_cardiologist", label: "Cardiologist", icon: "❤️" },
  { key: "has_neurologist", label: "Neurologist", icon: "🧠" },
  { key: "has_trauma_surgeon", label: "Trauma Surgeon", icon: "🔪" },
  { key: "has_general_surgeon", label: "General Surgeon", icon: "⚕️" },
  { key: "has_pediatrician", label: "Pediatrician", icon: "👶" },
];

const getCurrentShift = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 14) return SHIFTS[0];
  if (hour >= 14 && hour < 22) return SHIFTS[1];
  return SHIFTS[2];
};

const getTimeString = () => {
  return new Date().toLocaleString("en-NG", {
    hour: "2-digit", minute: "2-digit",
    day: "numeric", month: "short", year: "numeric"
  });
};

// Simulated update history
const MOCK_HISTORY = [
  { shift: "Morning (6AM–2PM)", admin: "A. Okonkwo", time: "06:14 AM, 17 Jul", available_beds: 38, available_icu: 4, generator: true },
  { shift: "Night (10PM–6AM)", admin: "B. Adeyemi", time: "10:08 PM, 16 Jul", available_beds: 51, available_icu: 6, generator: true },
  { shift: "Afternoon (2PM–10PM)", admin: "C. Nwosu", time: "02:11 PM, 16 Jul", available_beds: 44, available_icu: 3, generator: false },
];

const API_BASE = import.meta?.env?.VITE_API_URL || "https://goldenhour-production-e154.up.railway.app";

export default function AdminDashboard() {
  const [screen, setScreen] = useState("login"); // login | dashboard | success
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [shift, setShift] = useState(getCurrentShift());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState(MOCK_HISTORY);
  const [showHistory, setShowHistory] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    available_beds: "",
    available_icu: "",
    has_cardiologist: false,
    has_neurologist: false,
    has_trauma_surgeon: false,
    has_general_surgeon: false,
    has_pediatrician: false,
    generator_status: true,
    capacity_note: "",
  });

  const handleLogin = () => {
    if (!selectedHospital || !adminName.trim()) return;
    setScreen("dashboard");
  };

  const validate = () => {
    const e = {};
    const hospital = HOSPITALS.find(h => h.id === selectedHospital);
    if (!form.available_beds && form.available_beds !== 0) {
      e.available_beds = "Required";
    } else if (parseInt(form.available_beds) > hospital.total_beds) {
      e.available_beds = `Cannot exceed ${hospital.total_beds} total beds`;
    } else if (parseInt(form.available_beds) < 0) {
      e.available_beds = "Cannot be negative";
    }
    if (!form.available_icu && form.available_icu !== 0) {
      e.available_icu = "Required";
    } else if (parseInt(form.available_icu) > hospital.icu_beds) {
      e.available_icu = `Cannot exceed ${hospital.icu_beds} ICU beds`;
    } else if (parseInt(form.available_icu) < 0) {
      e.available_icu = "Cannot be negative";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      available_beds: parseInt(form.available_beds),
      available_icu: parseInt(form.available_icu),
      has_cardiologist: form.has_cardiologist,
      has_neurologist: form.has_neurologist,
      has_trauma_surgeon: form.has_trauma_surgeon,
      generator_status: form.generator_status,
      capacity_note: form.capacity_note || `Updated by ${adminName} — ${shift}`,
    };

    try {
      await fetch(`${API_BASE}/hospitals/${selectedHospital}/capacity`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      // API not available in demo — continue with UI update
    }

    // Add to history
    const newEntry = {
      shift,
      admin: adminName,
      time: getTimeString(),
      available_beds: parseInt(form.available_beds),
      available_icu: parseInt(form.available_icu),
      generator: form.generator_status,
    };

    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setHistory([newEntry, ...history]);
      setScreen("success");
    }, 1200);
  };

  const hospital = HOSPITALS.find(h => h.id === selectedHospital);

  const capacityPercent = hospital && form.available_beds !== ""
    ? Math.round((parseInt(form.available_beds) / hospital.total_beds) * 100)
    : null;

  const icuPercent = hospital && form.available_icu !== ""
    ? Math.round((parseInt(form.available_icu) / hospital.icu_beds) * 100)
    : null;

  const getCapacityColor = (pct) => {
    if (pct === null) return "#475569";
    if (pct > 30) return "#22c55e";
    if (pct > 10) return "#eab308";
    return "#ef4444";
  };

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, sans-serif",
      background: "#f0f4f8",
      minHeight: "100vh",
      color: "#1e293b",
    }}>
      {/* Header */}
      <div style={{
        background: "#0a1628",
        padding: "0 24px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "3px solid #ef4444",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            background: "#ef4444",
            borderRadius: 6,
            width: 30,
            height: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}>🚑</div>
          <div>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>GoldenHour</span>
            <span style={{ color: "#64748b", fontSize: 12, marginLeft: 8 }}>Hospital Admin Portal</span>
          </div>
        </div>
        {screen !== "login" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{adminName}</div>
              <div style={{ color: "#64748b", fontSize: 10 }}>{hospital?.name}</div>
            </div>
            <button onClick={() => { setScreen("login"); setSaved(false); setForm({ available_beds: "", available_icu: "", has_cardiologist: false, has_neurologist: false, has_trauma_surgeon: false, has_general_surgeon: false, has_pediatrician: false, generator_status: true, capacity_note: "" }); setErrors({}); }} style={{
              background: "transparent",
              border: "1px solid #334155",
              borderRadius: 6,
              color: "#64748b",
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: 11,
            }}>Sign Out</button>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 24px" }}>

        {/* LOGIN SCREEN */}
        {screen === "login" && (
          <div>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, letterSpacing: "1px", marginBottom: 8 }}>
                SHIFT CAPACITY UPDATE
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0a1628", lineHeight: 1.2 }}>
                Update your hospital's<br />live capacity status
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>
                Takes 60 seconds. Helps route the right patient to you.
              </div>
            </div>

            <div style={{
              background: "#fff",
              borderRadius: 16,
              padding: 28,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 4px 20px rgba(0,0,0,0.05)",
              border: "1px solid #e2e8f0",
            }}>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: "#475569", fontWeight: 600, display: "block", marginBottom: 6 }}>
                  YOUR HOSPITAL
                </label>
                <select
                  value={selectedHospital || ""}
                  onChange={e => setSelectedHospital(parseInt(e.target.value))}
                  style={{
                    width: "100%",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    color: selectedHospital ? "#1e293b" : "#94a3b8",
                    padding: "12px 14px",
                    fontSize: 14,
                    outline: "none",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">Select your hospital...</option>
                  {HOSPITALS.map(h => (
                    <option key={h.id} value={h.id}>{h.name} — {h.area}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: "#475569", fontWeight: 600, display: "block", marginBottom: 6 }}>
                  YOUR NAME
                </label>
                <input
                  value={adminName}
                  onChange={e => setAdminName(e.target.value)}
                  placeholder="e.g. Adaeze Okonkwo"
                  style={{
                    width: "100%",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    color: "#1e293b",
                    padding: "12px 14px",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, color: "#475569", fontWeight: 600, display: "block", marginBottom: 6 }}>
                  CURRENT SHIFT
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {SHIFTS.map(s => (
                    <button key={s} onClick={() => setShift(s)} style={{
                      background: shift === s ? "#0a1628" : "#f8fafc",
                      border: `1px solid ${shift === s ? "#0a1628" : "#e2e8f0"}`,
                      borderRadius: 8,
                      color: shift === s ? "#fff" : "#64748b",
                      padding: "10px 8px",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 600,
                      lineHeight: 1.3,
                      transition: "all 0.15s",
                    }}>{s}</button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleLogin}
                disabled={!selectedHospital || !adminName.trim()}
                style={{
                  width: "100%",
                  background: !selectedHospital || !adminName.trim()
                    ? "#e2e8f0"
                    : "#ef4444",
                  border: "none",
                  borderRadius: 10,
                  color: !selectedHospital || !adminName.trim() ? "#94a3b8" : "#fff",
                  padding: "14px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: !selectedHospital || !adminName.trim() ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  letterSpacing: "0.3px",
                }}
              >
                Start Capacity Update →
              </button>
            </div>

            {/* Info footer */}
            <div style={{
              marginTop: 20,
              padding: "14px 18px",
              background: "#fff",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}>
              <span style={{ fontSize: 16 }}>ℹ️</span>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
                Your update goes live instantly and helps GoldenHour route the right emergencies to your hospital.
                Please update at the start of each shift and whenever capacity changes significantly.
              </div>
            </div>
          </div>
        )}

        {/* DASHBOARD SCREEN */}
        {screen === "dashboard" && hospital && (
          <div>
            {/* Hospital header */}
            <div style={{
              background: "#0a1628",
              borderRadius: 12,
              padding: "16px 20px",
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{hospital.name}</div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
                  📍 {hospital.area} &nbsp;·&nbsp; {shift}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#64748b", fontSize: 10, letterSpacing: "1px" }}>TOTAL CAPACITY</div>
                <div style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>
                  {hospital.total_beds} beds · {hospital.icu_beds} ICU
                </div>
              </div>
            </div>

            {/* Main form card */}
            <div style={{
              background: "#fff",
              borderRadius: 16,
              padding: 28,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              border: "1px solid #e2e8f0",
              marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, letterSpacing: "1px", marginBottom: 20 }}>
                CURRENT AVAILABILITY
              </div>

              {/* Beds & ICU */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#475569", fontWeight: 600, display: "block", marginBottom: 6 }}>
                    AVAILABLE BEDS
                    <span style={{ color: "#94a3b8", fontWeight: 400 }}> / {hospital.total_beds} total</span>
                  </label>
                  <input
                    type="number"
                    value={form.available_beds}
                    onChange={e => { setForm({ ...form, available_beds: e.target.value }); setErrors({ ...errors, available_beds: null }); }}
                    placeholder="0"
                    min="0"
                    max={hospital.total_beds}
                    style={{
                      width: "100%",
                      background: errors.available_beds ? "#fff5f5" : "#f8fafc",
                      border: `2px solid ${errors.available_beds ? "#ef4444" : capacityPercent !== null ? getCapacityColor(capacityPercent) + "40" : "#e2e8f0"}`,
                      borderRadius: 8,
                      color: "#1e293b",
                      padding: "12px 14px",
                      fontSize: 22,
                      fontWeight: 700,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  {errors.available_beds && (
                    <div style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>⚠ {errors.available_beds}</div>
                  )}
                  {capacityPercent !== null && !errors.available_beds && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${capacityPercent}%`,
                          background: getCapacityColor(capacityPercent),
                          borderRadius: 2,
                          transition: "width 0.3s, background 0.3s",
                        }} />
                      </div>
                      <div style={{ fontSize: 11, color: getCapacityColor(capacityPercent), marginTop: 3, fontWeight: 600 }}>
                        {capacityPercent}% capacity available
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 12, color: "#475569", fontWeight: 600, display: "block", marginBottom: 6 }}>
                    AVAILABLE ICU BEDS
                    <span style={{ color: "#94a3b8", fontWeight: 400 }}> / {hospital.icu_beds} total</span>
                  </label>
                  <input
                    type="number"
                    value={form.available_icu}
                    onChange={e => { setForm({ ...form, available_icu: e.target.value }); setErrors({ ...errors, available_icu: null }); }}
                    placeholder="0"
                    min="0"
                    max={hospital.icu_beds}
                    style={{
                      width: "100%",
                      background: errors.available_icu ? "#fff5f5" : "#f8fafc",
                      border: `2px solid ${errors.available_icu ? "#ef4444" : icuPercent !== null ? getCapacityColor(icuPercent) + "40" : "#e2e8f0"}`,
                      borderRadius: 8,
                      color: "#1e293b",
                      padding: "12px 14px",
                      fontSize: 22,
                      fontWeight: 700,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                  {errors.available_icu && (
                    <div style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>⚠ {errors.available_icu}</div>
                  )}
                  {icuPercent !== null && !errors.available_icu && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${icuPercent}%`,
                          background: getCapacityColor(icuPercent),
                          borderRadius: 2,
                          transition: "width 0.3s",
                        }} />
                      </div>
                      <div style={{ fontSize: 11, color: getCapacityColor(icuPercent), marginTop: 3, fontWeight: 600 }}>
                        {icuPercent}% ICU capacity available
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Specialists on duty */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, color: "#475569", fontWeight: 600, display: "block", marginBottom: 10 }}>
                  SPECIALISTS ON DUTY THIS SHIFT
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {SPECIALISTS.map(spec => (
                    <button
                      key={spec.key}
                      onClick={() => setForm({ ...form, [spec.key]: !form[spec.key] })}
                      style={{
                        background: form[spec.key] ? "#f0fdf4" : "#f8fafc",
                        border: `1.5px solid ${form[spec.key] ? "#22c55e" : "#e2e8f0"}`,
                        borderRadius: 8,
                        padding: "10px 14px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        transition: "all 0.15s",
                        textAlign: "left",
                      }}
                    >
                      <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: form[spec.key] ? "#22c55e" : "#e2e8f0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        flexShrink: 0,
                        transition: "all 0.15s",
                      }}>
                        {form[spec.key] ? "✓" : ""}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: form[spec.key] ? "#166534" : "#64748b" }}>
                        {spec.icon} {spec.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generator Status */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, color: "#475569", fontWeight: 600, display: "block", marginBottom: 10 }}>
                  POWER / GENERATOR STATUS
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { value: true, label: "Generator Online", icon: "⚡", color: "#22c55e", bg: "#f0fdf4" },
                    { value: false, label: "On EKEDC Supply Only", icon: "⚠️", color: "#ef4444", bg: "#fff5f5" },
                  ].map(opt => (
                    <button
                      key={String(opt.value)}
                      onClick={() => setForm({ ...form, generator_status: opt.value })}
                      style={{
                        background: form.generator_status === opt.value ? opt.bg : "#f8fafc",
                        border: `1.5px solid ${form.generator_status === opt.value ? opt.color : "#e2e8f0"}`,
                        borderRadius: 8,
                        padding: "12px 14px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{opt.icon}</span>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: form.generator_status === opt.value ? opt.color : "#94a3b8",
                      }}>{opt.label}</span>
                    </button>
                  ))}
                </div>
                {!form.generator_status && (
                  <div style={{
                    marginTop: 8,
                    padding: "8px 12px",
                    background: "#fff5f5",
                    borderRadius: 6,
                    border: "1px solid #fecaca",
                    fontSize: 11,
                    color: "#dc2626",
                  }}>
                    ⚠️ GoldenHour will deprioritise routing critical cases to your facility until generator is restored.
                  </div>
                )}
              </div>

              {/* Notes */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, color: "#475569", fontWeight: 600, display: "block", marginBottom: 6 }}>
                  SHIFT NOTE <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  value={form.capacity_note}
                  onChange={e => setForm({ ...form, capacity_note: e.target.value })}
                  placeholder="e.g. Cardiac theatre booked until 4PM. Trauma team returning from external call..."
                  rows={2}
                  style={{
                    width: "100%",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    color: "#1e293b",
                    padding: "10px 12px",
                    fontSize: 13,
                    outline: "none",
                    resize: "vertical",
                    fontFamily: "inherit",
                    boxSizing: "border-box",
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  width: "100%",
                  background: saving
                    ? "#94a3b8"
                    : "linear-gradient(135deg, #ef4444, #dc2626)",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  padding: "15px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  boxShadow: saving ? "none" : "0 4px 15px rgba(239,68,68,0.3)",
                  transition: "all 0.2s",
                  letterSpacing: "0.3px",
                }}
              >
                {saving ? "Saving..." : "✓ Save & Go Live"}
              </button>
            </div>

            {/* Update history */}
            <div style={{
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}>
              <button
                onClick={() => setShowHistory(!showHistory)}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  padding: "14px 20px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: "#475569",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "1px",
                }}
              >
                <span>📋 RECENT SHIFT UPDATES</span>
                <span style={{ color: "#94a3b8" }}>{showHistory ? "▲" : "▼"}</span>
              </button>

              {showHistory && (
                <div style={{ borderTop: "1px solid #f1f5f9" }}>
                  {history.map((entry, i) => (
                    <div key={i} style={{
                      padding: "12px 20px",
                      borderBottom: i < history.length - 1 ? "1px solid #f1f5f9" : "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>
                          {entry.shift.split(" ")[0]} shift — {entry.admin}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{entry.time}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
                          {entry.available_beds} beds · {entry.available_icu} ICU
                        </div>
                        <div style={{
                          fontSize: 10,
                          color: entry.generator ? "#22c55e" : "#ef4444",
                          fontWeight: 600,
                        }}>
                          {entry.generator ? "⚡ Generator Online" : "⚠️ No Generator"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SUCCESS SCREEN */}
        {screen === "success" && (
          <div style={{ textAlign: "center" }}>
            <div style={{
              background: "#fff",
              borderRadius: 16,
              padding: 40,
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              border: "1px solid #e2e8f0",
              marginBottom: 16,
            }}>
              <div style={{
                width: 64,
                height: 64,
                background: "#f0fdf4",
                border: "2px solid #22c55e",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 28,
                margin: "0 auto 20px",
              }}>✓</div>

              <div style={{ fontSize: 22, fontWeight: 800, color: "#0a1628", marginBottom: 8 }}>
                Capacity Updated
              </div>
              <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24, lineHeight: 1.6 }}>
                {hospital?.name} is now live on GoldenHour.<br />
                Emergency routing will reflect your current capacity immediately.
              </div>

              {/* Summary */}
              <div style={{
                background: "#f8fafc",
                borderRadius: 10,
                padding: 16,
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
                marginBottom: 24,
                border: "1px solid #e2e8f0",
              }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: getCapacityColor(Math.round((parseInt(form.available_beds) / hospital.total_beds) * 100)) }}>
                    {form.available_beds}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>BEDS AVAILABLE</div>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: getCapacityColor(Math.round((parseInt(form.available_icu) / hospital.icu_beds) * 100)) }}>
                    {form.available_icu}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>ICU AVAILABLE</div>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: form.generator_status ? "#22c55e" : "#ef4444" }}>
                    {form.generator_status ? "ON" : "OFF"}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>GENERATOR</div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 24 }}>
                Updated by {adminName} · {getTimeString()}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={() => {
                  setForm({ available_beds: "", available_icu: "", has_cardiologist: false, has_neurologist: false, has_trauma_surgeon: false, has_general_surgeon: false, has_pediatrician: false, generator_status: true, capacity_note: "" });
                  setSaved(false);
                  setErrors({});
                  setScreen("dashboard");
                }} style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  color: "#475569",
                  padding: "12px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                  Update Again
                </button>
                <button onClick={() => { setScreen("login"); setSelectedHospital(null); setAdminName(""); setSaved(false); setErrors({}); setForm({ available_beds: "", available_icu: "", has_cardiologist: false, has_neurologist: false, has_trauma_surgeon: false, has_general_surgeon: false, has_pediatrician: false, generator_status: true, capacity_note: "" }); }} style={{
                  background: "#0a1628",
                  border: "none",
                  borderRadius: 8,
                  color: "#fff",
                  padding: "12px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                  Sign Out
                </button>
              </div>
            </div>

            <div style={{
              padding: "14px 18px",
              background: "#fff",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <span>⏰</span>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6 }}>
                Next update due at shift changeover. GoldenHour will send a WhatsApp reminder 30 minutes before your shift ends.
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing: border-box; }
        select { -webkit-appearance: none; }
        input[type=number]::-webkit-inner-spin-button { opacity: 1; }
        textarea:focus, input:focus, select:focus {
          border-color: #ef4444 !important;
          box-shadow: 0 0 0 3px rgba(239,68,68,0.1);
        }
      `}</style>
    </div>
  );
}
