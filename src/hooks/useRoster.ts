import { useState, useEffect } from 'react';
import { yahooApi } from '../services/api';
import { mockRoster, mockLeague } from '../data/mockData';
import type { Player } from '../types/index';

export interface RosterState {
  starters:      Player[];
  bench:         Player[];
  isRealData:    boolean;
  loading:       boolean;
  error:         string | null;
  leagueName:    string;
  scoringFormat: string;
  week:          number;
}

// Convert Yahoo roster player to our Player shape with defaults
const yahooPlayerToPlayer = (p: any, index: number): Player => ({
  id:                 index + 1000,
  name:               p.name        || 'Unknown',
  position:           p.position    || 'WR',
  slot:               p.slot        || p.position || 'BN',
  team:               p.team        || 'NFL',
  opponent:           'TBD',
  passingYardsProp:   null,
  rushingYardsProp:   null,
  receivingYardsProp: null,
  pointsAllowedProp:  null,
  projectedFgProp:    null,
  teamTotal:          null,
  oppTotal:           null,
  avgYards:           null,
  usage:              'Medium',
  trend:              'neutral',
  score:              50,
  status:             p.status === 'Q' ? 'questionable' :
                      p.status === 'O' ? 'out' : 'active',
  matchupDifficulty:  'Medium',
  isLocked:           false,
  oppRank:            null,
  oppPointsAllowed:   null,
  snapPct:            null,
  targetShare:        null,
  carryShare:         null,
  volatility:         'Medium',
  isDome:             false,
  weather:            'Clear',
  pointsLastThree:    [],
});

export const useRoster = (
  connected: boolean,
  sessionExpired: boolean,
  selectedLeagueKey: string,
) => {
  const [state, setState] = useState<RosterState>({
    starters:      mockRoster.starters,
    bench:         mockRoster.bench,
    isRealData:    false,
    loading:       false,
    error:         null,
    leagueName:    mockLeague.name,
    scoringFormat: mockLeague.scoringFormat,
    week:          mockLeague.week,
  });

  useEffect(() => {
    // No league selected or not connected — use mock data
    if (!connected || sessionExpired || !selectedLeagueKey) {
      setState((prev) => ({
        ...prev,
        starters:      mockRoster.starters,
        bench:         mockRoster.bench,
        isRealData:    false,
        loading:       false,
        error:         null,
        leagueName:    mockLeague.name,
        scoringFormat: mockLeague.scoringFormat,
        week:          mockLeague.week,
      }));
      return;
    }

    const fetchRealRoster = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        // Get the user's team in this league
        const teamData = await yahooApi.getMyTeam(selectedLeagueKey);
        if (!teamData.team) throw new Error('Could not find your team');

        const teamKey = teamData.team.team_key;

        // Get the full roster
        const rosterData = await yahooApi.getRoster(selectedLeagueKey, teamKey);
        if (!rosterData.players?.length) throw new Error('No players found');

        const allPlayers: Player[] = rosterData.players.map(
          (p: any, i: number) => yahooPlayerToPlayer(p, i)
        );

        // Split into starters and bench based on slot
        const starters = allPlayers.filter((p) =>
          !['BN', 'IR', 'NA'].includes(p.slot)
        );
        const bench = allPlayers.filter((p) =>
          ['BN', 'IR', 'NA'].includes(p.slot)
        );

        setState({
          starters,
          bench,
          isRealData:    true,
          loading:       false,
          error:         null,
          leagueName:    teamData.team.name || 'My Team',
          scoringFormat: 'PPR',
          week:          mockLeague.week,
        });

      } catch (err: any) {
        console.error('Failed to fetch real roster:', err);
        // Fall back to mock data gracefully
        setState({
          starters:      mockRoster.starters,
          bench:         mockRoster.bench,
          isRealData:    false,
          loading:       false,
          error:         'Could not load your Yahoo roster — showing mock data',
          leagueName:    mockLeague.name,
          scoringFormat: mockLeague.scoringFormat,
          week:          mockLeague.week,
        });
      }
    };

    fetchRealRoster();
  }, [connected, sessionExpired, selectedLeagueKey]);

  return state;
};