# 🚑 GoldenHour
### Lagos Emergency Hospital Routing — Right Hospital, Right Time.

> *In Lagos traffic, the nearest hospital can kill you. GoldenHour routes to the right one.*

Built for OpenAI Build Week 2026 — using **Codex** and **GPT-5.6**.

---

## The Problem

Lagos has 22 million people, some of the worst traffic in the world, and zero
centralised hospital bed management. When a cardiac arrest happens on Victoria
Island at 6:30 PM, ambulance crews call hospitals one by one — burning 5-15
minutes per call while the patient's golden hour expires.

**Google Maps tells you how to get to a hospital.  
GoldenHour tells you WHICH hospital to go to.**

---

## How It Works

1. **GPT-5.6 Triage Agent** — parses symptoms → emergency type, urgency, specialist needed
2. **Deterministic Routing Policy** — hard eligibility gates (ICU, specialist, equipment), normalized weighted scoring, explicit reason codes, and stable tie-breakers
3. **Google Maps Distance Matrix** — real-time Lagos traffic ETAs to all 12 hospitals
4. **GPT-5.6 Explanation Agent** — plain English dispatch recommendation

---

## Stack

- **AI:** GPT-5.6 (triage + dispatch explanation); deterministic RoutingPolicy for scoring (rebuilt with Codex)
- **Backend:** FastAPI → Railway
- **Frontend:** React + Vite → Vercel
- **Database:** SQLite (hospital capacity + dispatch log)
- **Maps:** Google Maps Distance Matrix API

---
## Built with Codex and GPT-5.6

**Prior to Build Week submission work:** the core app existed — FastAPI backend, React frontend, GPT-5.6 triage integration, hospital database, and dispatch UI. An earlier version generated per-emergency scoring functions at runtime and executed them.

**During the Submission Period (built with Codex):**
- Codex reviewed the codebase and flagged the runtime execution of model-generated scoring code as unsafe (arbitrary code execution, fail-open scoring, no hard eligibility gates)
- Rebuilt the routing engine as a deterministic `RoutingPolicy` (`backend/routing_policy.py`): eligibility gates, normalized weighted factors, explicit reason codes, stable tie-breakers — commit `c5165c0`
- Added strict pydantic validation of GPT-5.6 triage output (`TriageOutput`)
- Secured the hospital capacity endpoint with `X-API-Key` authentication and wired the Admin UI to it — commit `ccc34ae`
- Added the backend test suite (routing gates, validation, tie-breaking, capacity auth) — 9 tests passing

GPT-5.6 remains responsible for what AI does best here: symptom triage and the plain-English dispatch explanation. Ranking decisions are deterministic and auditable — in emergency medicine, that's a feature.

Codex /feedback session: `019f78d5-3c74-7112-887d-a98df3ae8ab7`

## Setup

```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env   # add your keys
uvicorn main:app --reload

# Frontend
cd frontend
npm install
cp .env.example .env.local   # add Railway URL
npm run dev
```

Set `HOSPITAL_CAPACITY_API_KEY` on the backend to protect `PATCH /hospitals/{id}/capacity`.
The Admin UI sends `VITE_HOSPITAL_CAPACITY_API_KEY` as the `X-API-Key` header; use the same value when deploying it.

---

## Built By
John Okoi Inah — CEO, JDAEM Enterprise Limited / inahmedia  
Lagos, Nigeria 🇳🇬

*Built in 4 days. From Lagos, for Lagos.*
