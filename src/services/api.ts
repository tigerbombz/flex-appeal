import axios from 'axios';
import type { Player } from '../types/index';
import type { ScoringFormat } from '../utils/scoring';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// ─── League scoring shape returned by /auth/yahoo/league-settings/:key ───────
export interface LeagueScoring {
  passing_td_pts:   number;
  passing_yd_pts:   number;
  passing_int_pts:  number;
  rushing_td_pts:   number;
  rushing_yd_pts:   number;
  reception_pts:    number;
  receiving_td_pts: number;
  receiving_yd_pts: number;
  first_down_pts:   number;
  bonus_100_rush:   number;
  bonus_100_rec:    number;
  bonus_300_pass:   number;
  bonus_400_pass:   number;
  dst_sack_pts:     number;
  dst_int_pts:      number;
  dst_td_pts:       number;
  dst_safety_pts:   number;
  fg_0_39_pts:      number;
  fg_40_49_pts:     number;
  fg_50_plus_pts:   number;
  pat_pts:          number;
}

export interface LeagueSettingsResponse {
  league_key:          string;
  scoring:             LeagueScoring;
  reception_format:    string;
  has_6pt_passing_td:  boolean;
  has_first_downs:     boolean;
  has_bonuses:         boolean;
}

// ─── Cache for league settings — fetch once per session per league ────────────
// Stored in localStorage so it persists across page refreshes until manually cleared.
const LEAGUE_SETTINGS_CACHE_KEY = 'snapdecision_league_settings';
const LEAGUE_SETTINGS_TTL_MS    = 1000 * 60 * 60 * 6; // 6 hours

function getCachedLeagueSettings(leagueKey: string): LeagueSettingsResponse | null {
  try {
    const raw = localStorage.getItem(`${LEAGUE_SETTINGS_CACHE_KEY}_${leagueKey}`);
    if (!raw) return null;
    const { data, cachedAt } = JSON.parse(raw);
    if (Date.now() - cachedAt > LEAGUE_SETTINGS_TTL_MS) {
      localStorage.removeItem(`${LEAGUE_SETTINGS_CACHE_KEY}_${leagueKey}`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedLeagueSettings(leagueKey: string, data: LeagueSettingsResponse): void {
  try {
    localStorage.setItem(
      `${LEAGUE_SETTINGS_CACHE_KEY}_${leagueKey}`,
      JSON.stringify({ data, cachedAt: Date.now() })
    );
  } catch {
    // localStorage full or unavailable — just skip caching
  }
}

// ─── Odds ─────────────────────────────────────────────────────────────────────
export const oddsApi = {
  getHealth: async () => {
    const res = await api.get('/api/odds/health');
    return res.data;
  },
  getEvents: async () => {
    const res = await api.get('/api/odds/events');
    return res.data;
  },
  getTotals: async () => {
    const res = await api.get('/api/odds/totals');
    return res.data;
  },
  getPlayerProps: async (eventId: string) => {
    const res = await api.get(`/api/odds/props/${eventId}`);
    return res.data;
  },
};

// ─── Scoring ──────────────────────────────────────────────────────────────────
export const scoringApi = {
  scorePlayers: async (
    players:        Player[],
    scoringFormat:  ScoringFormat,
    scoringMode:    string = 'balanced',
    leagueScoring?: LeagueScoring,        // Pass for personalized league math
  ) => {
    const res = await api.post('/api/scoring/score', {
      players,
      scoringFormat,
      scoringMode,
      ...(leagueScoring ? { leagueScoring } : {}),
    });
    return res.data;
  },
  explainPlayer: async (
    playerId:       number,
    players:        Player[],
    scoringFormat:  ScoringFormat,
    scoringMode:    string = 'balanced',
    leagueScoring?: LeagueScoring,
  ) => {
    const res = await api.post(`/api/scoring/explain/${playerId}`, {
      players,
      scoringFormat,
      scoringMode,
      ...(leagueScoring ? { leagueScoring } : {}),
    });
    return res.data;
  },
};

// ─── Players ──────────────────────────────────────────────────────────────────
export const playerApi = {
  searchPlayers: async (search?: string, position?: string, limit = 100) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (position && position !== 'ALL') params.append('position', position);
    params.append('limit', limit.toString());
    const res = await api.get(`/api/players/nfl?${params.toString()}`);
    return res.data;
  },
  getPlayerById: async (playerId: string) => {
    const res = await api.get(`/api/players/nfl/${playerId}`);
    return res.data;
  },
};

// ─── Lineup ───────────────────────────────────────────────────────────────────
export const lineupApi = {
  evaluate: async (
    starters:       Player[],
    bench:          Player[],
    scoringFormat:  ScoringFormat,
    scoringMode:    string = 'balanced',
    week:           number = 14,
    season:         string = '2025',
    leagueKey?:     string,               // Used to resolve team_id server-side
    leagueScoring?: LeagueScoring,
  ) => {
    const res = await api.post('/api/lineup/evaluate', {
      starters,
      bench,
      scoringFormat,
      scoringMode,
      week,
      season,
      league_key: leagueKey,
      ...(leagueScoring ? { leagueScoring } : {}),
    });
    return res.data;
  },
  evaluateFlex: async (
    candidates:     Player[],
    scoringFormat:  ScoringFormat,
    scoringMode:    string = 'balanced',
    leagueScoring?: LeagueScoring,
  ) => {
    const res = await api.post('/api/lineup/flex', {
      candidates,
      scoringFormat,
      scoringMode,
      ...(leagueScoring ? { leagueScoring } : {}),
    });
    return res.data;
  },
};

// ─── Yahoo ────────────────────────────────────────────────────────────────────
export const yahooApi = {
  getStatus: async () => {
    const res = await api.get('/auth/yahoo/status');
    return res.data;
  },
  getLeagues: async () => {
    const res = await api.get('/auth/yahoo/leagues');
    return res.data;
  },
  getMyTeam: async (leagueKey: string) => {
    const res = await api.get(`/auth/yahoo/team/${leagueKey}`);
    return res.data;
  },
  getRoster: async (leagueKey: string, teamKey: string) => {
    const res = await api.get(`/auth/yahoo/roster/${leagueKey}/${teamKey}`);
    return res.data;
  },
  connectUrl: () => `${API_URL}/auth/yahoo/login`,
  getPendingTrades: async () => {
    const res = await api.get('/auth/yahoo/trades/pending');
    return res.data;
  },
  getFreeAgents: async (leagueKey: string, position = '', count = 25) => {
    const params = new URLSearchParams();
    if (position) params.append('position', position);
    params.append('count', count.toString());
    const res = await api.get(`/auth/yahoo/free-agents/${leagueKey}?${params.toString()}`);
    return res.data;
  },

  /**
   * Fetch league scoring settings from Yahoo.
   * Results are cached in localStorage for 6 hours — Yahoo settings
   * almost never change mid-season so this is safe and fast.
   */
  getLeagueSettings: async (leagueKey: string): Promise<LeagueSettingsResponse> => {
    const cached = getCachedLeagueSettings(leagueKey);
    if (cached) return cached;

    const res  = await api.get(`/auth/yahoo/league-settings/${leagueKey}`);
    const data = res.data as LeagueSettingsResponse;
    setCachedLeagueSettings(leagueKey, data);
    return data;
  },

  /** Clear cached settings for a league (call after reconnecting Yahoo) */
  clearLeagueSettingsCache: (leagueKey?: string) => {
    if (leagueKey) {
      localStorage.removeItem(`${LEAGUE_SETTINGS_CACHE_KEY}_${leagueKey}`);
    } else {
      // Clear all cached league settings
      Object.keys(localStorage)
        .filter(k => k.startsWith(LEAGUE_SETTINGS_CACHE_KEY))
        .forEach(k => localStorage.removeItem(k));
    }
  },
};

// ─── Backtest ─────────────────────────────────────────────────────────────────
export const backtestApi = {
  getSummary: async (season: string = '2025', leagueKey?: string) => {
    const params = new URLSearchParams({ season });
    if (leagueKey) params.append('league_key', leagueKey);
    const res = await api.get(`/api/backtest/summary?${params.toString()}`);
    return res.data;
  },

  getHistory: async (season: string = '2025', week?: number, leagueKey?: string) => {
    const params = new URLSearchParams({ season });
    if (week) params.append('week', week.toString());
    if (leagueKey) params.append('league_key', leagueKey);
    const res = await api.get(`/api/backtest/history?${params.toString()}`);
    return res.data;
  },

  /**
   * Sync actual points from Yahoo for a completed week.
   * Call this once after Monday Night Football finishes
   * (or Tuesday morning when stats are finalized).
   *
   * This is the core of backtest accuracy — one tap replaces
   * 15+ manual entries and also sets was_followed automatically.
   */
  syncWeek: async (leagueKey: string, week: number, season: string = '2025') => {
    const res = await api.post('/api/backtest/sync-week', {
      league_key: leagueKey,
      week,
      season,
    });
    return res.data;
  },

  /** Manual single-player override (for correcting bad Yahoo data) */
  logActualPoints: async (
    leagueKey:  string,
    week:       number,
    season:     string,
    playerKey:  string,
    actualPts:  number,
  ) => {
    const res = await api.post('/api/backtest/actual-points', {
      league_key: leagueKey,
      week,
      season,
      player_key: playerKey,
      actual_pts: actualPts,
    });
    return res.data;
  },

  /** Bulk manual override for multiple players at once */
  bulkLogActualPoints: async (
    leagueKey: string,
    week:      number,
    season:    string,
    players:   { player_key: string; actual_pts: number }[],
  ) => {
    const res = await api.post('/api/backtest/actual-points/bulk', {
      league_key: leagueKey,
      week,
      season,
      players,
    });
    return res.data;
  },
};

// ─── Stats ────────────────────────────────────────────────────────────────────
export const statsApi = {
  getCurrentSeason: async () => {
    const res = await api.get('/api/stats/current-season');
    return res.data;
  },
  getPointsLastThree: async (
    playerId: string, season: string, currentWeek: number, scoring: string = 'PPR'
  ) => {
    const res = await api.post('/api/stats/points-last-three', {
      player_id: playerId, season, current_week: currentWeek, scoring,
    });
    return res.data;
  },
  getBulkPointsLastThree: async (
    playerIds: string[], season: string, currentWeek: number, scoring: string = 'PPR'
  ) => {
    const res = await api.post('/api/stats/points-last-three/bulk', {
      player_ids: playerIds, season, current_week: currentWeek, scoring,
    });
    return res.data;
  },
  getWeekStats: async (season: string, week: number) => {
    const res = await api.get(`/api/stats/week/${season}/${week}`);
    return res.data;
  },
  getTopPerformers: async (
    season: string, week: number, position: string, scoring: string = 'PPR', limit: number = 20
  ) => {
    const res = await api.get(
      `/api/stats/top/${season}/${week}/${position}?scoring=${scoring}&limit=${limit}`
    );
    return res.data;
  },
};

// ─── AI ───────────────────────────────────────────────────────────────────────
export const aiApi = {
  analyzeTrade: async (payload: {
    starters:        any[];
    bench:           any[];
    giving_players:  any[];
    getting_players: any[];
    scoring_format:  string;
    scoring_mode:    string;
    league_scoring?: LeagueScoring;
    user_notes?:     string;
  }) => {
    const res = await api.post('/api/ai/trade', payload);
    return res.data;
  },
  analyzeWaiver: async (payload: {
    starters:          any[];
    bench:             any[];
    available_players: any[];
    scoring_format:    string;
    scoring_mode:      string;
    week:              number;
    league_scoring?:   LeagueScoring;
  }) => {
    const res = await api.post('/api/ai/waiver', payload);
    return res.data;
  },
  getStatus: async () => {
    const res = await api.get('/api/ai/status');
    return res.data;
  },
};

export default api;