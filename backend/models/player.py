from pydantic import BaseModel
from typing import Optional
from enum import Enum


class Position(str, Enum):
    QB  = "QB"
    RB  = "RB"
    WR  = "WR"
    TE  = "TE"
    DST = "DST"
    K   = "K"


class ScoringFormat(str, Enum):
    PPR      = "PPR"
    HALF     = "Half"
    STANDARD = "Standard"


class ScoringMode(str, Enum):
    BALANCED = "balanced"
    FLOOR    = "floor"
    UPSIDE   = "upside"


class MatchupDifficulty(str, Enum):
    EASY   = "Easy"
    MEDIUM = "Medium"
    HARD   = "Hard"


class Trend(str, Enum):
    UP      = "up"
    NEUTRAL = "neutral"
    DOWN    = "down"


class Volatility(str, Enum):
    LOW    = "Low"
    MEDIUM = "Medium"
    HIGH   = "High"


class LeagueScoring(BaseModel):
    """
    Per-league scoring multipliers fetched from Yahoo settings.
    These override the generic FORMAT_BOOSTS in scoring_service.py
    so the engine reflects each user's actual league rules.

    All values are points per unit:
      - passing_td_pts:    4.0 or 6.0 (most common split)
      - passing_yd_pts:    points per passing yard (e.g. 0.04 = 1pt per 25 yds)
      - rushing_td_pts:    typically 6.0
      - rushing_yd_pts:    points per rushing yard (e.g. 0.1 = 1pt per 10 yds)
      - reception_pts:     0 = standard, 0.5 = half PPR, 1.0 = full PPR
      - receiving_td_pts:  typically 6.0
      - receiving_yd_pts:  points per receiving yard
      - first_down_pts:    bonus per first down (0 in most leagues, 0.5-1.0 in some)
      - bonus_100_rush:    bonus for 100+ rush yard game (0 or 3 typically)
      - bonus_100_rec:     bonus for 100+ receiving yard game
      - bonus_300_pass:    bonus for 300+ passing yard game
    """
    # Passing
    passing_td_pts:   float = 4.0
    passing_yd_pts:   float = 0.04     # 1pt per 25 yards
    passing_int_pts:  float = -2.0

    # Rushing
    rushing_td_pts:   float = 6.0
    rushing_yd_pts:   float = 0.1      # 1pt per 10 yards

    # Receiving
    reception_pts:    float = 1.0      # Default PPR
    receiving_td_pts: float = 6.0
    receiving_yd_pts: float = 0.1

    # Bonuses (many leagues have none)
    first_down_pts:   float = 0.0
    bonus_100_rush:   float = 0.0
    bonus_100_rec:    float = 0.0
    bonus_300_pass:   float = 0.0
    bonus_400_pass:   float = 0.0

    # DST
    dst_sack_pts:     float = 1.0
    dst_int_pts:      float = 2.0
    dst_td_pts:       float = 6.0
    dst_safety_pts:   float = 2.0

    # Kicker
    fg_0_39_pts:      float = 3.0
    fg_40_49_pts:     float = 4.0
    fg_50_plus_pts:   float = 5.0
    pat_pts:          float = 1.0

    @property
    def reception_format(self) -> ScoringFormat:
        """Derive the ScoringFormat enum from reception_pts for backward compat."""
        if self.reception_pts >= 1.0:
            return ScoringFormat.PPR
        if self.reception_pts >= 0.5:
            return ScoringFormat.HALF
        return ScoringFormat.STANDARD

    @property
    def passing_td_boost(self) -> float:
        """
        Extra QB value from 6pt passing TDs vs standard 4pt.
        A QB throwing 2 TDs gets +4 pts in a 6pt league vs 4pt — significant.
        """
        return max(0.0, self.passing_td_pts - 4.0)

    @property
    def has_first_down_scoring(self) -> bool:
        return self.first_down_pts > 0

    @property
    def has_bonuses(self) -> bool:
        return any([
            self.bonus_100_rush > 0,
            self.bonus_100_rec > 0,
            self.bonus_300_pass > 0,
            self.bonus_400_pass > 0,
        ])


class PlayerInput(BaseModel):
    id:                 int
    name:               str
    position:           Position
    slot:               str
    team:               str
    opponent:           str
    passingYardsProp:   Optional[float] = None
    rushingYardsProp:   Optional[float] = None
    receivingYardsProp: Optional[float] = None
    pointsAllowedProp:  Optional[float] = None
    projectedFgProp:    Optional[float] = None
    teamTotal:          Optional[float] = None
    oppTotal:           Optional[float] = None
    avgYards:           Optional[float] = None
    usage:              Optional[str]   = None
    trend:              Trend
    matchupDifficulty:  MatchupDifficulty
    status:             str
    oppRank:            Optional[int]   = None
    oppPointsAllowed:   Optional[float] = None
    snapPct:            Optional[float] = None
    targetShare:        Optional[float] = None
    carryShare:         Optional[float] = None
    volatility:         Volatility      = Volatility.MEDIUM
    isDome:             bool            = False
    weather:            Optional[str]   = None
    pointsLastThree:    list[float]     = []


class PlayerScore(BaseModel):
    id:              int
    name:            str
    position:        str
    team:            str
    opponent:        str
    baseScore:       int
    adjustedScore:   int
    scoreLabel:      str
    scoreColor:      str
    explanation:     str
    volatility:      str
    volatilityColor: str
    floor:           int
    ceiling:         int


class ScoreRequest(BaseModel):
    players:        list[PlayerInput]
    scoringFormat:  ScoringFormat
    scoringMode:    ScoringMode    = ScoringMode.BALANCED
    leagueScoring:  Optional[LeagueScoring] = None   # If provided, overrides scoringFormat boosts


class ScoreResponse(BaseModel):
    players:       list[PlayerScore]
    scoringFormat: str
    scoringMode:   str
    topPick:       str