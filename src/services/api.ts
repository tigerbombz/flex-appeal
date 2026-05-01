import axios from 'axios';
import type { Player } from '../types/index';
import type { ScoringFormat } from '../utils/scoring';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

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

export const scoringApi = {
  scorePlayers: async (players: Player[], scoringFormat: ScoringFormat) => {
    const res = await api.post('/api/scoring/score', { players, scoringFormat });
    return res.data;
  },
  explainPlayer: async (playerId: number, players: Player[], scoringFormat: ScoringFormat) => {
    const res = await api.post(`/api/scoring/explain/${playerId}`, { players, scoringFormat });
    return res.data;
  },
};

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
};

export default api;