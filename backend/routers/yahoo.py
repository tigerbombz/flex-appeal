from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from services.yahoo_service import (
    get_auth_url,
    exchange_code_for_token,
    get_user_leagues,
    get_roster,
    get_my_team,
    token_store,
)
import os

router = APIRouter(prefix="/auth/yahoo", tags=["yahoo"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

@router.get("/login")
async def yahoo_login():
    """Redirect user to Yahoo OAuth login page"""
    auth_url = get_auth_url()
    return RedirectResponse(url=auth_url)

@router.get("/callback")
async def yahoo_callback(code: str):
    """Handle Yahoo OAuth callback and exchange code for token"""
    try:
        await exchange_code_for_token(code)
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        print(f"Redirecting to: {frontend_url}?yahoo_connected=true")
        return RedirectResponse(url=f"{frontend_url}?yahoo_connected=true")
    except Exception as e:
        print(f"Callback error: {str(e)}")
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        return RedirectResponse(url=f"{frontend_url}?yahoo_error={str(e)}")

@router.get("/status")
async def yahoo_status():
    """Check if user is authenticated with Yahoo"""
    is_connected = "access_token" in token_store
    return { "connected": is_connected }

@router.get("/leagues")
async def fetch_leagues():
    """Get all fantasy football leagues for authenticated user"""
    try:
        leagues = await get_user_leagues()
        return { "leagues": leagues }
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.get("/roster/{league_key}/{team_key}")
async def fetch_roster(league_key: str, team_key: str):
    """Get roster for a specific team"""
    try:
        players = await get_roster(league_key, team_key)
        return { "players": players }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/team/{league_key}")
async def fetch_my_team(league_key: str):
    """Get the authenticated user's team in a league"""
    try:
        team = await get_my_team(league_key)
        return { "team": team }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.get("/debug")
async def debug_env():
    return {
        "redirect_uri":  os.getenv("YAHOO_REDIRECT_URI"),
        "client_id_set": os.getenv("YAHOO_CLIENT_ID") is not None,
        "secret_set":    os.getenv("YAHOO_CLIENT_SECRET") is not None,
    }