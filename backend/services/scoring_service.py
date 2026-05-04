from models.player import (
    PlayerInput, PlayerScore, ScoringFormat,
    ScoringMode, Position, Volatility
)

# ─── Position-specific base weights ─────────────────────────
POSITION_WEIGHTS = {
    Position.QB: {
        "vegasProp": 0.25,
        "teamTotal": 0.35,
        "usage":     0.20,
        "trend":     0.10,
        "matchup":   0.10,
    },
    Position.RB: {
        "vegasProp": 0.30,
        "teamTotal": 0.20,
        "usage":     0.30,
        "trend":     0.10,
        "matchup":   0.10,
    },
    Position.WR: {
        "vegasProp": 0.35,
        "teamTotal": 0.20,
        "usage":     0.25,
        "trend":     0.10,
        "matchup":   0.10,
    },
    Position.TE: {
        "vegasProp": 0.35,
        "teamTotal": 0.15,
        "usage":     0.30,
        "trend":     0.10,
        "matchup":   0.10,
    },
    Position.K: {
        "vegasProp": 0.00,
        "teamTotal": 0.50,
        "usage":     0.10,
        "trend":     0.15,
        "matchup":   0.25,
    },
    Position.DST: {
        "vegasProp": 0.00,
        "teamTotal": 0.00,
        "usage":     0.00,
        "trend":     0.20,
        "matchup":   0.80,
    },
}

# ─── Scoring mode weight adjustments ────────────────────────
MODE_ADJUSTMENTS = {
    ScoringMode.FLOOR: {
        "vegasProp": -0.10,
        "usage":     +0.10,
        "trend":     +0.05,
        "matchup":   -0.05,
        "teamTotal":  0.00,
    },
    ScoringMode.UPSIDE: {
        "vegasProp": +0.15,
        "usage":     -0.15,
        "matchup":   +0.05,
        "trend":     -0.05,
        "teamTotal":  0.00,
    },
    ScoringMode.BALANCED: {
        "vegasProp": 0.00,
        "teamTotal": 0.00,
        "usage":     0.00,
        "trend":     0.00,
        "matchup":   0.00,
    },
}

# ─── Scoring format boosts by position ──────────────────────
FORMAT_BOOSTS = {
    ScoringFormat.PPR:      { "WR": 4, "TE": 3, "RB": 2 },
    ScoringFormat.HALF:     { "WR": 2, "TE": 2, "RB": 1 },
    ScoringFormat.STANDARD: {},
}

# ─── Opponent rank tier adjustments ─────────────────────────
def get_opp_rank_adjustment(opp_rank: int | None) -> float:
    if opp_rank is None:
        return 0
    if opp_rank <= 8:
        return -5   # tough defense
    if opp_rank <= 16:
        return 0    # average
    if opp_rank <= 24:
        return 3    # weak
    return 6        # very weak

# ─── Usage lookup ────────────────────────────────────────────
USAGE_SCORES = {
    "High":   100,
    "Medium":  60,
    "Low":     30,
}

TREND_SCORES = {
    "up":      100,
    "neutral":  60,
    "down":     20,
}

# ─── Weather adjustments ─────────────────────────────────────
WEATHER_ADJUSTMENTS = {
    "Clear": 0,
    "Wind":  -4,
    "Rain":  -3,
    "Snow":  -6,
}

# ─── Volatility color ────────────────────────────────────────
VOLATILITY_COLORS = {
    Volatility.LOW:    "#22c55e",
    Volatility.MEDIUM: "#eab308",
    Volatility.HIGH:   "#ef4444",
}

def get_applied_weights(
    position: Position,
    mode: ScoringMode
) -> dict:
    """Get position weights adjusted for scoring mode"""
    base = dict(POSITION_WEIGHTS[position])
    adjustments = MODE_ADJUSTMENTS[mode]

    for key, adj in adjustments.items():
        if key in base:
            base[key] = max(0.0, base[key] + adj)

    # Normalize weights to sum to 1.0
    total = sum(base.values())
    if total > 0:
        base = { k: v / total for k, v in base.items() }

    return base

def calc_dst_score(player: PlayerInput, mode: ScoringMode = ScoringMode.BALANCED) -> int:
    """DST scoring — lower opponent total is better"""
    opp_total = player.oppTotal or 24
    opp_score = max(0, 100 - (opp_total / 45 * 100))
    opp_rank_adj = get_opp_rank_adjustment(player.oppRank)
    trend_score = TREND_SCORES.get(player.trend.value, 60)

    # Mode adjustments for DST
    if mode == ScoringMode.FLOOR:
        # Conservative — weight trend less, matchup more
        raw = (opp_score * 0.75) + (trend_score * 0.15) + (min(opp_rank_adj * 5, 100) * 0.10)
        raw -= 5  # floor penalty
    elif mode == ScoringMode.UPSIDE:
        # Upside — trend matters more
        raw = (opp_score * 0.60) + (trend_score * 0.30) + (min(opp_rank_adj * 5, 100) * 0.10)
        raw += 5  # ceiling boost
    else:
        raw = (opp_score * 0.70) + (trend_score * 0.20) + (min(opp_rank_adj * 5, 100) * 0.10)

    return min(max(round(raw), 0), 99)

def calc_kicker_score(player: PlayerInput, mode: ScoringMode = ScoringMode.BALANCED) -> int:
    """Kicker scoring based on team total, dome/weather, trend"""
    team_total   = player.teamTotal or 20
    team_score   = min((team_total / 35) * 100, 100)
    trend_score  = TREND_SCORES.get(player.trend.value, 60)
    dome_bonus   = 8 if player.isDome else 0
    weather_adj  = WEATHER_ADJUSTMENTS.get(player.weather or "Clear", 0)
    opp_rank_adj = get_opp_rank_adjustment(player.oppRank)

    raw = (
        team_score  * 0.50 +
        trend_score * 0.15 +
        50          * 0.10
    ) + dome_bonus + weather_adj + opp_rank_adj

    # Mode adjustments for K
    if mode == ScoringMode.FLOOR:
        raw -= 6   # kickers are volatile — conservative floor
    elif mode == ScoringMode.UPSIDE:
        raw += 8   # high scoring game = big kicker upside

    return min(max(round(raw), 0), 99)

def calc_base_score(player: PlayerInput, mode: ScoringMode = ScoringMode.BALANCED) -> int:
    """Calculate base score using position-specific weights"""

    # DST and K have custom scoring functions
    if player.position == Position.DST:
        return calc_dst_score(player, mode)
    if player.position == Position.K:
        return calc_kicker_score(player, mode)

    weights = get_applied_weights(player.position, mode)

    # Vegas prop score
    vegas_score = min((player.vegasProp / 100) * 100, 100) if player.vegasProp else 50

    # Team total score
    team_score = min((player.teamTotal / 35) * 100, 100) if player.teamTotal else 50

    # Usage score — prefer snapPct/targetShare over rough label
    if player.snapPct is not None:
        usage_score = min(player.snapPct, 100)
    elif player.targetShare is not None:
        usage_score = min(player.targetShare * 2.5, 100)
    elif player.carryShare is not None:
        usage_score = min(player.carryShare * 1.4, 100)
    else:
        usage_score = USAGE_SCORES.get(player.usage or "Medium", 50)

    # Trend score — weight recent games if available
    if player.pointsLastThree:
        avg_recent = sum(player.pointsLastThree) / len(player.pointsLastThree)
        trend_from_recent = min((avg_recent / 30) * 100, 100)
        trend_score = (TREND_SCORES.get(player.trend.value, 60) * 0.5 +
                      trend_from_recent * 0.5)
    else:
        trend_score = TREND_SCORES.get(player.trend.value, 60)

    # Matchup score from opp rank
    opp_rank_adj = get_opp_rank_adjustment(player.oppRank)

    # Weather adjustment
    weather_adj = WEATHER_ADJUSTMENTS.get(player.weather or "Clear", 0)

    raw = (
        vegas_score * weights["vegasProp"] +
        team_score  * weights["teamTotal"] +
        usage_score * weights["usage"]     +
        trend_score * weights["trend"]
    ) + opp_rank_adj + weather_adj

    return min(round(raw), 99)

def calc_adjusted_score(
    player: PlayerInput,
    scoring_format: ScoringFormat,
    mode: ScoringMode = ScoringMode.BALANCED
) -> int:
    """Apply format boost on top of base score"""
    base         = calc_base_score(player, mode)
    format_boost = FORMAT_BOOSTS[scoring_format].get(player.position.value, 0)
    return min(max(round(base + format_boost), 0), 99)

def calc_floor(player: PlayerInput, scoring_format: ScoringFormat) -> int:
    """
    Floor estimate — conservative downside.
    Uses volatility to determine how far below adjusted score.
    """
    balanced = calc_adjusted_score(player, scoring_format, ScoringMode.BALANCED)

    # Volatility determines floor spread
    if player.volatility == Volatility.LOW:
        deduction = 3
    elif player.volatility == Volatility.MEDIUM:
        deduction = 7
    else:
        deduction = 12

    # Weather makes floor worse
    if player.weather and player.weather != "Clear":
        deduction += 4

    # Questionable status makes floor worse
    if player.status == "questionable":
        deduction += 5

    # DST and K already have custom floor logic
    if player.position in [Position.DST, Position.K]:
        return calc_adjusted_score(player, scoring_format, ScoringMode.FLOOR)

    return max(balanced - deduction, 0)


def calc_ceiling(player: PlayerInput, scoring_format: ScoringFormat) -> int:
    """
    Ceiling estimate — optimistic upside.
    Uses volatility to determine how far above adjusted score.
    """
    balanced = calc_adjusted_score(player, scoring_format, ScoringMode.BALANCED)

    # Volatility determines ceiling spread
    if player.volatility == Volatility.LOW:
        boost = 4
    elif player.volatility == Volatility.MEDIUM:
        boost = 9
    else:
        boost = 15

    # Favorable matchup boosts ceiling more
    if player.oppRank and player.oppRank >= 25:
        boost += 4

    # Dome boosts kicker ceiling
    if player.isDome and player.position == Position.K:
        boost += 5

    # DST and K already have custom ceiling logic
    if player.position in [Position.DST, Position.K]:
        return calc_adjusted_score(player, scoring_format, ScoringMode.UPSIDE)

    return min(balanced + boost, 99)

def get_score_label(score: int) -> str:
    if score >= 80: return "Start"
    if score >= 65: return "Lean"
    return "Sit"

def get_score_color(score: int) -> str:
    if score >= 80: return "#22c55e"
    if score >= 65: return "#eab308"
    return "#ef4444"

def get_volatility_color(volatility: Volatility) -> str:
    return VOLATILITY_COLORS.get(volatility, "#eab308")

def build_explanation(
    player: PlayerInput,
    scoring_format: ScoringFormat,
    mode: ScoringMode = ScoringMode.BALANCED
) -> str:
    """Build natural language explanation for a player's score"""
    reasons = []
    pos     = player.position.value

    # DST explanation
    if player.position == Position.DST:
        if player.oppTotal and player.oppTotal <= 18:
            reasons.append(f"opponent is only implied to score {player.oppTotal} points")
        elif player.oppTotal and player.oppTotal >= 26:
            reasons.append(f"opponent is implied to score {player.oppTotal} points which hurts DST value")
        if player.oppRank and player.oppRank <= 8:
            reasons.append(f"facing a top-{player.oppRank} offense which is tough for DST")
        elif player.oppRank and player.oppRank >= 25:
            reasons.append(f"facing a bottom-{32 - player.oppRank + 1} offense which is favorable for DST")
        if player.trend.value == "up":
            reasons.append("trending up over recent weeks")
        if not reasons:
            return f"{player.name} has a neutral matchup this week."
        return f"{player.name} looks {'strong' if len(reasons) > 1 else 'decent'} due to {', and '.join(reasons)}."

    # Kicker explanation
    if player.position == Position.K:
        if player.teamTotal and player.teamTotal >= 26:
            reasons.append(f"his team is implied to score {player.teamTotal} points")
        if player.isDome:
            reasons.append("playing in a dome which eliminates weather risk")
        if player.weather and player.weather != "Clear":
            reasons.append(f"{player.weather.lower()} weather conditions hurt kicker value")
        if player.trend.value == "up":
            reasons.append("trending up recently")
        if not reasons:
            return f"{player.name} has a moderate outlook this week."
        return f"{player.name} projects well due to {', and '.join(reasons)}."

    # Vegas prop
    if player.vegasProp:
        if player.vegasProp >= 65:
            reasons.append(f"strong Vegas prop of {player.vegasProp} yards")
        elif player.vegasProp < 45:
            reasons.append(f"low Vegas prop of only {player.vegasProp} yards")

    # Team total
    if player.teamTotal:
        if player.teamTotal >= 26:
            reasons.append(f"team implied to score {player.teamTotal} points")
        elif player.teamTotal <= 18:
            reasons.append(f"team only implied to score {player.teamTotal} points")

    # Usage — granular if available
    if player.targetShare and player.targetShare >= 25:
        reasons.append(f"elite {player.targetShare}% target share")
    elif player.carryShare and player.carryShare >= 60:
        reasons.append(f"dominant {player.carryShare}% carry share")
    elif player.snapPct and player.snapPct >= 85:
        reasons.append(f"high {player.snapPct}% snap rate")
    elif player.usage == "High":
        reasons.append("high usage")
    elif player.usage == "Low":
        reasons.append("limited usage")

    # Trend + recent games
    if player.pointsLastThree:
        avg = sum(player.pointsLastThree) / len(player.pointsLastThree)
        if avg >= 20:
            reasons.append(f"averaging {avg:.1f} points over last 3 weeks")
        elif avg <= 8:
            reasons.append(f"struggling with only {avg:.1f} points over last 3 weeks")
    elif player.trend.value == "up":
        reasons.append("rising trend")
    elif player.trend.value == "down":
        reasons.append("declining trend")

    # Matchup
    if player.oppRank:
        if player.oppRank >= 25:
            reasons.append(f"very favorable matchup vs {player.opponent} (#{player.oppRank} defense)")
        elif player.oppRank <= 8:
            reasons.append(f"tough matchup vs {player.opponent} (#{player.oppRank} defense)")

    # Weather
    if player.weather and player.weather != "Clear":
        reasons.append(f"{player.weather.lower()} weather is a concern")

    # Format boost
    if scoring_format == ScoringFormat.PPR and pos in ["WR", "TE"]:
        reasons.append("PPR format boosts his value")
    elif scoring_format == ScoringFormat.STANDARD and pos in ["WR", "TE"]:
        reasons.append("standard scoring slightly limits his value")

    # Mode context
    if mode == ScoringMode.FLOOR:
        reasons.append("prioritizing safe floor")
    elif mode == ScoringMode.UPSIDE:
        reasons.append("targeting high upside")

    if not reasons:
        return "Stats are close — trust your gut on this one."

    joined = (
        reasons[0] if len(reasons) == 1
        else ", ".join(reasons[:-1]) + " and " + reasons[-1]
    )
    return f"{player.name} scores well due to {joined}."

def score_players(
    players: list[PlayerInput],
    scoring_format: ScoringFormat,
    mode: ScoringMode = ScoringMode.BALANCED,
) -> list[PlayerScore]:
    """Score and rank all players"""
    results = []

    for player in players:
        adjusted = calc_adjusted_score(player, scoring_format, mode)
        floor    = calc_floor(player, scoring_format)
        ceiling  = calc_ceiling(player, scoring_format)

        results.append(PlayerScore(
            id             = player.id,
            name           = player.name,
            position       = player.position.value,
            team           = player.team,
            opponent       = player.opponent,
            baseScore      = calc_base_score(player, mode),
            adjustedScore  = adjusted,
            scoreLabel     = get_score_label(adjusted),
            scoreColor     = get_score_color(adjusted),
            explanation    = build_explanation(player, scoring_format, mode),
            volatility     = player.volatility.value,
            volatilityColor = get_volatility_color(player.volatility),
            floor          = floor,
            ceiling        = ceiling,
        ))

    return sorted(results, key=lambda x: x.adjustedScore, reverse=True)