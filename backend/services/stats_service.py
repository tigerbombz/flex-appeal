import httpx
from typing import Optional

SLEEPER_BASE_URL = "https://api.sleeper.app/v1"

# Fantasy scoring weights for calculating points from raw stats
# These match standard PPR scoring
PPR_SCORING = {
    "pts_ppr":        1.0,   # Sleeper pre-calculates this
    "pass_yd":        0.04,  # 1 pt per 25 yards
    "pass_td":        6.0,
    "pass_int":      -2.0,
    "rush_yd":        0.1,   # 1 pt per 10 yards
    "rush_td":        6.0,
    "rec":            1.0,   # PPR
    "rec_yd":         0.1,
    "rec_td":         6.0,
    "fum_lost":      -2.0,
    "2pt_conv":       2.0,
    # DST
    "dst_sack":       1.0,
    "dst_int":        2.0,
    "dst_fum_rec":    2.0,
    "dst_td":         6.0,
    "dst_safe":       2.0,
    "dst_pts_allow_0":  10.0,
    "dst_pts_allow_1_6": 7.0,
    "dst_pts_allow_7_13": 4.0,
    "dst_pts_allow_14_20": 1.0,
    "dst_pts_allow_21_27": 0.0,
    "dst_pts_allow_28_34": -1.0,
    "dst_pts_allow_35p": -4.0,
    # K
    "fgm_0_19":       3.0,
    "fgm_20_29":      3.0,
    "fgm_30_39":      3.0,
    "fgm_40_49":      4.0,
    "fgm_50p":        5.0,
    "xpm":            1.0,
}

async def get_week_stats(season: str, week: int) -> dict:
    """
    Fetch all player stats for a specific week from Sleeper.
    Returns dict keyed by player_id with raw stats.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{SLEEPER_BASE_URL}/stats/nfl/regular/{season}/{week}"
        )
        if response.status_code == 404:
            return {}
        response.raise_for_status()
        return response.json()

async def get_player_stats(
    player_id: str,
    season: str,
    season_type: str = "regular"
) -> dict:
    """
    Fetch all weekly stats for a specific player in a season.
    Returns dict keyed by week number.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{SLEEPER_BASE_URL}/stats/nfl/player/{player_id}",
            params={
                "season_type": season_type,
                "season":      season,
            }
        )
        if response.status_code == 404:
            return {}
        response.raise_for_status()
        return response.json()

def calc_fantasy_points(stats: dict, scoring: str = "PPR") -> float:
    """
    Calculate fantasy points from raw Sleeper stats.
    Sleeper provides pts_ppr, pts_half_ppr, pts_std directly.
    """
    if not stats:
        return 0.0

    # Use Sleeper's pre-calculated values when available
    if scoring == "PPR" and "pts_ppr" in stats:
        return round(stats["pts_ppr"], 2)
    if scoring == "Half" and "pts_half_ppr" in stats:
        return round(stats["pts_half_ppr"], 2)
    if scoring == "Standard" and "pts_std" in stats:
        return round(stats["pts_std"], 2)

    # Fallback — manual calculation
    total = 0.0
    for stat_key, multiplier in PPR_SCORING.items():
        if stat_key in stats:
            total += stats[stat_key] * multiplier
    return round(total, 2)

async def get_points_last_three(
    player_id: str,
    season: str,
    current_week: int,
    scoring: str = "PPR",
) -> list[float]:
    """
    Get a player's fantasy points for the last 3 weeks.
    Returns list of up to 3 floats, most recent last.
    Returns empty list if no data available (offseason).
    """
    if current_week <= 0:
        return []

    points = []
    start_week = max(1, current_week - 3)
    end_week   = current_week - 1  # don't include current week

    if start_week > end_week:
        return []

    try:
        stats_by_week = await get_player_stats(player_id, season)
        if not stats_by_week:
            return []

        for week in range(start_week, end_week + 1):
            week_stats = stats_by_week.get(str(week), {})
            pts        = calc_fantasy_points(week_stats, scoring)
            points.append(pts)

        return points[-3:]  # last 3 weeks only

    except Exception as e:
        print(f"Failed to get points for player {player_id}: {str(e)}")
        return []

async def get_week_top_performers(
    season: str,
    week: int,
    position: str,
    scoring: str = "PPR",
    limit: int = 20,
) -> list[dict]:
    """
    Get top fantasy performers for a position in a given week.
    Useful for waiver wire recommendations.
    """
    try:
        week_stats = await get_week_stats(season, week)
        if not week_stats:
            return []

        performers = []
        for player_id, stats in week_stats.items():
            pts = calc_fantasy_points(stats, scoring)
            if pts > 0:
                performers.append({
                    "player_id": player_id,
                    "points":    pts,
                    "stats":     stats,
                })

        performers.sort(key=lambda x: x["points"], reverse=True)
        return performers[:limit]

    except Exception as e:
        print(f"Failed to get top performers: {str(e)}")
        return []