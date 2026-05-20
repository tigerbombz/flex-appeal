"""
SnapDecision — AI Endpoint Test Script
Run from your backend directory: python test_ai.py

Requires:
  - Backend running locally: uvicorn main:app --reload
  - ANTHROPIC_API_KEY set in your .env
"""

import httpx
import json

BASE_URL = "http://localhost:8000"

# ── Sample roster (matches mock data shape) ──────────────────────────────────
STARTERS = [
    {"name": "Lamar Jackson",   "position": "QB",  "team": "BAL", "slot": "QB",   "score": 82, "floor": 18, "ceiling": 45, "volatility": "High"},
    {"name": "Christian McCaffrey", "position": "RB", "team": "SF", "slot": "RB1", "score": 91, "floor": 15, "ceiling": 38, "volatility": "Medium"},
    {"name": "Breece Hall",     "position": "RB",  "team": "NYJ", "slot": "RB2",  "score": 74, "floor": 8,  "ceiling": 28, "volatility": "Medium"},
    {"name": "Tyreek Hill",     "position": "WR",  "team": "MIA", "slot": "WR1",  "score": 85, "floor": 6,  "ceiling": 40, "volatility": "High"},
    {"name": "Davante Adams",   "position": "WR",  "team": "LV",  "slot": "WR2",  "score": 71, "floor": 5,  "ceiling": 30, "volatility": "High"},
    {"name": "Sam LaPorta",     "position": "TE",  "team": "DET", "slot": "TE",   "score": 68, "floor": 4,  "ceiling": 22, "volatility": "Medium"},
    {"name": "Puka Nacua",      "position": "WR",  "team": "LAR", "slot": "FLEX", "score": 72, "floor": 5,  "ceiling": 28, "volatility": "Medium"},
    {"name": "Ravens D/ST",     "position": "DST", "team": "BAL", "slot": "DST",  "score": 65, "floor": 2,  "ceiling": 18, "volatility": "High"},
    {"name": "Evan McPherson",  "position": "K",   "team": "CIN", "slot": "K",    "score": 60, "floor": 5,  "ceiling": 15, "volatility": "Low"},
]

BENCH = [
    {"name": "Gus Edwards",     "position": "RB",  "team": "LAC", "slot": "BN", "score": 55},
    {"name": "Rashid Shaheed",  "position": "WR",  "team": "NO",  "slot": "BN", "score": 52},
    {"name": "Dalton Kincaid",  "position": "TE",  "team": "BUF", "slot": "BN", "score": 48},
]

# ── Test 1: AI Status ─────────────────────────────────────────────────────────
def test_ai_status():
    print("\n── Test 1: AI Status ──")
    r = httpx.get(f"{BASE_URL}/api/ai/status")
    print(f"Status: {r.status_code}")
    data = r.json()
    print(json.dumps(data, indent=2))

    if not data.get("configured"):
        print("⚠️  ANTHROPIC_API_KEY is not set — set it in your .env and restart the server")
    else:
        print(f"✅ API key configured | {data['requests_left']} requests left today")

# ── Test 2: Trade Analyzer ────────────────────────────────────────────────────
def test_trade():
    print("\n── Test 2: Trade Analyzer ──")
    payload = {
        "starters":        STARTERS,
        "bench":           BENCH,
        "giving_players":  [
            {"name": "Davante Adams", "position": "WR", "team": "LV",  "score": 71},
        ],
        "getting_players": [
            {"name": "Tony Pollard",  "position": "RB", "team": "TEN", "score": 66},
        ],
        "scoring_format":  "PPR",
        "scoring_mode":    "balanced",
        "user_notes":      "I have RB depth issues and strong WR depth",
    }

    print("Sending trade request...")
    r = httpx.post(f"{BASE_URL}/api/ai/trade", json=payload, timeout=30)
    print(f"Status: {r.status_code}")

    if r.status_code == 200:
        data = r.json()
        analysis = data.get("analysis", {})
        print(f"\n✅ Verdict:    {analysis.get('verdict')} ({analysis.get('confidence')} confidence)")
        print(f"   Summary:    {analysis.get('summary')}")
        print(f"   Giving:     {analysis.get('giving_analysis')}")
        print(f"   Getting:    {analysis.get('getting_analysis')}")
        print(f"   Impact:     {analysis.get('roster_impact')}")
        print(f"   Rec:        {analysis.get('recommendation')}")
        if analysis.get("counter_offer"):
            print(f"   Counter:    {analysis.get('counter_offer')}")
    else:
        print(f"❌ Error: {r.text}")

# ── Test 3: Waiver Assistant ──────────────────────────────────────────────────
def test_waiver():
    print("\n── Test 3: Waiver Assistant ──")
    payload = {
        "starters": STARTERS,
        "bench":    BENCH,
        "available_players": [
            {"name": "Chuba Hubbard",   "position": "RB", "team": "CAR", "score": 61},
            {"name": "Elijah Moore",    "position": "WR", "team": "CLE", "score": 54},
            {"name": "Cole Kmet",       "position": "TE", "team": "CHI", "score": 57},
            {"name": "Zach Charbonnet", "position": "RB", "team": "SEA", "score": 63},
            {"name": "Dontayvion Wicks","position": "WR", "team": "GB",  "score": 51},
        ],
        "scoring_format": "PPR",
        "scoring_mode":   "balanced",
        "week":           8,
    }

    print("Sending waiver request...")
    r = httpx.post(f"{BASE_URL}/api/ai/waiver", json=payload, timeout=30)
    print(f"Status: {r.status_code}")

    if r.status_code == 200:
        data  = r.json()
        recs  = data.get("recommendations", {})
        print(f"\n✅ Roster Analysis: {recs.get('roster_analysis')}")
        print(f"   Priority Positions: {recs.get('priority_positions')}")
        print(f"\n   Recommendations:")
        for rec in recs.get("recommendations", []):
            drop = f" | Drop: {rec['drop_player']}" if rec.get("drop_player") else ""
            print(f"   [{rec['priority'].upper()}] ➕ {rec['player']} ({rec['position']}){drop}")
            print(f"          {rec['reasoning']}")
        print(f"\n   Weekly Tip: {recs.get('weekly_tip')}")
    else:
        print(f"❌ Error: {r.text}")

# ── Test 4: Rate limit check ──────────────────────────────────────────────────
def test_rate_limit():
    print("\n── Test 4: Rate Limit Status ──")
    r    = httpx.get(f"{BASE_URL}/api/ai/status")
    data = r.json()
    used = data.get("requests_today", 0)
    left = data.get("requests_left",  0)
    lim  = data.get("requests_limit", 50)
    print(f"Used today: {used} / {lim}")
    print(f"Remaining:  {left}")
    if left < 5:
        print("⚠️  Running low on daily requests")
    else:
        print("✅ Rate limit healthy")

# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("SnapDecision — AI Endpoint Tests")
    print("Make sure backend is running: uvicorn main:app --reload")
    print("=" * 60)

    test_ai_status()
    test_trade()
    test_waiver()
    test_rate_limit()

    print("\n" + "=" * 60)
    print("Done.")