import { Box, Typography, Button, Divider, Skeleton, Alert } from '@mui/material';
import BoltIcon from '@mui/icons-material/Bolt';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import PlayerCard from '../components/PlayerCard';
import FreshnessBadge from '../components/FreshnessBadge';
import { mockLeague, mockRoster, mockCurrentMatchup } from '../data/mockData';
import { useNflEvents } from '../hooks/useOdds';

interface Props {
  onNavigate: (tab: number) => void;
}

const TeamOverview = ({ onNavigate }: Props) => {
  const { events, loading, error, lastUpdated } = useNflEvents();

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

      {/* Live NFL Games from Odds API */}
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
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Typography>
          </Box>
        </Box>
      ))}

    </Box>
  );
};

export default TeamOverview;