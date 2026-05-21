from models.player import (
    PlayerInput, PlayerScore, ScoringFormat, LeagueScoring,
    ScoringMode, Position, Volatility
)
from typing import Optional

# ─── Position-specific base weights ─────────────────────────────────────────
POSITION_WEIGHTS = {
    Position.QB: {
        "prop":      0.25,
        "teamTotal": 0.35,
        "usage":     0.20,
        "trend":     0.10,
        "matchup":   0.10,
    },
    Position.RB: {
        "prop":      0.30,
        "teamTotal": 0.20,
        "usage":     0.30,
        "trend":     0.10,
        "matchup":   0.10,
    },
    Position.WR: {
        "prop":      0.35,
        "teamTotal": 0.20,
        "usage":     0.25,
        "trend":     0.10,
        "matchup":   0.10,
    },
    Position.TE: {
        "prop":      0.35,
        "teamTotal": 0.15,
        "usage":     0.30,
        "trend":     0.10,
        "matchup":   0.10,
    },
    Position.K: {
        "prop":      0.40,
        "teamTotal": 0.35,
        "usage":     0.05,
        "trend":     0.10,
        "matchup":   0.10,
    },
    Position.DST: {
        "prop":      0.40,
        "teamTotal": 0.00,
        "usage":     0.00,
        "trend":     0.20,
        "matchup":   0.40,
    },
}

# ─── Mode adjustments ────────────────────────────────────────────────────────
MODE_ADJUSTMENTS = {
    ScoringMode.FLOOR: {
        "prop":      -0.10,
        "usage":     +0.10,
        "trend":     +0.05,
        "matchup":   -0.05,
        "teamTotal":  0.00,
    },
    ScoringMode.UPSIDE: {
        "prop":      +0.15,
        "usage":     -0.15,
        "matchup":   +0.05,
        "trend":     -0.05,
        "teamTotal":  0.00,
    },
    ScoringMode.BALANCED: {
        "prop":      0.00,
        "teamTotal": 0.00,
        "usage":     0.00,
        "trend":     0.00,
        "matchup":   0.00,
    },
}

# ─── Generic format boosts (fallback when no LeagueScoring provided) ─────────
# These are relative score bumps (out of 100), NOT raw fantasy points.
FORMAT_BOOSTS = {
    ScoringFormat.PPR:      { "WR": 4, "TE": 3, "RB": 2 },
    ScoringFormat.HALF:     { "WR": 2, "TE": 2, "RB": 1 },
    ScoringFormat.STANDARD: {},
}

# ─── Lookup maps ─────────────────────────────────────────────────────────────
USAGE_SCORES       = { "High": 100, "Medium": 60, "Low": 30 }
TREND_SCORES       = { "up": 100, "neutral": 60, "down": 20 }
WEATHER_ADJUSTMENTS = { "Clear": 0, "Wind": -4, "Rain": -3, "Snow": -6 }
VOLATILITY_COLORS  = {
    Volatility.LOW:    "#22c55e",
    Volatility.MEDIUM: "#eab308",
    Volatility.HIGH:   "#ef4444",
}


# ─── League scoring boost calculator ─────────────────────────────────────────

def calc_league_format_boost(
    player: PlayerInput,
    league_scoring: LeagueScoring,
) -> float:
    """
    Replace the generic FORMAT_BOOSTS with precise per-league score adjustments.

    We translate raw fantasy point differences (vs a 4pt TD / standard baseline)
    into score-scale adjustments (+/- out of 100) so they stay comparable
    with the existing base score range.

    Scale factor: ~1 raw fantasy point ≈ 1.5 score points (empirically tuned
    so a 2-TD 6pt-league QB gets ~+6 vs 4pt baseline, keeping scores meaningful).
    """
    SCALE = 1.5
    boost = 0.0
    pos   = player.position

    if pos == Position.QB:
        # 6pt passing TDs: +2 pts per TD vs 4pt. Avg QB ~1.5 TDs projected.
        boost += league_scoring.passing_td_boost * 1.5 * SCALE
        # 300-yd bonus: gives QBs extra ceiling in high-volume pass leagues
        if league_scoring.bonus_300_pass > 0:
            boost += league_scoring.bonus_300_pass * 0.4 * SCALE

    elif pos == Position.RB:
        # Reception pts for RBs (pass-catching backs gain a lot in PPR)
        boost += (league_scoring.reception_pts - 0.0) * 2.5 * SCALE   # avg 2.5 rec/game
        # First down bonus rewards workhorse backs heavily
        if league_scoring.has_first_down_scoring:
            boost += league_scoring.first_down_pts * 3.0 * SCALE       # ~3 FDs/game
        if league_scoring.bonus_100_rush > 0:
            boost += league_scoring.bonus_100_rush * 0.3 * SCALE        # 30% chance of 100+ game

    elif pos == Position.WR:
        # Receptions are the biggest WR lever
        boost += (league_scoring.reception_pts - 0.0) * 5.5 * SCALE   # avg 5.5 rec/game for WR1
        if league_scoring.has_first_down_scoring:
            boost += league_scoring.first_down_pts * 4.0 * SCALE
        if league_scoring.bonus_100_rec > 0:
            boost += league_scoring.bonus_100_rec * 0.25 * SCALE

    elif pos == Position.TE:
        # TEs are the biggest beneficiary of PPR — many only catch 3-5 passes
        boost += (league_scoring.reception_pts - 0.0) * 4.0 * SCALE
        if league_scoring.has_first_down_scoring:
            boost += league_scoring.first_down_pts * 3.5 * SCALE
        if league_scoring.bonus_100_rec > 0:
            boost += league_scoring.bonus_100_rec * 0.15 * SCALE

    elif pos == Position.K:
        # Better FG value for long kicks changes streaming decisions
        long_kick_bonus = (league_scoring.fg_50_plus_pts - 5.0)   # vs standard 5pt
        boost += long_kick_bonus * 0.3 * SCALE

    # DST scoring doesn't change much with format — skip

    return round(boost, 2)


# ─── Core helpers ─────────────────────────────────────────────────────────────

def get_position_prop(player: PlayerInput) -> float | None:
    if player.position == Position.QB:
        return player.passingYardsProp
    if player.position == Position.RB:
        return player.rushingYardsProp
    if player.position in [Position.WR, Position.TE]:
        return player.receivingYardsProp
    if player.position == Position.DST:
        return player.pointsAllowedProp
    if player.position == Position.K:
        return player.projectedFgProp
    return None


def get_prop_score(player: PlayerInput) -> float:
    prop = get_position_prop(player)
    if prop is None:
        return 50
    if player.position == Position.QB:
        return min((prop / 400) * 100, 100)
    if player.position == Position.RB:
        return min((prop / 120) * 100, 100)
    if player.position in [Position.WR, Position.TE]:
        return min((prop / 120) * 100, 100)
    if player.position == Position.DST:
        return max(0, 100 - (prop / 45 * 100))
    if player.position == Position.K:
        return min((prop / 4.0) * 100, 100)
    return 50


def get_opp_rank_adjustment(opp_rank: int | None) -> float:
    if opp_rank is None: return 0
    if opp_rank <= 8:    return -5
    if opp_rank <= 16:   return 0
    if opp_rank <= 24:   return 3
    return 6


def get_applied_weights(position: Position, mode: ScoringMode) -> dict:
    base        = dict(POSITION_WEIGHTS[position])
    adjustments = MODE_ADJUSTMENTS[mode]
    for key, adj in adjustments.items():
        if key in base:
            base[key] = max(0.0, base[key] + adj)
    total = sum(base.values())
    if total > 0:
        base = { k: v / total for k, v in base.items() }
    return base


# ─── Score calculations ───────────────────────────────────────────────────────

def calc_base_score(
    player: PlayerInput,
    mode:   ScoringMode = ScoringMode.BALANCED,
) -> int:
    weights    = get_applied_weights(player.position, mode)
    prop_score = get_prop_score(player)
    team_score = min((player.teamTotal / 35) * 100, 100) if player.teamTotal else 50

    # Usage score — hierarchy: snapPct > targetShare > carryShare > label
    if player.snapPct is not None:
        usage_score = min(player.snapPct, 100)
    elif player.targetShare is not None:
        usage_score = min(player.targetShare * 2.5, 100)
    elif player.carryShare is not None:
        usage_score = min(player.carryShare * 1.4, 100)
    else:
        usage_score = USAGE_SCORES.get(player.usage or "Medium", 50)

    # Trend score — blend label with recent actual output if available
    if player.pointsLastThree:
        avg_recent  = sum(player.pointsLastThree) / len(player.pointsLastThree)
        trend_score = (
            TREND_SCORES.get(player.trend.value, 60) * 0.5 +
            min((avg_recent / 30) * 100, 100) * 0.5
        )
    else:
        trend_score = TREND_SCORES.get(player.trend.value, 60)

    opp_rank_adj = get_opp_rank_adjustment(player.oppRank)
    weather_adj  = WEATHER_ADJUSTMENTS.get(player.weather or "Clear", 0)

    raw = (
        prop_score  * weights["prop"]      +
        team_score  * weights["teamTotal"] +
        usage_score * weights["usage"]     +
        trend_score * weights["trend"]
    ) + opp_rank_adj + weather_adj

    return min(round(raw), 99)


def calc_adjusted_score(
    player:         PlayerInput,
    scoring_format: ScoringFormat,
    mode:           ScoringMode           = ScoringMode.BALANCED,
    league_scoring: Optional[LeagueScoring] = None,
) -> int:
    base = calc_base_score(player, mode)

    if league_scoring:
        # Use precise per-league math
        format_boost = calc_league_format_boost(player, league_scoring)
    else:
        # Fall back to generic format boosts
        format_boost = FORMAT_BOOSTS[scoring_format].get(player.position.value, 0)

    return min(max(round(base + format_boost), 0), 99)


def calc_floor(
    player:         PlayerInput,
    scoring_format: ScoringFormat,
    league_scoring: Optional[LeagueScoring] = None,
) -> int:
    balanced = calc_adjusted_score(player, scoring_format, ScoringMode.BALANCED, league_scoring)
    if player.volatility == Volatility.LOW:
        deduction = 3
    elif player.volatility == Volatility.MEDIUM:
        deduction = 7
    else:
        deduction = 12
    if player.weather and player.weather != "Clear":
        deduction += 4
    if player.status == "questionable":
        deduction += 5
    if player.position in [Position.DST, Position.K]:
        return calc_adjusted_score(player, scoring_format, ScoringMode.FLOOR, league_scoring)
    return max(balanced - deduction, 0)


def calc_ceiling(
    player:         PlayerInput,
    scoring_format: ScoringFormat,
    league_scoring: Optional[LeagueScoring] = None,
) -> int:
    balanced = calc_adjusted_score(player, scoring_format, ScoringMode.BALANCED, league_scoring)
    if player.volatility == Volatility.LOW:
        boost = 4
    elif player.volatility == Volatility.MEDIUM:
        boost = 9
    else:
        boost = 15
    if player.oppRank and player.oppRank >= 25:
        boost += 4
    if player.position in [Position.DST, Position.K]:
        return calc_adjusted_score(player, scoring_format, ScoringMode.UPSIDE, league_scoring)
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
    player:         PlayerInput,
    scoring_format: ScoringFormat,
    mode:           ScoringMode           = ScoringMode.BALANCED,
    league_scoring: Optional[LeagueScoring] = None,
) -> str:
    reasons = []
    prop    = get_position_prop(player)

    # ── League-specific context ──────────────────────────────────────────────
    if league_scoring:
        if league_scoring.passing_td_pts >= 6.0 and player.position == Position.QB:
            reasons.append("your league's 6-point passing TDs boost his ceiling")
        if league_scoring.has_first_down_scoring and player.position in [Position.WR, Position.RB, Position.TE]:
            reasons.append(f"first down bonuses (+{league_scoring.first_down_pts}pt) reward his route style")
        if league_scoring.reception_pts >= 1.0 and player.position == Position.TE:
            reasons.append("full PPR scoring maximizes tight end reception value")
        if league_scoring.bonus_300_pass > 0 and player.position == Position.QB:
            reasons.append(f"+{league_scoring.bonus_300_pass}pt bonus if he hits 300 passing yards")

    # ── Position-specific prop explanations ─────────────────────────────────
    if player.position == Position.QB:
        if prop and prop >= 280:
            reasons.append(f"strong passing yards prop of {prop}")
        elif prop and prop < 220:
            reasons.append(f"low passing yards prop of only {prop}")

    elif player.position == Position.RB:
        if prop and prop >= 70:
            reasons.append(f"strong rushing yards prop of {prop}")
        elif prop and prop < 40:
            reasons.append(f"low rushing yards prop of only {prop}")

    elif player.position in [Position.WR, Position.TE]:
        if prop and prop >= 65:
            reasons.append(f"strong receiving yards prop of {prop}")
        elif prop and prop < 40:
            reasons.append(f"low receiving yards prop of only {prop}")

    elif player.position == Position.DST:
        if prop is not None:
            if prop <= 17:
                reasons.append(f"Vegas expects opponent to score only {prop} points")
            elif prop >= 25:
                reasons.append(f"Vegas expects opponent to score {prop} points which hurts DST value")
        if player.oppRank and player.oppRank >= 25:
            reasons.append(f"facing a bottom-tier offense (#{player.oppRank})")
        elif player.oppRank and player.oppRank <= 8:
            reasons.append(f"facing a top-tier offense (#{player.oppRank}) which is tough")
        if player.trend.value == "up":
            reasons.append("trending up over recent weeks")
        if not reasons:
            return f"{player.name} has a neutral matchup this week."
        return f"{player.name} looks {'strong' if len(reasons) > 1 else 'decent'} due to {', and '.join(reasons)}."

    elif player.position == Position.K:
        if prop and prop >= 2.5:
            reasons.append(f"projected {prop} field goals this week")
        elif prop and prop < 1.5:
            reasons.append(f"only projected {prop} field goals")
        if player.teamTotal and player.teamTotal >= 26:
            reasons.append(f"team implied to score {player.teamTotal} points")
        if player.isDome:
            reasons.append("playing in a dome")
        if player.weather and player.weather != "Clear":
            reasons.append(f"{player.weather.lower()} weather is a concern")
        if league_scoring and league_scoring.fg_50_plus_pts > 5.0:
            reasons.append(f"your league's {league_scoring.fg_50_plus_pts}pt long FG bonus rewards range")
        if not reasons:
            return f"{player.name} has a moderate outlook this week."
        return f"{player.name} projects well due to {', and '.join(reasons)}."

    # ── Skill position continued ─────────────────────────────────────────────
    if player.teamTotal:
        if player.teamTotal >= 26:
            reasons.append(f"team implied to score {player.teamTotal} points")
        elif player.teamTotal <= 18:
            reasons.append(f"team only implied to score {player.teamTotal} points")

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

    if player.oppRank:
        if player.oppRank >= 25:
            reasons.append(f"very favorable matchup vs {player.opponent} (#{player.oppRank} defense)")
        elif player.oppRank <= 8:
            reasons.append(f"tough matchup vs {player.opponent} (#{player.oppRank} defense)")

    if player.weather and player.weather != "Clear":
        reasons.append(f"{player.weather.lower()} weather is a concern")

    # Fall back to generic format label only if no league_scoring
    if not league_scoring:
        if scoring_format == ScoringFormat.PPR and player.position.value in ["WR", "TE"]:
            reasons.append("PPR format boosts his value")
        elif scoring_format == ScoringFormat.STANDARD and player.position.value in ["WR", "TE"]:
            reasons.append("standard scoring slightly limits his value")

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
    players:        list[PlayerInput],
    scoring_format: ScoringFormat,
    mode:           ScoringMode           = ScoringMode.BALANCED,
    league_scoring: Optional[LeagueScoring] = None,
) -> list[PlayerScore]:
    """
    Score a list of players.

    If league_scoring is provided, it overrides the generic FORMAT_BOOSTS
    and the engine reflects the actual rules of the user's Yahoo league.
    Pass it from the ScoreRequest when available.
    """
    results = []
    for player in players:
        adjusted = calc_adjusted_score(player, scoring_format, mode, league_scoring)
        floor    = calc_floor(player, scoring_format, league_scoring)
        ceiling  = calc_ceiling(player, scoring_format, league_scoring)
        results.append(PlayerScore(
            id              = player.id,
            name            = player.name,
            position        = player.position.value,
            team            = player.team,
            opponent        = player.opponent,
            baseScore       = calc_base_score(player, mode),
            adjustedScore   = adjusted,
            scoreLabel      = get_score_label(adjusted),
            scoreColor      = get_score_color(adjusted),
            explanation     = build_explanation(player, scoring_format, mode, league_scoring),
            volatility      = player.volatility.value,
            volatilityColor = get_volatility_color(player.volatility),
            floor           = floor,
            ceiling         = ceiling,
        ))
    return sorted(results, key=lambda x: x.adjustedScore, reverse=True)