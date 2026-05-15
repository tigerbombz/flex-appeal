from datetime import datetime

def get_current_season() -> str:
    """
    Returns the current NFL season year.
    NFL season starts in September so:
    - Jan-Aug 2026 → season 2025
    - Sep-Dec 2026 → season 2026
    """
    now = datetime.now()
    if now.month >= 9:
        return str(now.year)
    else:
        return str(now.year - 1)

def get_current_week() -> int:
    """
    Estimate current NFL week based on date.
    Season starts first Thursday of September.
    Returns 0 if offseason.
    """
    now    = datetime.now()
    season = int(get_current_season())

    # Rough season start — first Thursday of September
    # We use Sept 4 as a safe approximation
    import datetime as dt
    season_start = dt.date(season, 9, 4)
    today        = now.date()

    if today < season_start:
        return 0  # offseason

    # Approximate week number
    days_since_start = (today - season_start).days
    week             = (days_since_start // 7) + 1
    return min(week, 18)  # max 18 regular season weeks