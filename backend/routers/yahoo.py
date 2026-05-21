from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from services.yahoo_service import (
    get_auth_url,
    exchange_code_for_token,
    get_user_leagues,
    get_roster,
    get_my_team,
    get_free_agents,
    get_pending_trades,
)
from models.user_repository import get_first_user, get_active_token
import os

router = APIRouter(prefix="/auth/yahoo", tags=["yahoo"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

@router.get("/login")
async def yahoo_login():
    auth_url = get_auth_url()
    return RedirectResponse(url=auth_url)

@router.get("/callback")
async def yahoo_callback(code: str, db: AsyncSession = Depends(get_db)):
    try:
        token_data   = await exchange_code_for_token(code, db)
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        print(f"Yahoo auth successful for user: {token_data.get('yahoo_id')}")
        return RedirectResponse(url=f"{frontend_url}?yahoo_connected=true")
    except Exception as e:
        print(f"Callback error: {str(e)}")
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(url=f"{frontend_url}?yahoo_error={str(e)}")

@router.get("/status")
async def yahoo_status(db: AsyncSession = Depends(get_db)):
    try:
        user = await get_first_user(db)
        if not user or not user.access_token:
            return { "connected": False }
        return {
            "connected":      True,
            "yahoo_id":       user.yahoo_id,
            "display_name":   user.display_name,
            "email":          user.email,
            "scoring_format": user.scoring_format,
            "scoring_mode":   user.scoring_mode,
        }
    except Exception:
        return { "connected": False }

@router.get("/leagues")
async def fetch_leagues(db: AsyncSession = Depends(get_db)):
    try:
        user = await get_first_user(db)
        if not user or not user.yahoo_id:
            raise HTTPException(status_code=401, detail="Not authenticated")
        leagues = await get_user_leagues(user.yahoo_id, db)
        return { "leagues": leagues }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/team/{league_key}")
async def fetch_my_team(league_key: str, db: AsyncSession = Depends(get_db)):
    try:
        user = await get_first_user(db)
        if not user or not user.yahoo_id:
            raise HTTPException(status_code=401, detail="Not authenticated")
        team = await get_my_team(league_key, user.yahoo_id, db)
        return { "team": team }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/roster/{league_key}/{team_key}")
async def fetch_roster(
    league_key: str,
    team_key:   str,
    db:         AsyncSession = Depends(get_db),
):
    try:
        user = await get_first_user(db)
        if not user or not user.yahoo_id:
            raise HTTPException(status_code=401, detail="Not authenticated")
        players = await get_roster(league_key, team_key, user.yahoo_id, db)
        return { "players": players }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/free-agents/{league_key}")
async def fetch_free_agents(
    league_key: str,
    position:   str = "",
    count:      int = 25,
    db:         AsyncSession = Depends(get_db),
):
    """
    Get available free agents for a league.
    Returns players not on any roster, sorted by ownership % descending.
    Includes injury status and ownership % so Claude can make smarter recommendations.
    Falls back to [] gracefully if Yahoo API is unavailable (offseason etc).
    """
    try:
        user = await get_first_user(db)
        if not user or not user.yahoo_id:
            return { "players": [], "source": "unauthenticated" }

        players = await get_free_agents(
            league_key = league_key,
            yahoo_id   = user.yahoo_id,
            db         = db,
            position   = position,
            count      = min(count, 25),  # Yahoo hard cap is 25 per request
        )
        return { "players": players, "source": "yahoo" }

    except Exception as e:
        print(f"fetch_free_agents error: {e}")
        return { "players": [], "source": "error" }

@router.get("/trades/pending")
async def fetch_pending_trades(db: AsyncSession = Depends(get_db)):
    """
    Get pending trade proposals for the user's active team.
    Returns { trades: [] } gracefully if not connected or no pending trades.
    """
    try:
        user = await get_first_user(db)
        if not user or not user.yahoo_id:
            return { "trades": [] }

        league_key = getattr(user, "league_key", None)
        team_key   = getattr(user, "team_key",   None)

        if not league_key or not team_key:
            try:
                leagues    = await get_user_leagues(user.yahoo_id, db)
                if not leagues:
                    return { "trades": [] }
                league_key = leagues[0]["league_key"]
                team_data  = await get_my_team(league_key, user.yahoo_id, db)
                team_key   = team_data.get("team_key")
            except Exception:
                return { "trades": [] }

        if not league_key or not team_key:
            return { "trades": [] }

        trades = await get_pending_trades(league_key, team_key, user.yahoo_id, db)
        return { "trades": trades }

    except Exception as e:
        print(f"fetch_pending_trades error: {e}")
        return { "trades": [] }

@router.get("/debug")
async def debug_env():
    return {
        "redirect_uri":  os.getenv("YAHOO_REDIRECT_URI"),
        "client_id_set": os.getenv("YAHOO_CLIENT_ID") is not None,
        "secret_set":    os.getenv("YAHOO_CLIENT_SECRET") is not None,
    }