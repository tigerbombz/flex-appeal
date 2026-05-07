import { useState } from 'react';
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
} from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import LinkIcon from '@mui/icons-material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayerCard from '../components/PlayerCard';
import FreshnessBadge from '../components/FreshnessBadge';
import { mockLeague, mockRoster, mockCurrentMatchup } from '../data/mockData';
import { useNflEvents } from '../hooks/useOdds';
import { useYahooStatus, useYahooLeagues } from '../hooks/useYahoo';
import { yahooApi } from '../services/api';
import MatchHistoryChart from '../components/MatchHistoryChart';

interface Props {
  onNavigate: (tab: number) => void;
}

const TeamOverview = ({ onNavigate }: Props) => {
  const { events, loading, error, lastUpdated } = useNflEvents();
  const { connected, loading: yahooLoading, sessionExpired, disconnect } = useYahooStatus();
  const { leagues, loading: leaguesLoading, error: leaguesError } = useYahooLeagues(connected, sessionExpired);
  const [selectedLeague, setSelectedLeague] = useState<string>('');

  return (
    <Box sx={{ p: 2 }}>

      {/* League header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {mockLeague.name}
          </Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>
            {mockLeague.scoringFormat} · {mockLeague.record} · {mockLeague.standing} · Week {mockLeague.week}
          </Typography>
        </Box>
        <FreshnessBadge lastUpdated={lastUpdated} loading={loading} />
      </Box>

      {/* Yahoo not connected */}
      {!yahooLoading && !connected && (
        <Box
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            px: 2,
            py: 2,
            mb: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
              Connect Yahoo Fantasy
            </Typography>
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
            bgcolor: '#eab30815',
            border: '1px solid #eab30840',
            borderRadius: 3,
            px: 2,
            py: 1.5,
            mb: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#eab308' }}>
              Yahoo Session Expired
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
              Your session expired — click to reconnect
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => window.location.href = yahooApi.connectUrl()}
              sx={{ fontWeight: 600, whiteSpace: 'nowrap', bgcolor: '#eab308', '&:hover': { bgcolor: '#ca9d07' } }}
            >
              Reconnect
            </Button>
            <Button
              size="small"
              onClick={disconnect}
              sx={{ fontSize: 11, color: 'text.secondary' }}
            >
              Disconnect
            </Button>
          </Box>
        </Box>
      )}

      {/* Yahoo connected */}
      {connected && !sessionExpired && (
        <Box
          sx={{
            bgcolor: '#22c55e15',
            border: '1px solid #22c55e40',
            borderRadius: 3,
            px: 2,
            py: 1.5,
            mb: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 18 }} />
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#22c55e' }}>
                Yahoo Connected
              </Typography>
              {leaguesError === 'offseason' && (
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  No active leagues yet — check back when the season starts
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {leaguesLoading && (
              <Skeleton variant="rounded" width={160} height={36} />
            )}

            {!leaguesLoading && leagues.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Select League</InputLabel>
                <Select
                  value={selectedLeague}
                  label="Select League"
                  onChange={(e) => setSelectedLeague(e.target.value)}
                >
                  {leagues.map((league) => (
                    <MenuItem key={league.league_key} value={league.league_key}>
                      {league.name} ({league.season})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <Button
              size="small"
              onClick={disconnect}
              sx={{ fontSize: 11, color: 'text.secondary' }}
            >
              Disconnect
            </Button>
          </Box>
        </Box>
      )}

      {/* Current matchup banner */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          px: 2,
          py: 1.5,
          mb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
            This Week
          </Typography>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
            vs {mockCurrentMatchup.opponent}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {mockCurrentMatchup.opponentRecord}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
            Projected
          </Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 20, color: 'primary.main' }}>
            {mockCurrentMatchup.myProjected}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            vs {mockCurrentMatchup.opponentProjected}
          </Typography>
        </Box>
      </Box>

      {/* CTA Buttons */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
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

      {/* Starters */}
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1 }}>
        Starters
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
        {mockRoster.starters.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Bench */}
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1 }}>
        Bench
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, opacity: 0.75, mb: 3 }}>
        {mockRoster.bench.map((player) => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Match History */}
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5 }}>
        Season Record
      </Typography>
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          p: 2,
          mb: 3,
        }}
      >
        <MatchHistoryChart />
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Upcoming NFL Games */}
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1 }}>
        Upcoming NFL Games
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, fontSize: 13 }}>
          {error} — check your API key in backend/.env
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={60} sx={{ borderRadius: 3 }} />
          ))}
        </Box>
      )}

      {!loading && !error && events.length === 0 && (
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          No upcoming NFL games found — it may be the offseason.
        </Typography>
      )}

      {!loading && events.map((event) => (
        <Box
          key={event.id}
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            px: 2,
            py: 1.5,
            mb: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
              {event.away_team} @ {event.home_team}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {new Date(event.commence_time).toLocaleDateString([], {
                weekday: 'short',
                month:   'short',
                day:     'numeric',
                hour:    '2-digit',
                minute:  '2-digit',
              })}
            </Typography>
          </Box>
        </Box>
      ))}

    </Box>
  );
};

export default TeamOverview;