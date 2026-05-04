from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import odds, scoring, sleeper, yahoo, lineup
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(odds.router)
app.include_router(scoring.router)
app.include_router(sleeper.router)
app.include_router(yahoo.router)
app.include_router(lineup.router)


@app.get("/")
def root():
    return { "message": "SnapDecision API is running" }

@app.get("/health")
def health():
    return { "status": "ok" }