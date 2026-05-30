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
import TrendingUpIcon     from '@mui/icons-material/TrendingUp';
import { useState, useEffect } from 'react';
import PlayerCard          from '../components/PlayerCard';
import FreshnessBadge      from '../components/FreshnessBadge';
import MatchHistoryChart   from '../components/MatchHistoryChart';
import { mockCurrentMatchup } from '../data/mockData';
import { useNflEvents }    from '../hooks/useOdds';
import { useYahooStatus, useYahooLeagues } from '../hooks/useYahoo';
import { useRoster }       from '../hooks/useRoster';
import { yahooApi, backtestApi } from '../services/api';
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

interface BacktestSummary {
  total_evaluated:  number;
  overall_accuracy: number | null;
  swap_accuracy:    number | null;
  keep_accuracy:    number | null;
  total_swaps:      number;
  total_keeps:      number;
  swap_correct:     number;
  keep_correct:     number;
  avg_score_diff:   number | null;
  leagues_tracked:  number;
  message:          string;
}

// ─── Accuracy stat card ───────────────────────────────────────────────────────
const AccuracyStat = ({
  label, value, sub, color,
}: {
  label: string;
  value: string;
  sub?:  string;
  color?: string;
}) => (
  <Box
    sx={{
      flex:        1,
      bgcolor:     'background.paper',
      border:      '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      p:           1.5,
      textAlign:   'center',
      minWidth:    0,
    }}
  >
    <Typography sx={{ fontSize: 22, fontWeight: 700, color: color ?? 'primary.main', lineHeight: 1 }}>
      {value}
    </Typography>
    <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mt: 0.25 }}>
      {label}
    </Typography>
    {sub && (
      <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.25 }}>
        {sub}
      </Typography>
    )}
  </Box>
);

// ─── Color helper for accuracy % ─────────────────────────────────────────────
const accuracyColor = (pct: number | null) => {
  if (pct === null) return 'text.secondary';
  if (pct >= 70)    return '#22c55e';
  if (pct >= 50)    return '#eab308';
  return '#ef4444';
};

const TeamOverview = ({ onNavigate, selectedLeague, onChangeLeague }: Props) => {
  const theme     = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const { weeks, loading: eventsLoading, error: eventsError, lastUpdated } = useNflEvents();
  const { connected, loading: yahooLoading, sessionExpired, disconnect }    = useYahooStatus();
  const { leagues, loading: leaguesLoading } = useYahooLeagues(connected, sessionExpired);

  const roster = useRoster(connected, sessionExpired, selectedLeague);

  // Matchup
  const [matchup, setMatchup]               = useState<Matchup | null>(null);
  const [matchupLoading, setMatchupLoading] = useState(false);

  // Backtest
  const [backtest, setBacktest]               = useState<BacktestSummary | null>(null);
  const [backtestLoading, setBacktestLoading] = useState(false);

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

  useEffect(() => {
    if (!connected || sessionExpired || !selectedLeague) {
      setBacktest(null);
      return;
    }
    const fetchBacktest = async () => {
      setBacktestLoading(true);
      try {
        const data = await backtestApi.getSummary('2025', selectedLeague);
        setBacktest(data);
      } catch {
        setBacktest(null);
      } finally {
        setBacktestLoading(false);
      }
    };
    fetchBacktest();
  }, [connected, sessionExpired, selectedLeague]);

  const displayMatchup     = matchup ?? null;
  const opponentName       = displayMatchup?.opponent           ?? mockCurrentMatchup.opponent;
  const opponentRecord     = displayMatchup?.opponent_record    ?? mockCurrentMatchup.opponentRecord;
  const myProjected        = displayMatchup?.my_projected       ?? mockCurrentMatchup.myProjected;
  const opponentProjected  = displayMatchup?.opponent_projected ?? mockCurrentMatchup.opponentProjected;
  const isLiveOrCompleted  = displayMatchup?.status === 'postevent' || displayMatchup?.status === 'midevent';

  const hasBacktestData = backtest && backtest.total_evaluated > 0;

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
              <Chip label="Live" size="small" sx={{ fontSize: 10, height: 20, bgcolor: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', fontWeight: 700 }} />
            ) : (
              <Chip label="Mock Data" size="small" sx={{ fontSize: 10, height: 20, bgcolor: '#eab30820', color: '#eab308', border: '1px solid #eab30840', fontWeight: 700 }} />
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
        <Alert severity="warning" sx={{ mb: 2, fontSize: 13 }}>{roster.error}</Alert>
      )}

      {/* Yahoo not connected */}
      {!yahooLoading && !connected && (
        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, px: 2, py: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Connect Yahoo Fantasy</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
              Pull your real roster and league settings
            </Typography>
          </Box>
          <Button variant="contained" size="small" startIcon={<LinkIcon />} onClick={() => window.location.href = yahooApi.connectUrl()} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
            Connect Yahoo
          </Button>
        </Box>
      )}

      {/* Yahoo session expired */}
      {connected && sessionExpired && (
        <Box sx={{ bgcolor: '#eab30815', border: '1px solid #eab30840', borderRadius: 3, px: 2, py: 1.5, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#eab308' }}>Yahoo Session Expired</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>Reconnect to load your real roster</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" size="small" startIcon={<RefreshIcon />} onClick={() => window.location.href = yahooApi.connectUrl()} sx={{ fontWeight: 600, bgcolor: '#eab308', '&:hover': { bgcolor: '#ca9d07' } }}>
              Reconnect
            </Button>
            <Button size="small" onClick={disconnect} sx={{ fontSize: 11, color: 'text.secondary' }}>Disconnect</Button>
          </Box>
        </Box>
      )}

      {/* Yahoo connected */}
      {connected && !sessionExpired && (
        <Box sx={{ bgcolor: '#22c55e15', border: '1px solid #22c55e40', borderRadius: 3, px: 2, py: 1.5, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 18 }} />
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#22c55e' }}>Yahoo Connected</Typography>
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
                <Select value={selectedLeague} label="Select League" onChange={(e) => onChangeLeague(e.target.value)}>
                  {leagues.map((league) => (
                    <MenuItem key={league.league_key} value={league.league_key}>
                      {league.name} ({league.season})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <Button size="small" onClick={disconnect} sx={{ fontSize: 11, color: 'text.secondary' }}>Disconnect</Button>
          </Box>
        </Box>
      )}

      {/* Matchup banner + CTAs */}
      <Box sx={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 2, mb: 3 }}>
        <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>vs {opponentName}</Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {opponentRecord}
                  {!displayMatchup && (
                    <Box component="span" sx={{ ml: 0.5, color: 'text.disabled', fontSize: 11 }}>· sample</Box>
                  )}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {isLiveOrCompleted ? 'Score' : 'Projected'}
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 20, color: 'primary.main' }}>
                  {isLiveOrCompleted ? (displayMatchup?.my_actual ?? myProjected) : myProjected}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  vs {isLiveOrCompleted ? (displayMatchup?.opponent_actual ?? opponentProjected) : opponentProjected}
                </Typography>
              </Box>
            </>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'stretch' }}>
          <Button variant="contained" fullWidth startIcon={<BoltIcon />} onClick={() => onNavigate(1)} sx={{ fontWeight: 700, py: 1.2 }}>
            Evaluate Lineup
          </Button>
          <Button variant="outlined" fullWidth startIcon={<CompareArrowsIcon />} onClick={() => onNavigate(2)} sx={{ fontWeight: 600, py: 1.2 }}>
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
        <Box sx={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 3, mb: 3 }}>
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

      {/* ── Season Record — full width ───────────────────────────────────── */}
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5 }}>
        Season Record
      </Typography>
      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2, mb: 3 }}>
        <MatchHistoryChart
          isRealData={roster.isRealData}
          loading={roster.loading}
        />
      </Box>

      {/* ── Engine Accuracy Dashboard ────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase' }}>
          Engine Accuracy
        </Typography>
        <TrendingUpIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
      </Box>

      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2, mb: 3 }}>
        {!connected || sessionExpired ? (
          // Not connected — explain what this section will show
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Connect Yahoo to track how accurate the lineup engine is over time.
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.5 }}>
              After each week, sync your results to see swap vs keep accuracy.
            </Typography>
          </Box>
        ) : backtestLoading ? (
          // Loading state
          <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="rounded" height={64} sx={{ flex: 1, borderRadius: 2 }} />
              ))}
            </Box>
            <Skeleton variant="rounded" height={20} sx={{ borderRadius: 2 }} />
          </Box>
        ) : !hasBacktestData ? (
          // Connected but no data yet
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              No accuracy data yet — evaluations build up as the season progresses.
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.5 }}>
              Run lineup evaluations each week, then sync results after Monday Night Football.
            </Typography>
          </Box>
        ) : (
          // Has real data
          <Box>
            {/* Stat cards row */}
            <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <AccuracyStat
                label="Overall"
                value={backtest.overall_accuracy !== null ? `${backtest.overall_accuracy}%` : '—'}
                sub={`${backtest.total_evaluated} slots`}
                color={accuracyColor(backtest.overall_accuracy)}
              />
              <AccuracyStat
                label="Swap calls"
                value={backtest.swap_accuracy !== null ? `${backtest.swap_accuracy}%` : '—'}
                sub={`${backtest.swap_correct ?? 0}/${backtest.total_swaps ?? 0} correct`}
                color={accuracyColor(backtest.swap_accuracy)}
              />
              <AccuracyStat
                label="Keep calls"
                value={backtest.keep_accuracy !== null ? `${backtest.keep_accuracy}%` : '—'}
                sub={`${backtest.keep_correct ?? 0}/${backtest.total_keeps ?? 0} correct`}
                color={accuracyColor(backtest.keep_accuracy)}
              />
              <AccuracyStat
                label="Avg gain"
                value={backtest.avg_score_diff !== null
                  ? `${backtest.avg_score_diff > 0 ? '+' : ''}${backtest.avg_score_diff}`
                  : '—'}
                sub="pts when followed"
                color={
                  backtest.avg_score_diff === null ? 'text.secondary'
                  : backtest.avg_score_diff > 0    ? '#22c55e'
                  : '#ef4444'
                }
              />
            </Box>

            {/* Context line */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                {backtest.message}
              </Typography>
              {backtest.overall_accuracy !== null && (
                <Chip
                  label={
                    backtest.overall_accuracy >= 70 ? 'Engine on 🔥' :
                    backtest.overall_accuracy >= 50 ? 'Solid so far' :
                    'Building data...'
                  }
                  size="small"
                  sx={{
                    fontSize: 10,
                    height: 20,
                    fontWeight: 700,
                    bgcolor: backtest.overall_accuracy >= 70 ? '#22c55e20'
                           : backtest.overall_accuracy >= 50 ? '#eab30820'
                           : 'background.default',
                    color: backtest.overall_accuracy >= 70 ? '#22c55e'
                         : backtest.overall_accuracy >= 50 ? '#eab308'
                         : 'text.secondary',
                    border: `1px solid ${
                      backtest.overall_accuracy >= 70 ? '#22c55e40'
                      : backtest.overall_accuracy >= 50 ? '#eab30840'
                      : 'divider'
                    }`,
                  }}
                />
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* ── NFL Schedule — full width ────────────────────────────────────── */}
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
  );
};

export default TeamOverview;