from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from database import init_db
from routers import routing, hospitals

load_dotenv()

app = FastAPI(title="GoldenHour API",
              description="Lagos Emergency Hospital Routing — Right Hospital, Right Time.",
              version="1.0.0")

app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup():
    init_db()
    print("🚑 GoldenHour API online — Lagos Emergency Routing Active")

@app.get("/")
async def root():
    return {"service":"GoldenHour","tagline":"In Lagos traffic, the golden hour is all you have.","status":"online"}

@app.get("/health")
async def health():
    return {"status":"healthy"}

app.include_router(routing.router, tags=["Emergency Routing"])
app.include_router(hospitals.router, prefix="/hospitals", tags=["Hospitals"])
