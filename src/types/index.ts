export interface Player {
  id: number;
  name: string;
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'DST' | 'K';
  slot: string;
  team: string;
  opponent: string;
  vegasProp: number | null;
  teamTotal: number | null;
  avgYards: number | null;
  usage: 'High' | 'Medium' | 'Low' | null;
  trend: 'up' | 'neutral' | 'down';
  score: number;
  status: 'active' | 'questionable' | 'out';
}

export interface League {
  name: string;
  scoringFormat: 'PPR' | 'Half' | 'Standard';
  week: number;
  record: string;
  standing: string;
  totalTeams: number;
  pointsFor: number;
  pointsAgainst: number;
}

export interface LineupEvaluation {
  slot: string;
  current: Player;
  suggestion: Player;
  recommendation: 'swap' | 'keep';
  reason: string;
}

export interface WeeklyMatchup {
  week: number;
  opponent: string;
  result: 'W' | 'L';
  pointsFor: number;
  pointsAgainst: number;
}

export interface Roster {
  starters: Player[];
  bench: Player[];
}

export interface CurrentMatchup {
  week: number;
  opponent: string;
  opponentRecord: string;
  opponentProjected: number;
  myProjected: number;
}