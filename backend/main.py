from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import odds, scoring, sleeper

app = FastAPI(title="SnapDecision API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(odds.router)
app.include_router(scoring.router)
app.include_router(sleeper.router)

@app.get("/")
def root():
    return { "message": "SnapDecision API is running" }

@app.get("/health")
def health():
    return { "status": "ok" }