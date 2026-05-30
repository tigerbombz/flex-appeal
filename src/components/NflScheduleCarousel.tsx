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

// ─── Individual game row ──────────────────────────────────────────────────────
const GameRow = ({ game }: { game: OddsGame }) => {
  const isCompleted = game.completed;
  const isLive      = game.live && !game.completed;
  const hasScore    = game.home_score !== null && game.away_score !== null;

  // Who's winning (for live score highlight)
  const homeWinning = hasScore && game.home_score! > game.away_score!;
  const awayWinning = hasScore && game.away_score! > game.home_score!;

  return (
    <Box
      sx={{
        bgcolor:      isCompleted ? 'background.default' : 'background.default',
        borderRadius: 2,
        px:           1.5,
        py:           1.25,
        display:      'flex',
        alignItems:   'center',
        gap:          1,
        opacity:      isCompleted ? 0.65 : 1,
        position:     'relative',
        // Subtle left border accent for live games
        borderLeft:   isLive ? '3px solid #22c55e' : '3px solid transparent',
      }}
    >
      {/* Teams + spreads */}
      <Box sx={{ flex: 1, minWidth: 0 }}>

        {/* Away team */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
          <Typography
            sx={{
              fontSize:   13,
              fontWeight: awayWinning ? 700 : 600,
              whiteSpace: 'nowrap',
              color:      isCompleted && !awayWinning ? 'text.secondary' : 'text.primary',
            }}
          >
            {game.away_team}
          </Typography>
          {/* Show spread for upcoming games, hide for live/completed */}
          {!hasScore && game.away_spread !== null && (
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

        {/* Home team */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography
            sx={{
              fontSize:   13,
              fontWeight: homeWinning ? 700 : 600,
              whiteSpace: 'nowrap',
              color:      isCompleted && !homeWinning ? 'text.secondary' : 'text.primary',
            }}
          >
            {game.home_team}
          </Typography>
          {!hasScore && game.home_spread !== null && (
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

      {/* Right side: score or O/U + time */}
      <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
        {hasScore ? (
          // Live or final score
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
              {isLive && (
                <Box
                  sx={{
                    width:        7,
                    height:       7,
                    borderRadius: '50%',
                    bgcolor:      '#22c55e',
                    flexShrink:   0,
                    // Pulsing dot for live games
                    animation:    'pulse 1.5s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%':      { opacity: 0.3 },
                    },
                  }}
                />
              )}
              <Typography
                sx={{
                  fontSize:   15,
                  fontWeight: 700,
                  color:      isLive ? '#22c55e' : 'text.primary',
                  lineHeight: 1,
                }}
              >
                {game.away_score} – {game.home_score}
              </Typography>
            </Box>
            {isCompleted ? (
              <Chip
                label="Final"
                size="small"
                sx={{
                  fontSize:    9,
                  height:      16,
                  fontWeight:  600,
                  mt:          0.5,
                  bgcolor:     'background.paper',
                  color:       'text.disabled',
                  border:      '1px solid',
                  borderColor: 'divider',
                }}
              />
            ) : (
              <Typography sx={{ fontSize: 10, color: '#22c55e', mt: 0.25 }}>
                Live
              </Typography>
            )}
          </Box>
        ) : (
          // Upcoming — show O/U and tip-off time
          <Box>
            {game.total !== null && (
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'primary.main', mb: 0.25 }}>
                O/U {game.total}
              </Typography>
            )}
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              {formatGameTime(game.commence_time)}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ─── Carousel ─────────────────────────────────────────────────────────────────
const NflScheduleCarousel = ({ weeks }: Props) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!weeks.length) return null;

  const currentWeek = weeks[currentIndex];
  const canGoBack   = currentIndex > 0;
  const canGoNext   = currentIndex < weeks.length - 1;

  const positiveWeeks   = weeks.filter((w) => w.week > 0);
  const seasonStartWeek = positiveWeeks.length
    ? Math.min(...positiveWeeks.map((w) => w.week))
    : 1;

  const getSeasonLabel = (w: typeof currentWeek) => {
    if (w.week > 0) {
      const seasonWeek = w.week - seasonStartWeek + 1;
      return `Week ${seasonWeek}`;
    }
    return `Preseason Week ${Math.abs(w.week)}`;
  };

  // Count live games in current week for the header badge
  const liveCount      = currentWeek.games.filter((g) => g.live && !g.completed).length;
  const completedCount = currentWeek.games.filter((g) => g.completed).length;

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
              {getSeasonLabel(currentWeek)}
            </Typography>
            {/* Live badge in header if any games are live */}
            {liveCount > 0 && (
              <Chip
                label={`${liveCount} Live`}
                size="small"
                sx={{
                  fontSize:  9,
                  height:    18,
                  fontWeight: 700,
                  bgcolor:   '#22c55e20',
                  color:     '#22c55e',
                  border:    '1px solid #22c55e40',
                }}
              />
            )}
          </Box>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
            {currentWeek.games.length} game{currentWeek.games.length !== 1 ? 's' : ''}
            {completedCount > 0 && (
              <Box component="span" sx={{ color: 'text.disabled' }}>
                {' · '}{completedCount} final
              </Box>
            )}
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

      {/* Games list — sorted by backend: live → upcoming → completed */}
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Divider between upcoming and completed if both exist */}
        {(() => {
          const liveOrUpcoming = currentWeek.games.filter((g) => !g.completed);
          const completed      = currentWeek.games.filter((g) => g.completed);

          return (
            <>
              {liveOrUpcoming.map((game) => (
                <GameRow key={game.id} game={game} />
              ))}
              {completed.length > 0 && liveOrUpcoming.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 0.5 }}>
                  <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
                  <Typography sx={{ fontSize: 10, color: 'text.disabled', whiteSpace: 'nowrap' }}>
                    Final scores
                  </Typography>
                  <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
                </Box>
              )}
              {completed.map((game) => (
                <GameRow key={game.id} game={game} />
              ))}
            </>
          );
        })()}
      </Box>

      {/* Footer legend */}
      <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
          Green = favored · O/U = over/under total
        </Typography>
        {liveCount > 0 && (
          <Typography sx={{ fontSize: 10, color: '#22c55e' }}>
            · Scores update every 60s
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default NflScheduleCarousel;