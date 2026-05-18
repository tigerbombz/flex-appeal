import { useState } from 'react';
import { Box, Typography, IconButton, Chip } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import type { OddsWeek, OddsGame } from '../hooks/useOdds';

interface Props {
  weeks: OddsWeek[];
}

const formatGameTime = (iso: string): string => {
  return new Date(iso).toLocaleDateString([], {
    weekday: 'short',
    month:   'short',
    day:     'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
  });
};

const formatSpread = (spread: number | null): string => {
  if (spread === null) return '';
  return spread > 0 ? `+${spread}` : `${spread}`;
};

const GameRow = ({ game }: { game: OddsGame }) => (
  <Box
    sx={{
      bgcolor:      'background.default',
      borderRadius: 2,
      px:           1.5,
      py:           1.25,
      display:      'flex',
      alignItems:   'center',
      gap:          1,
    }}
  >
    {/* Teams */}
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {game.away_team}
        </Typography>
        {game.away_spread !== null && (
          <Chip
            label={formatSpread(game.away_spread)}
            size="small"
            sx={{
              fontSize:    10,
              height:      18,
              fontWeight:  600,
              bgcolor:     game.away_spread < 0 ? 'primary.main' : 'background.paper',
              color:       game.away_spread < 0 ? '#000' : 'text.secondary',
              border:      '1px solid',
              borderColor: game.away_spread < 0 ? 'primary.main' : 'divider',
            }}
          />
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {game.home_team}
        </Typography>
        {game.home_spread !== null && (
          <Chip
            label={formatSpread(game.home_spread)}
            size="small"
            sx={{
              fontSize:    10,
              height:      18,
              fontWeight:  600,
              bgcolor:     game.home_spread < 0 ? 'primary.main' : 'background.paper',
              color:       game.home_spread < 0 ? '#000' : 'text.secondary',
              border:      '1px solid',
              borderColor: game.home_spread < 0 ? 'primary.main' : 'divider',
            }}
          />
        )}
      </Box>
    </Box>

    {/* Total + time */}
    <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
      {game.total !== null && (
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'primary.main', mb: 0.25 }}>
          O/U {game.total}
        </Typography>
      )}
      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
        {formatGameTime(game.commence_time)}
      </Typography>
    </Box>
  </Box>
);

const NflScheduleCarousel = ({ weeks }: Props) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!weeks.length) return null;

  const currentWeek = weeks[currentIndex];
  const canGoBack   = currentIndex > 0;
  const canGoNext   = currentIndex < weeks.length - 1;
  // Compute a season-relative week label: map the first positive week
  // in the `weeks` array to `Week 1` so we don't show calendar-week numbers.
  const positiveWeeks = weeks.filter((w) => w.week > 0);
  const seasonStartWeek = positiveWeeks.length ? Math.min(...positiveWeeks.map((w) => w.week)) : 1;
  const getSeasonLabel = (w: typeof currentWeek) => {
    if (w.week > 0) {
      const seasonWeek = w.week - seasonStartWeek + 1;
      return `Week ${seasonWeek}`;
    }
    return `Preseason Week ${Math.abs(w.week)}`;
  };

  return (
    <Box
      sx={{
        bgcolor:      'background.paper',
        border:       '1px solid',
        borderColor:  'divider',
        borderRadius: 3,
        overflow:     'hidden',
      }}
    >
      {/* Week header with arrows */}
      <Box
        sx={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          px:             2,
          py:             1.25,
          borderBottom:   '1px solid',
          borderColor:    'divider',
          bgcolor:        'background.default',
        }}
      >
        <IconButton
          size="small"
          onClick={() => setCurrentIndex((i) => i - 1)}
          disabled={!canGoBack}
          sx={{ color: canGoBack ? 'primary.main' : 'text.disabled' }}
        >
          <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
        </IconButton>

        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
            {getSeasonLabel(currentWeek)}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
            {currentWeek.games.length} game{currentWeek.games.length !== 1 ? 's' : ''}
          </Typography>
        </Box>

        <IconButton
          size="small"
          onClick={() => setCurrentIndex((i) => i + 1)}
          disabled={!canGoNext}
          sx={{ color: canGoNext ? 'primary.main' : 'text.disabled' }}
        >
          <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>

      {/* Week indicator dots */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
        {weeks.map((_, i) => (
          <Box
            key={i}
            onClick={() => setCurrentIndex(i)}
            sx={{
              width:        i === currentIndex ? 16 : 6,
              height:       6,
              borderRadius: 3,
              bgcolor:      i === currentIndex ? 'primary.main' : 'divider',
              cursor:       'pointer',
              transition:   'all 0.2s',
            }}
          />
        ))}
      </Box>

      {/* Games list */}
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {currentWeek.games.map((game) => (
          <GameRow key={game.id} game={game} />
        ))}
      </Box>

      {/* Spread legend */}
      <Box
        sx={{
          px:          2,
          py:          1,
          borderTop:   '1px solid',
          borderColor: 'divider',
          display:     'flex',
          gap:         2,
        }}
      >
        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
          Green = favored · O/U = over/under total
        </Typography>
      </Box>
    </Box>
  );
};

export default NflScheduleCarousel;