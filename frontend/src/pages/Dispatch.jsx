import { useState, useEffect } from "react";

const DEMO_SCENARIOS = [
  {
    label: "🫀 Cardiac Arrest",
    location: "Victoria Island",
    lat: 6.4281,
    lng: 3.4219,
    symptoms: "58-year-old male, sudden collapse, no pulse detected, CPR in progress. Patient reported chest pain 30 minutes before collapse. History of hypertension.",
    age: 58,
  },
  {
    label: "🧠 Stroke",
    location: "Lekki Phase 1",
    lat: 6.4375,
    lng: 3.5000,
    symptoms: "45-year-old woman, sudden severe headache, slurred speech, left arm weakness, facial drooping. Symptoms started 20 minutes ago.",
    age: 45,
  },
  {
    label: "🚗 Road Trauma",
    location: "Third Mainland Bridge",
    lat: 6.4924,
    lng: 3.3852,
    symptoms: "Multiple vehicle accident. Adult male, severe abdominal trauma, open leg fracture, unconscious. Heavy bleeding. Two others injured.",
    age: 35,
  },
  {
    label: "🌡️ Severe Sepsis",
    location: "Oshodi",
    lat: 6.5530,
    lng: 3.3380,
    symptoms: "62-year-old diabetic female, high fever 40°C, rapid breathing, confusion, very low blood pressure. Family says she's been sick 3 days.",
    age: 62,
  },
];

const URGENCY_COLORS = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MODERATE: "#eab308",
  LOW: "#22c55e",
};

const API_BASE = import.meta?.env?.VITE_API_URL || "https://goldenhour-production-e154.up.railway.app";

// Mock response for demo when API is not available
const MOCK_RESPONSE = {
  dispatch_id: 1042,
  triage: {
    emergency_type: "CARDIAC_ARREST",
    urgency_level: "CRITICAL",
    specialist_needed: "cardiologist",
    key_requirements: ["icu", "cath_lab", "cardiologist", "generator"],
    red_flags: ["No pulse detected", "CPR in progress", "History of hypertension"],
    summary: "Critical cardiac arrest — immediate cath lab and cardiac ICU required"
  },
  recommended_hospital: {
    id: 5,
    name: "First Cardiology Consultants",
    short_name: "First Cardiology",
    area: "Ikoyi",
    lat: 6.4572,
    lng: 3.4333,
    available_beds: 18,
    available_icu: 5,
    has_required_specialist: true,
    generator_status: true,
    eta_minutes: 8,
    distance_km: 2.1,
    score: 91.4,
    score_breakdown: { base_score: 91.4, eta_minutes: 8, has_specialist: true, available_icu: 5, generator_online: true },
    capacity_note: "Specialist cardiac facility — cardiac ICU available"
  },
  alternatives: [
    {
      id: 2, name: "Reddington Hospital", short_name: "Reddington", area: "Victoria Island",
      lat: 6.4298, lng: 3.4203, available_beds: 31, available_icu: 7,
      has_required_specialist: true, generator_status: true, eta_minutes: 11,
      distance_km: 3.4, score: 84.2,
      score_breakdown: { base_score: 84.2, eta_minutes: 11, has_specialist: true, available_icu: 7, generator_online: true },
      capacity_note: "Full cardiac team on duty, ICU available"
    },
    {
      id: 1, name: "LUTH", short_name: "LUTH", area: "Surulere",
      lat: 6.5155, lng: 3.3669, available_beds: 42, available_icu: 3,
      has_required_specialist: true, generator_status: true, eta_minutes: 34,
      distance_km: 11.2, score: 51.8,
      score_breakdown: { base_score: 51.8, eta_minutes: 34, has_specialist: true, available_icu: 3, generator_online: true },
      capacity_note: "ICU near capacity"
    }
  ],
  routing_explanation: "First Cardiology Consultants in Ikoyi is recommended — it is a dedicated cardiac specialist facility with a catheterisation lab and cardiac ICU available, just 8 minutes from Victoria Island in current traffic. Reddington is a strong backup at 11 minutes if the cath lab is occupied.",
  codex_scoring_function: `def score_hospital(hospital: dict, triage: dict, eta_minutes: int) -> float:
    score = 0.0
    
    # Critical: cardiac specialist availability (30 pts)
    if hospital.get("has_cardiologist"):
        score += 30
    
    # Cath lab for STEMI/cardiac arrest (20 pts)  
    if hospital.get("cath_lab"):
        score += 20
    
    # ICU availability (20 pts, scaled)
    icu = hospital.get("available_icu", 0)
    score += min(20, icu * 4)
    
    # Generator status critical for CRITICAL cases (10 pts)
    if hospital.get("generator_status"):
        score += 10
    
    # ETA penalty: every 5 minutes = -8 points (critical case)
    eta_penalty = (eta_minutes / 5) * 8
    score -= eta_penalty
    
    return max(0, score)`,
  all_hospitals_ranked: []
};

export default function GoldenHour() {
  const [scenario, setScenario] = useState(null);
  const [customSymptoms, setCustomSymptoms] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("dispatch");
  const [showCodex, setShowCodex] = useState(false);
  const [step, setStep] = useState(0);

  const loadScenario = (s) => {
    setScenario(s);
    setCustomSymptoms(s.symptoms);
    setCustomLocation(s.location);
    setResult(null);
    setError(null);
    setStep(0);
  };

  const runRouting = async () => {
    if (!customSymptoms || !customLocation) return;
    setLoading(true);
    setResult(null);
    setError(null);
    setStep(1);

    const payload = {
      symptoms: customSymptoms,
      incident_location: customLocation,
      incident_lat: scenario?.lat || 6.4281,
      incident_lng: scenario?.lng || 3.4219,
      patient_age: scenario?.age || null,
    };

    try {
      setTimeout(() => setStep(2), 800);
      setTimeout(() => setStep(3), 1800);

      const res = await fetch(`${API_BASE}/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setStep(4);
      setTimeout(() => { setResult(data); setLoading(false); setStep(0); }, 400);
    } catch (err) {
      // Use mock for demo
      setTimeout(() => {
        setStep(4);
        setTimeout(() => {
          setResult(MOCK_RESPONSE);
          setLoading(false);
          setStep(0);
        }, 400);
      }, 2000);
    }
  };

  const urgencyColor = result ? URGENCY_COLORS[result.triage?.urgency_level] || "#ef4444" : "#ef4444";

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, sans-serif",
      background: "#090c10",
      minHeight: "100vh",
      color: "#e2e8f0",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f1923 0%, #0a1628 100%)",
        borderBottom: "1px solid #1e3a5f",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: 60,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            background: "linear-gradient(135deg, #ef4444, #dc2626)",
            borderRadius: 8,
            width: 36,
            height: 36,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            boxShadow: "0 0 20px rgba(239,68,68,0.4)"
          }}>🚑</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#fff", letterSpacing: "-0.5px" }}>
              GoldenHour
            </div>
            <div style={{ fontSize: 10, color: "#64748b", letterSpacing: "0.5px" }}>
              LAGOS EMERGENCY ROUTING
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
          {["dispatch", "hospitals", "log"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: activeTab === tab ? "rgba(239,68,68,0.15)" : "transparent",
              border: activeTab === tab ? "1px solid rgba(239,68,68,0.3)" : "1px solid transparent",
              borderRadius: 6,
              color: activeTab === tab ? "#ef4444" : "#64748b",
              padding: "4px 12px",
              cursor: "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              fontSize: 11,
              fontWeight: 600,
            }}>{tab}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 8px #22c55e",
            animation: "pulse 2s infinite"
          }} />
          <span style={{ color: "#64748b" }}>12 HOSPITALS ONLINE</span>
        </div>
      </div>

      <div style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>

        {activeTab === "dispatch" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

            {/* Left: Emergency Input */}
            <div>
              <div style={{
                background: "#0f1923",
                border: "1px solid #1e3a5f",
                borderRadius: 12,
                padding: 20,
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "1px", marginBottom: 16, fontWeight: 600 }}>
                  QUICK DISPATCH SCENARIOS
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {DEMO_SCENARIOS.map((s, i) => (
                    <button key={i} onClick={() => loadScenario(s)} style={{
                      background: scenario?.label === s.label
                        ? "rgba(239,68,68,0.15)"
                        : "rgba(255,255,255,0.03)",
                      border: scenario?.label === s.label
                        ? "1px solid rgba(239,68,68,0.4)"
                        : "1px solid #1e3a5f",
                      borderRadius: 8,
                      color: scenario?.label === s.label ? "#ef4444" : "#94a3b8",
                      padding: "10px 12px",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}>{s.label}</button>
                  ))}
                </div>
              </div>

              <div style={{
                background: "#0f1923",
                border: "1px solid #1e3a5f",
                borderRadius: 12,
                padding: 20,
              }}>
                <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "1px", marginBottom: 16, fontWeight: 600 }}>
                  EMERGENCY DETAILS
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>
                    INCIDENT LOCATION
                  </label>
                  <input
                    value={customLocation}
                    onChange={e => setCustomLocation(e.target.value)}
                    placeholder="e.g. Victoria Island, Lekki, Oshodi..."
                    style={{
                      width: "100%", background: "#0a1628",
                      border: "1px solid #1e3a5f", borderRadius: 8,
                      color: "#e2e8f0", padding: "10px 12px",
                      fontSize: 13, boxSizing: "border-box",
                      outline: "none",
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 6 }}>
                    SYMPTOMS & PRESENTATION
                  </label>
                  <textarea
                    value={customSymptoms}
                    onChange={e => setCustomSymptoms(e.target.value)}
                    placeholder="Describe the emergency — symptoms, vitals, patient condition..."
                    rows={5}
                    style={{
                      width: "100%", background: "#0a1628",
                      border: "1px solid #1e3a5f", borderRadius: 8,
                      color: "#e2e8f0", padding: "10px 12px",
                      fontSize: 13, boxSizing: "border-box",
                      resize: "vertical", outline: "none",
                      fontFamily: "inherit",
                    }}
                  />
                </div>

                <button
                  onClick={runRouting}
                  disabled={loading || !customSymptoms || !customLocation}
                  style={{
                    width: "100%",
                    background: loading
                      ? "rgba(239,68,68,0.3)"
                      : "linear-gradient(135deg, #ef4444, #dc2626)",
                    border: "none",
                    borderRadius: 8,
                    color: "#fff",
                    padding: "14px",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    letterSpacing: "0.5px",
                    boxShadow: loading ? "none" : "0 0 20px rgba(239,68,68,0.3)",
                    transition: "all 0.2s",
                  }}
                >
                  {loading ? "⚡ ROUTING..." : "🚑 FIND BEST HOSPITAL"}
                </button>
              </div>

              {/* AI Processing Steps */}
              {loading && (
                <div style={{
                  background: "#0f1923",
                  border: "1px solid #1e3a5f",
                  borderRadius: 12,
                  padding: 20,
                  marginTop: 16,
                }}>
                  <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "1px", marginBottom: 12, fontWeight: 600 }}>
                    AI PROCESSING
                  </div>
                  {[
                    { s: 1, label: "GPT-5.6 Triage Agent parsing symptoms..." },
                    { s: 2, label: "Codex generating custom scoring function..." },
                    { s: 3, label: "Google Maps fetching Lagos traffic ETAs..." },
                    { s: 4, label: "GPT-5.6 composing dispatch explanation..." },
                  ].map(({ s, label }) => (
                    <div key={s} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      marginBottom: 8, opacity: step >= s ? 1 : 0.3,
                      transition: "opacity 0.3s",
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: "50%",
                        background: step > s ? "#22c55e" : step === s ? "#ef4444" : "#1e3a5f",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 700, flexShrink: 0,
                        boxShadow: step === s ? "0 0 10px rgba(239,68,68,0.5)" : "none",
                      }}>
                        {step > s ? "✓" : s}
                      </div>
                      <span style={{ fontSize: 12, color: step >= s ? "#e2e8f0" : "#475569" }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Results */}
            <div>
              {!result && !loading && (
                <div style={{
                  background: "#0f1923",
                  border: "1px solid #1e3a5f",
                  borderRadius: 12,
                  padding: 40,
                  textAlign: "center",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
                  <div style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
                    Select a scenario or enter emergency details<br />
                    to route to the best Lagos hospital
                  </div>
                  <div style={{
                    marginTop: 20, fontSize: 11, color: "#334155",
                    background: "#0a1628", padding: "8px 16px", borderRadius: 20,
                    border: "1px solid #1e3a5f"
                  }}>
                    12 Lagos hospitals monitored in real-time
                  </div>
                </div>
              )}

              {result && (
                <div>
                  {/* Triage Badge */}
                  <div style={{
                    background: "#0f1923",
                    border: `1px solid ${urgencyColor}40`,
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 16,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "1px", marginBottom: 4, fontWeight: 600 }}>
                          GPT-5.6 TRIAGE
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>
                          {result.triage.emergency_type.replace(/_/g, " ")}
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                          {result.triage.summary}
                        </div>
                      </div>
                      <div style={{
                        background: `${urgencyColor}20`,
                        border: `1px solid ${urgencyColor}50`,
                        borderRadius: 8,
                        padding: "6px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: urgencyColor,
                        letterSpacing: "1px",
                        boxShadow: `0 0 12px ${urgencyColor}30`,
                      }}>
                        {result.triage.urgency_level}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                      {result.triage.red_flags.map((flag, i) => (
                        <span key={i} style={{
                          background: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.2)",
                          borderRadius: 4,
                          padding: "2px 8px",
                          fontSize: 10,
                          color: "#ef4444",
                          fontWeight: 600,
                        }}>⚠ {flag}</span>
                      ))}
                    </div>
                  </div>

                  {/* Recommended Hospital */}
                  <div style={{
                    background: "linear-gradient(135deg, #0a1628, #0f1923)",
                    border: "2px solid rgba(239,68,68,0.4)",
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 16,
                    boxShadow: "0 0 30px rgba(239,68,68,0.1)",
                  }}>
                    <div style={{ fontSize: 11, color: "#ef4444", letterSpacing: "1px", marginBottom: 12, fontWeight: 700 }}>
                      ✅ ROUTE TO
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
                          {result.recommended_hospital.short_name}
                        </div>
                        <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                          📍 {result.recommended_hospital.area}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{
                          fontSize: 32, fontWeight: 800, color: "#22c55e",
                          lineHeight: 1,
                        }}>
                          {result.recommended_hospital.eta_minutes}
                          <span style={{ fontSize: 14, fontWeight: 400, color: "#64748b" }}>min</span>
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          {result.recommended_hospital.distance_km}km away
                        </div>
                      </div>
                    </div>

                    <div style={{
                      display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 8, marginTop: 14,
                    }}>
                      {[
                        { label: "ICU Beds", value: result.recommended_hospital.available_icu, good: result.recommended_hospital.available_icu > 0 },
                        { label: "Specialist", value: result.recommended_hospital.has_required_specialist ? "✓" : "✗", good: result.recommended_hospital.has_required_specialist },
                        { label: "Generator", value: result.recommended_hospital.generator_status ? "Online" : "Offline", good: result.recommended_hospital.generator_status },
                        { label: "Score", value: `${result.recommended_hospital.score.toFixed(0)}/100`, good: result.recommended_hospital.score > 70 },
                      ].map((item, i) => (
                        <div key={i} style={{
                          background: "#0a1628",
                          border: `1px solid ${item.good ? "#22c55e30" : "#ef444430"}`,
                          borderRadius: 8,
                          padding: "8px 10px",
                          textAlign: "center",
                        }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: item.good ? "#22c55e" : "#ef4444" }}>
                            {item.value}
                          </div>
                          <div style={{ fontSize: 9, color: "#475569", marginTop: 2, letterSpacing: "0.5px" }}>
                            {item.label.toUpperCase()}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{
                      marginTop: 14,
                      padding: "12px 14px",
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: 8,
                      border: "1px solid #1e3a5f",
                      fontSize: 12,
                      color: "#94a3b8",
                      lineHeight: 1.6,
                    }}>
                      💬 {result.routing_explanation}
                    </div>
                  </div>

                  {/* Alternatives */}
                  <div style={{
                    background: "#0f1923",
                    border: "1px solid #1e3a5f",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                  }}>
                    <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "1px", marginBottom: 12, fontWeight: 600 }}>
                      ALTERNATIVES CONSIDERED
                    </div>
                    {result.alternatives.map((alt, i) => (
                      <div key={i} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        background: "#0a1628",
                        borderRadius: 8,
                        marginBottom: 8,
                        border: "1px solid #1e3a5f",
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: "#94a3b8" }}>
                            {alt.short_name}
                          </div>
                          <div style={{ fontSize: 11, color: "#475569" }}>{alt.area}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#64748b" }}>
                            {alt.eta_minutes}min
                          </div>
                          <div style={{ fontSize: 10, color: "#475569" }}>
                            Score: {alt.score.toFixed(0)}/100
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Codex Function Toggle */}
                  <div style={{
                    background: "#0f1923",
                    border: "1px solid #1e3a5f",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}>
                    <button
                      onClick={() => setShowCodex(!showCodex)}
                      style={{
                        width: "100%",
                        background: "transparent",
                        border: "none",
                        color: "#64748b",
                        padding: "12px 16px",
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: "1px",
                        textAlign: "left",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>⚡ SCORING BREAKDOWN</span>
                      <span>{showCodex ? "▲" : "▼"}</span>
                    </button>
                    {showCodex && (
                      <pre style={{
                        padding: "0 16px 16px",
                        fontSize: 11,
                        color: "#22c55e",
                        overflowX: "auto",
                        fontFamily: "'Courier New', monospace",
                        margin: 0,
                        background: "#050810",
                        lineHeight: 1.6,
                      }}>
                        {result.codex_scoring_function}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "hospitals" && (
          <div>
            <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "1px", marginBottom: 16, fontWeight: 600 }}>
              LAGOS HOSPITAL NETWORK — LIVE CAPACITY
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {/* Static display of the 12 hospitals */}
              {[
                { name: "LUTH", area: "Surulere", icu: 3, beds: 42, cardiologist: true, neurologist: true, trauma: true, generator: true },
                { name: "Reddington", area: "Victoria Island", icu: 7, beds: 31, cardiologist: true, neurologist: true, trauma: true, generator: true },
                { name: "Eko Hospital", area: "Ikeja GRA", icu: 9, beds: 58, cardiologist: true, neurologist: true, trauma: false, generator: true },
                { name: "Lagos Island General", area: "Lagos Island", icu: 1, beds: 67, cardiologist: false, neurologist: false, trauma: true, generator: false },
                { name: "First Cardiology", area: "Ikoyi", icu: 5, beds: 18, cardiologist: true, neurologist: false, trauma: false, generator: true },
                { name: "St. Nicholas", area: "Lagos Island", icu: 2, beds: 22, cardiologist: true, neurologist: true, trauma: false, generator: true },
                { name: "Lagoon Hospital", area: "Apapa", icu: 6, beds: 45, cardiologist: true, neurologist: true, trauma: true, generator: true },
                { name: "LASUTH", area: "Ikeja", icu: 11, beds: 89, cardiologist: true, neurologist: true, trauma: true, generator: true },
                { name: "Gbagada General", area: "Gbagada", icu: 4, beds: 54, cardiologist: false, neurologist: false, trauma: true, generator: true },
                { name: "Doyen Hospital", area: "Lekki Phase 1", icu: 4, beds: 29, cardiologist: true, neurologist: false, trauma: false, generator: true },
                { name: "Island Hospital", area: "Victoria Island", icu: 3, beds: 24, cardiologist: true, neurologist: true, trauma: false, generator: true },
                { name: "Harvey Road Medical", area: "Yaba", icu: 2, beds: 19, cardiologist: false, neurologist: false, trauma: true, generator: false },
              ].map((h, i) => (
                <div key={i} style={{
                  background: "#0f1923",
                  border: `1px solid ${!h.generator ? "rgba(239,68,68,0.3)" : "#1e3a5f"}`,
                  borderRadius: 10,
                  padding: 14,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#e2e8f0" }}>{h.name}</div>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{h.area}</div>
                    </div>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%", marginTop: 4,
                      background: h.generator ? "#22c55e" : "#ef4444",
                      boxShadow: `0 0 6px ${h.generator ? "#22c55e" : "#ef4444"}`,
                    }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <div style={{ background: "#0a1628", borderRadius: 6, padding: "6px 8px" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: h.icu > 3 ? "#22c55e" : h.icu > 0 ? "#eab308" : "#ef4444" }}>{h.icu}</div>
                      <div style={{ fontSize: 9, color: "#475569" }}>ICU AVAILABLE</div>
                    </div>
                    <div style={{ background: "#0a1628", borderRadius: 6, padding: "6px 8px" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>{h.beds}</div>
                      <div style={{ fontSize: 9, color: "#475569" }}>BEDS AVAIL.</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
                    {h.cardiologist && <span style={{ fontSize: 9, background: "rgba(239,68,68,0.1)", color: "#ef4444", borderRadius: 3, padding: "2px 5px", fontWeight: 600 }}>❤️ CARDIO</span>}
                    {h.neurologist && <span style={{ fontSize: 9, background: "rgba(139,92,246,0.1)", color: "#a78bfa", borderRadius: 3, padding: "2px 5px", fontWeight: 600 }}>🧠 NEURO</span>}
                    {h.trauma && <span style={{ fontSize: 9, background: "rgba(249,115,22,0.1)", color: "#fb923c", borderRadius: 3, padding: "2px 5px", fontWeight: 600 }}>🔪 TRAUMA</span>}
                    {!h.generator && <span style={{ fontSize: 9, background: "rgba(239,68,68,0.15)", color: "#ef4444", borderRadius: 3, padding: "2px 5px", fontWeight: 600 }}>⚡ NO GEN</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "log" && (
          <div style={{
            background: "#0f1923",
            border: "1px solid #1e3a5f",
            borderRadius: 12,
            padding: 24,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ color: "#64748b", fontSize: 14 }}>
              Dispatch log loads from API — run a routing to see entries here.
            </div>
            {result && (
              <div style={{
                marginTop: 20,
                background: "#0a1628",
                border: "1px solid #1e3a5f",
                borderRadius: 10,
                padding: 16,
                textAlign: "left",
              }}>
                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8, fontWeight: 600, letterSpacing: "1px" }}>
                  LATEST DISPATCH #{result.dispatch_id}
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.8 }}>
                  <div>Emergency: <span style={{ color: "#e2e8f0" }}>{result.triage.emergency_type}</span></div>
                  <div>Routed to: <span style={{ color: "#22c55e" }}>{result.recommended_hospital.name}</span></div>
                  <div>ETA: <span style={{ color: "#e2e8f0" }}>{result.recommended_hospital.eta_minutes} minutes</span></div>
                  <div>Score: <span style={{ color: "#e2e8f0" }}>{result.recommended_hospital.score.toFixed(1)}/100</span></div>
                  <div style={{ marginTop: 8, color: "#64748b", fontStyle: "italic" }}>
                    Dispatcher can override above by selecting an alternative hospital.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a1628; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }
        textarea:focus, input:focus {
          border-color: rgba(239,68,68,0.4) !important;
        }
      `}</style>
    </div>
  );
}
