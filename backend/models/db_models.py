from sqlalchemy import (
    Column, Integer, String, Float, Boolean,
    DateTime, ForeignKey, JSON, Text
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id                = Column(Integer, primary_key=True, index=True)
    yahoo_id          = Column(String, unique=True, index=True, nullable=True)
    display_name      = Column(String, nullable=True)
    email             = Column(String, nullable=True)
    access_token      = Column(Text, nullable=True)
    refresh_token     = Column(Text, nullable=True)
    token_expires_at  = Column(DateTime, nullable=True)
    scoring_format    = Column(String, default="PPR")
    scoring_mode      = Column(String, default="balanced")
    created_at        = Column(DateTime, server_default=func.now())
    updated_at        = Column(DateTime, server_default=func.now(), onupdate=func.now())

    leagues           = relationship("League", back_populates="user", cascade="all, delete-orphan")

class League(Base):
    __tablename__ = "leagues"

    id                = Column(Integer, primary_key=True, index=True)
    user_id           = Column(Integer, ForeignKey("users.id"), nullable=False)
    yahoo_league_key  = Column(String, index=True)
    name              = Column(String)
    season            = Column(String)
    scoring_format    = Column(String)
    num_teams         = Column(Integer)
    current_week      = Column(Integer)
    is_active         = Column(Boolean, default=True)
    created_at        = Column(DateTime, server_default=func.now())
    updated_at        = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user              = relationship("User", back_populates="leagues")
    teams             = relationship("Team", back_populates="league", cascade="all, delete-orphan")

class Team(Base):
    __tablename__ = "teams"

    id                = Column(Integer, primary_key=True, index=True)
    league_id         = Column(Integer, ForeignKey("leagues.id"), nullable=False)
    user_id           = Column(Integer, ForeignKey("users.id"), nullable=False)
    yahoo_team_key    = Column(String, index=True)
    name              = Column(String)
    wins              = Column(Integer, default=0)
    losses            = Column(Integer, default=0)
    points_for        = Column(Float, default=0.0)
    points_against    = Column(Float, default=0.0)
    waiver_priority   = Column(Integer, nullable=True)
    created_at        = Column(DateTime, server_default=func.now())
    updated_at        = Column(DateTime, server_default=func.now(), onupdate=func.now())

    league            = relationship("League", back_populates="teams")
    roster_players    = relationship("RosterPlayer", back_populates="team", cascade="all, delete-orphan")
    lineup_evals      = relationship("LineupEvaluation", back_populates="team", cascade="all, delete-orphan")
    weekly_matchups   = relationship("WeeklyMatchup", back_populates="team", cascade="all, delete-orphan")

class RosterPlayer(Base):
    __tablename__ = "roster_players"

    id                = Column(Integer, primary_key=True, index=True)
    team_id           = Column(Integer, ForeignKey("teams.id"), nullable=False)
    yahoo_player_key  = Column(String, index=True)
    name              = Column(String)
    position          = Column(String)
    slot              = Column(String)
    nfl_team          = Column(String)
    opponent          = Column(String, nullable=True)
    status            = Column(String, default="active")
    is_starter        = Column(Boolean, default=False)
    week              = Column(Integer)
    season            = Column(String)
    created_at        = Column(DateTime, server_default=func.now())
    updated_at        = Column(DateTime, server_default=func.now(), onupdate=func.now())

    team              = relationship("Team", back_populates="roster_players")

class PlayerStat(Base):
    __tablename__ = "player_stats"

    id                = Column(Integer, primary_key=True, index=True)
    yahoo_player_key  = Column(String, index=True)
    week              = Column(Integer)
    season            = Column(String)
    points_scored     = Column(Float, nullable=True)
    vegas_prop        = Column(Float, nullable=True)
    team_total        = Column(Float, nullable=True)
    opp_total         = Column(Float, nullable=True)
    snap_pct          = Column(Float, nullable=True)
    target_share      = Column(Float, nullable=True)
    carry_share       = Column(Float, nullable=True)
    opp_rank          = Column(Integer, nullable=True)
    created_at        = Column(DateTime, server_default=func.now())

class LineupEvaluation(Base):
    __tablename__ = "lineup_evaluations"

    id                    = Column(Integer, primary_key=True, index=True)
    team_id               = Column(Integer, ForeignKey("teams.id"), nullable=False)
    week                  = Column(Integer)
    season                = Column(String)
    slot                  = Column(String)
    starter_player_key    = Column(String)
    suggested_player_key  = Column(String, nullable=True)
    recommendation        = Column(String)
    starter_score         = Column(Float)
    suggestion_score      = Column(Float, nullable=True)
    scoring_format        = Column(String)
    scoring_mode          = Column(String)
    reason                = Column(Text)
    was_followed          = Column(Boolean, nullable=True)
    starter_actual_pts    = Column(Float, nullable=True)
    suggestion_actual_pts = Column(Float, nullable=True)
    created_at            = Column(DateTime, server_default=func.now())

    team                  = relationship("Team", back_populates="lineup_evals")

class WeeklyMatchup(Base):
    __tablename__ = "weekly_matchups"

    id                = Column(Integer, primary_key=True, index=True)
    team_id           = Column(Integer, ForeignKey("teams.id"), nullable=False)
    week              = Column(Integer)
    season            = Column(String)
    opponent_name     = Column(String)
    result            = Column(String, nullable=True)
    points_for        = Column(Float, nullable=True)
    points_against    = Column(Float, nullable=True)
    created_at        = Column(DateTime, server_default=func.now())

    team              = relationship("Team", back_populates="weekly_matchups")