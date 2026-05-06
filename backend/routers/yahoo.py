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
)
from models.user_repository import get_first_user, get_active_token
import os

router = APIRouter(prefix="/auth/yahoo", tags=["yahoo"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

@router.get("/login")
async def yahoo_login():
    """Redirect user to Yahoo OAuth login"""
    auth_url = get_auth_url()
    return RedirectResponse(url=auth_url)

@router.get("/callback")
async def yahoo_callback(code: str, db: AsyncSession = Depends(get_db)):
    """Handle Yahoo OAuth callback"""
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
    """Check if user is authenticated with Yahoo"""
    try:
        user = await get_first_user(db)
        if not user or not user.access_token:
            return { "connected": False }
        return {
            "connected":    True,
            "display_name": user.display_name,
            "yahoo_id":     user.yahoo_id,
        }
    except Exception:
        return { "connected": False }

@router.get("/leagues")
async def fetch_leagues(db: AsyncSession = Depends(get_db)):
    """Get all fantasy football leagues for authenticated user"""
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
    """Get authenticated user's team in a league"""
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
    team_key: str,
    db: AsyncSession = Depends(get_db)
):
    """Get roster for a specific team"""
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

@router.get("/debug")
async def debug_env():
    """Check environment variables"""
    return {
        "redirect_uri":  os.getenv("YAHOO_REDIRECT_URI"),
        "client_id_set": os.getenv("YAHOO_CLIENT_ID") is not None,
        "secret_set":    os.getenv("YAHOO_CLIENT_SECRET") is not None,
    }