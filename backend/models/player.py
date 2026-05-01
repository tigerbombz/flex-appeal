from pydantic import BaseModel
from typing import Optional
from enum import Enum

class Position(str, Enum):
    QB = "QB"
    RB = "RB"
    WR = "WR"
    TE = "TE"
    DST = "DST"
    K = "K"

class ScoringFormat(str, Enum):
    PPR = "PPR"
    HALF = "Half"
    STANDARD = "Standard"

class MatchupDifficulty(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"

class Trend(str, Enum):
    UP = "up"
    NEUTRAL = "neutral"
    DOWN = "down"

class PlayerInput(BaseModel):
    id: int
    name: str
    position: Position
    team: str
    opponent: str
    vegasProp: Optional[float] = None
    teamTotal: Optional[float] = None
    avgYards: Optional[float] = None
    usage: Optional[str] = None
    trend: Trend
    matchupDifficulty: MatchupDifficulty
    status: str

class PlayerScore(BaseModel):
    id: int
    name: str
    position: str
    team: str
    opponent: str
    baseScore: int
    adjustedScore: int
    scoreLabel: str
    scoreColor: str
    explanation: str

class ScoreRequest(BaseModel):
    players: list[PlayerInput]
    scoringFormat: ScoringFormat

class ScoreResponse(BaseModel):
    players: list[PlayerScore]
    scoringFormat: str
    topPick: str