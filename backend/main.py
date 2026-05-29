from dotenv import load_dotenv
load_dotenv()  # must be first — loads .env before any other imports read env vars

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import odds, scoring, sleeper, yahoo, lineup, backtest, stats, ai
from database import init_db
import os

app = FastAPI(title="SnapDecision API", version="1.0.0")

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in origins if o],
    allow_credentials=True,   # required for cookies to be sent cross-origin
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(odds.router)
app.include_router(scoring.router)
app.include_router(sleeper.router)
app.include_router(yahoo.router)
app.include_router(lineup.router)
app.include_router(backtest.router)
app.include_router(stats.router)
app.include_router(ai.router)

@app.on_event("startup")
async def startup():
    await init_db()
    print("Database initialized successfully")

@app.get("/")
def root():
    return {"message": "SnapDecision API is running"}

@app.get("/health")
def health():
    return {"status": "ok"}