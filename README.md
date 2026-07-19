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
2. **Codex Routing Agent** — generates a custom Python scoring function per emergency type
3. **Google Maps Distance Matrix** — real-time Lagos traffic ETAs to all 12 hospitals
4. **GPT-5.6 Explanation Agent** — plain English dispatch recommendation

---

## Stack

- **AI:** GPT-5.6 (triage + explanation), Codex (dynamic scoring)
- **Backend:** FastAPI → Railway
- **Frontend:** React + Vite → Vercel
- **Database:** SQLite (hospital capacity + dispatch log)
- **Maps:** Google Maps Distance Matrix API

---

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
