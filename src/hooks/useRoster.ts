import { useState, useEffect } from 'react';
import { yahooApi, statsApi } from '../services/api';
import type { LeagueScoring } from '../services/api';
import { mockRoster, mockLeague } from '../data/mockData';
import type { Player } from '../types/index';

export interface RosterState {
  starters:       Player[];
  bench:          Player[];
  isRealData:     boolean;
  loading:        boolean;
  error:          string | null;
  leagueName:     string;
  scoringFormat:  string;
  week:           number;
  season:         string;
  leagueKey:      string;
  leagueScoring:  LeagueScoring | null;   // null until fetched; consumers pass to scoring engine
}

const yahooPlayerToPlayer = (p: any, index: number): Player => ({
  id:                 index + 1000,
  name:               p.name     || 'Unknown',
  position:           p.position || 'WR',
  slot:               p.slot     || p.position || 'BN',
  team:               p.team     || 'NFL',
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

async function enrichWithStats(
  players:  Player[],
  season:   string,
  week:     number,
  scoring:  string,
): Promise<Player[]> {
  if (week <= 0) return players;
  try {
    const playerIds = players.map((p) => String(p.id));
    const data      = await statsApi.getBulkPointsLastThree(playerIds, season, week, scoring);
    return players.map((player) => {
      const stats = data.results?.[String(player.id)];
      if (stats?.points_last_three?.length) {
        return { ...player, pointsLastThree: stats.points_last_three };
      }
      return player;
    });
  } catch {
    return players;
  }
}

const MOCK_STATE: RosterState = {
  starters:      mockRoster.starters,
  bench:         mockRoster.bench,
  isRealData:    false,
  loading:       false,
  error:         null,
  leagueName:    mockLeague.name,
  scoringFormat: mockLeague.scoringFormat,
  week:          mockLeague.week,
  season:        '2025',
  leagueKey:     '',
  leagueScoring: null,
};

export const useRoster = (
  connected:         boolean,
  sessionExpired:    boolean,
  selectedLeagueKey: string,
  scoringFormat:     string = 'PPR',
) => {
  const [state, setState] = useState<RosterState>(MOCK_STATE);

  useEffect(() => {
    if (!connected || sessionExpired || !selectedLeagueKey) {
      setState(MOCK_STATE);
      return;
    }

    const fetchRealRoster = async () => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        // 1. Season info
        let activeSeason = '2025';
        let activeWeek   = 0;
        try {
          const seasonInfo = await statsApi.getCurrentSeason();
          activeSeason     = seasonInfo.season;
          activeWeek       = seasonInfo.current_week;
        } catch {
          console.log('Could not fetch season info — using defaults');
        }

        // 2. Team + roster
        const teamData = await yahooApi.getMyTeam(selectedLeagueKey);
        if (!teamData.team) throw new Error('Could not find your team');

        const teamKey    = teamData.team.team_key;
        const rosterData = await yahooApi.getRoster(selectedLeagueKey, teamKey);
        if (!rosterData.players?.length) throw new Error('No players found');

        let allPlayers: Player[] = rosterData.players.map(
          (p: any, i: number) => yahooPlayerToPlayer(p, i)
        );

        // 3. Enrich with Sleeper stats (last 3 weeks points)
        allPlayers = await enrichWithStats(allPlayers, activeSeason, activeWeek, scoringFormat);

        // 4. League scoring settings — cached in localStorage, fast after first load
        //    This is what personalizes the engine to each user's specific league rules
        let leagueScoring: LeagueScoring | null = null;
        try {
          const settings = await yahooApi.getLeagueSettings(selectedLeagueKey);
          leagueScoring  = settings.scoring;
        } catch {
          console.log('Could not fetch league settings — engine will use format defaults');
        }

        const starters = allPlayers.filter((p) => !['BN', 'IR', 'NA'].includes(p.slot));
        const bench    = allPlayers.filter((p) =>  ['BN', 'IR', 'NA'].includes(p.slot));

        setState({
          starters,
          bench,
          isRealData:    true,
          loading:       false,
          error:         null,
          leagueName:    teamData.team.name || 'My Team',
          scoringFormat,
          week:          activeWeek || mockLeague.week,
          season:        activeSeason,
          leagueKey:     selectedLeagueKey,
          leagueScoring,
        });

      } catch (err: any) {
        console.error('Failed to fetch real roster:', err);
        setState({
          ...MOCK_STATE,
          error: 'Could not load your Yahoo roster — showing mock data',
        });
      }
    };

    fetchRealRoster();
  }, [connected, sessionExpired, selectedLeagueKey, scoringFormat]);

  return state;
};