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

class Weather(str, Enum):
    CLEAR = "Clear"
    WIND  = "Wind"
    RAIN  = "Rain"
    SNOW  = "Snow"

class PlayerInput(BaseModel):
    id:               int
    name:             str
    position:         Position
    slot:             str
    team:             str
    opponent:         str
    vegasProp:        Optional[float] = None
    teamTotal:        Optional[float] = None
    oppTotal:         Optional[float] = None
    avgYards:         Optional[float] = None
    usage:            Optional[str]   = None
    trend:            Trend
    matchupDifficulty: MatchupDifficulty
    status:           str
    oppRank:          Optional[int]   = None
    oppPointsAllowed: Optional[float] = None
    snapPct:          Optional[float] = None
    targetShare:      Optional[float] = None
    carryShare:       Optional[float] = None
    volatility:       Volatility      = Volatility.MEDIUM
    isDome:           bool            = False
    weather:          Optional[str]   = None
    pointsLastThree:  list[float]     = []

class PlayerScore(BaseModel):
    id:             int
    name:           str
    position:       str
    team:           str
    opponent:       str
    baseScore:      int
    adjustedScore:  int
    scoreLabel:     str
    scoreColor:     str
    explanation:    str
    volatility:     str
    volatilityColor: str
    floor:          int
    ceiling:        int

class ScoreRequest(BaseModel):
    players:       list[PlayerInput]
    scoringFormat: ScoringFormat
    scoringMode:   ScoringMode = ScoringMode.BALANCED

class ScoreResponse(BaseModel):
    players:       list[PlayerScore]
    scoringFormat: str
    scoringMode:   str
    topPick:       str