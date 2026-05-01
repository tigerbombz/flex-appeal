import axios from 'axios';
import type { Player } from '../types/index';
import type { ScoringFormat } from '../utils/scoring';

const api = axios.create({
  baseURL: 'http://localhost:8000',
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
    const res = await api.post('/api/scoring/score', {
      players,
      scoringFormat,
    });
    return res.data;
  },

  explainPlayer: async (playerId: number, players: Player[], scoringFormat: ScoringFormat) => {
    const res = await api.post(`/api/scoring/explain/${playerId}`, {
      players,
      scoringFormat,
    });
    return res.data;
  },
};

export default api;