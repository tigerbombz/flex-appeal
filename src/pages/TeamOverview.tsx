import {
  Box,
  Typography,
  Button,
  Divider,
  Skeleton,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import BoltIcon           from '@mui/icons-material/Bolt';
import CompareArrowsIcon  from '@mui/icons-material/CompareArrows';
import LinkIcon           from '@mui/icons-material/Link';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import RefreshIcon        from '@mui/icons-material/Refresh';
import { useState, useEffect } from 'react';
import PlayerCard         from '../components/PlayerCard';
import FreshnessBadge     from '../components/FreshnessBadge';
import MatchHistoryChart  from '../components/MatchHistoryChart';
import { mockCurrentMatchup } from '../data/mockData';
import { useNflEvents }   from '../hooks/useOdds';
import { useYahooStatus, useYahooLeagues } from '../hooks/useYahoo';
import { useRoster }      from '../hooks/useRoster';
import { yahooApi }       from '../services/api';
import NflScheduleCarousel from '../components/NflScheduleCarousel';

interface Props {
  onNavigate:     (tab: number) => void;
  selectedLeague: string;
  onChangeLeague: (key: string) => void;
}

interface Matchup {
  week:                number;
  status:              string;
  my_team:             string;
  my_projected:        number;
  my_actual:           number;
  my_record:           string;
  opponent:            string;
  opponent_projected:  number;
  opponent_actual:     number;
  opponent_record:     string;
}

const TeamOverview = ({ onNavigate, selectedLeague, onChangeLeague }: Props) => {
  const theme     = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const { weeks, loading: eventsLoading, error: eventsError, lastUpdated } = useNflEvents();
  const { connected, loading: yahooLoading, sessionExpired, disconnect }    = useYahooStatus();
  const { leagues, loading: leaguesLoading } = useYahooLeagues(connected, sessionExpired);

  const roster = useRoster(connected, sessionExpired, selectedLeague);

  // Matchup state — real Yahoo data when connected, mock as fallback
  const [matchup, setMatchup]               = useState<Matchup | null>(null);
  const [matchupLoading, setMatchupLoading] = useState(false);

  useEffect(() => {
    if (!connected || sessionExpired || !selectedLeague) {
      setMatchup(null);
      return;
    }

    const fetchMatchup = async () => {
      setMatchupLoading(true);
      try {
        const data = await yahooApi.getMatchup(selectedLeague);
        setMatchup(data?.matchup ?? null);
      } catch {
        setMatchup(null);
      } finally {
        setMatchupLoading(false);
      }
    };

    fetchMatchup();
  }, [connected, sessionExpired, selectedLeague]);

  // Derive display values — real matchup if available, mock fallback
  const displayMatchup = matchup ?? null;
  const opponentName       = displayMatchup?.opponent        ?? mockCurrentMatchup.opponent;
  const opponentRecord     = displayMatchup?.opponent_record ?? mockCurrentMatchup.opponentRecord;
  const myProjected        = displayMatchup?.my_projected    ?? mockCurrentMatchup.myProjected;
  const opponentProjected  = displayMatchup?.opponent_projected ?? mockCurrentMatchup.opponentProjected;
  const isLiveOrCompleted  = displayMatchup?.status === 'postevent' || displayMatchup?.status === 'midevent';

  return (
    <Box sx={{ p: 2 }}>

      {/* League header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {roster.leagueName}
            </Typography>
            {roster.isRealData ? (
              <Chip
                label="Live"
                size="small"
                sx={{ fontSize: 10, height: 20, bgcolor: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', fontWeight: 700 }}
              />
            ) : (
              <Chip
                label="Mock Data"
                size="small"
                sx={{ fontSize: 10, height: 20, bgcolor: '#eab30820', color: '#eab308', border: '1px solid #eab30840', fontWeight: 700 }}
              />
            )}
          </Box>
          <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>
            {roster.scoringFormat} · Week {roster.week}
            {roster.leagueScoring && (
              <Box component="span" sx={{ ml: 1, color: 'primary.main', fontWeight: 600 }}>
                · League rules active
              </Box>
            )}
          </Typography>
        </Box>
        <FreshnessBadge lastUpdated={lastUpdated} loading={eventsLoading} />
      </Box>

      {/* Roster error */}
      {roster.error && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: 13 }}>
          {roster.error}
        </Alert>
      )}

      {/* Yahoo not connected */}
      {!yahooLoading && !connected && (
        <Box
          sx={{
            bgcolor:      'background.paper',
            border:       '1px solid',
            borderColor:  'divider',
            borderRadius: 3,
            px:           2,
            py:           2,
            mb:           2,
            display:      'flex',
            justifyContent: 'space-between',
            alignItems:   'center',
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Connect Yahoo Fantasy</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
              Pull your real roster and league settings
            </Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<LinkIcon />}
            onClick={() => window.location.href = yahooApi.connectUrl()}
            sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            Connect Yahoo
          </Button>
        </Box>
      )}

      {/* Yahoo session expired */}
      {connected && sessionExpired && (
        <Box
          sx={{
            bgcolor:      '#eab30815',
            border:       '1px solid #eab30840',
            borderRadius: 3,
            px:           2,
            py:           1.5,
            mb:           2,
            display:      'flex',
            justifyContent: 'space-between',
            alignItems:   'center',
            gap:          1,
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#eab308' }}>
              Yahoo Session Expired
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
              Reconnect to load your real roster
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => window.location.href = yahooApi.connectUrl()}
              sx={{ fontWeight: 600, bgcolor: '#eab308', '&:hover': { bgcolor: '#ca9d07' } }}
            >
              Reconnect
            </Button>
            <Button size="small" onClick={disconnect} sx={{ fontSize: 11, color: 'text.secondary' }}>
              Disconnect
            </Button>
          </Box>
        </Box>
      )}

      {/* Yahoo connected */}
      {connected && !sessionExpired && (
        <Box
          sx={{
            bgcolor:      '#22c55e15',
            border:       '1px solid #22c55e40',
            borderRadius: 3,
            px:           2,
            py:           1.5,
            mb:           2,
            display:      'flex',
            justifyContent: 'space-between',
            alignItems:   'center',
            flexWrap:     'wrap',
            gap:          1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 18 }} />
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#22c55e' }}>
                Yahoo Connected
              </Typography>
              {leagues.length === 0 && !leaguesLoading && (
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  No active leagues — showing mock data until season starts
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {leaguesLoading && <Skeleton variant="rounded" width={160} height={36} />}
            {!leaguesLoading && leagues.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Select League</InputLabel>
                <Select
                  value={selectedLeague}
                  label="Select League"
                  onChange={(e) => onChangeLeague(e.target.value)}
                >
                  {leagues.map((league) => (
                    <MenuItem key={league.league_key} value={league.league_key}>
                      {league.name} ({league.season})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <Button size="small" onClick={disconnect} sx={{ fontSize: 11, color: 'text.secondary' }}>
              Disconnect
            </Button>
          </Box>
        </Box>
      )}

      {/* Matchup banner + CTAs */}
      <Box
        sx={{
          display:             'grid',
          gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
          gap:                 2,
          mb:                  3,
        }}
      >
        <Box
          sx={{
            bgcolor:      'background.paper',
            border:       '1px solid',
            borderColor:  'divider',
            borderRadius: 3,
            px:           2,
            py:           1.5,
            display:      'flex',
            justifyContent: 'space-between',
            alignItems:   'center',
          }}
        >
          {matchupLoading ? (
            <Box sx={{ width: '100%' }}>
              <Skeleton variant="text" width="60%" height={20} />
              <Skeleton variant="text" width="40%" height={16} />
            </Box>
          ) : (
            <>
              <Box>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {isLiveOrCompleted ? 'In Progress' : 'This Week'}
                </Typography>
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                  vs {opponentName}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {opponentRecord}
                  {!displayMatchup && (
                    <Box component="span" sx={{ ml: 0.5, color: 'text.disabled', fontSize: 11 }}>
                      · sample
                    </Box>
                  )}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {isLiveOrCompleted ? 'Score' : 'Projected'}
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 20, color: 'primary.main' }}>
                  {isLiveOrCompleted
                    ? (displayMatchup?.my_actual ?? myProjected)
                    : myProjected}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  vs {isLiveOrCompleted
                    ? (displayMatchup?.opponent_actual ?? opponentProjected)
                    : opponentProjected}
                </Typography>
              </Box>
            </>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch' }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<BoltIcon />}
            onClick={() => onNavigate(1)}
            sx={{ fontWeight: 700, py: 1.2 }}
          >
            Evaluate Lineup
          </Button>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<CompareArrowsIcon />}
            onClick={() => onNavigate(2)}
            sx={{ fontWeight: 600, py: 1.2 }}
          >
            Compare Players
          </Button>
        </Box>
      </Box>

      {/* Roster loading */}
      {roster.loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
      )}

      {/* Roster grid */}
      {!roster.loading && (
        <Box
          sx={{
            display:             'grid',
            gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
            gap:                 3,
            mb:                  3,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1 }}>
              Starters
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {roster.starters.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </Box>
          </Box>

          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1 }}>
              Bench
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, opacity: 0.75 }}>
              {roster.bench.map((player) => (
                <PlayerCard key={player.id} player={player} />
              ))}
            </Box>
          </Box>
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* Season record + NFL schedule */}
      <Box
        sx={{
          display:             'grid',
          gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
          gap:                 3,
          mb:                  3,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5 }}>
            Season Record
          </Typography>
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2 }}>
            <MatchHistoryChart />
          </Box>
        </Box>

        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5 }}>
            NFL Schedule
          </Typography>

          {eventsError && (
            <Alert severity="error" sx={{ mb: 2, fontSize: 13 }}>{eventsError}</Alert>
          )}
          {eventsLoading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rounded" height={60} sx={{ borderRadius: 3 }} />
              ))}
            </Box>
          )}
          {!eventsLoading && weeks.length === 0 && (
            <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2 }}>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                No upcoming NFL games available yet.
              </Typography>
            </Box>
          )}
          {!eventsLoading && weeks.length > 0 && (
            <NflScheduleCarousel weeks={weeks} />
          )}
        </Box>
      </Box>

    </Box>
  );
};

export default TeamOverview;