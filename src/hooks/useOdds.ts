import { useState, useEffect } from 'react';
import { oddsApi } from '../services/api';

export interface OddsEvent {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
}

export interface GameTotal {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: any[];
}

export const useNflEvents = () => {
  const [events, setEvents] = useState<OddsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await oddsApi.getEvents();
        setEvents(data.events);
        setLastUpdated(data.last_updated);
      } catch (err) {
        setError('Failed to fetch NFL events');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { events, loading, error, lastUpdated };
};

export const useGameTotals = () => {
  const [games, setGames] = useState<GameTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await oddsApi.getTotals();
        setGames(data.games);
        setLastUpdated(data.last_updated);
      } catch (err) {
        setError('Failed to fetch game totals');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { games, loading, error, lastUpdated };
};