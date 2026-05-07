import { Box, Typography, Chip, useMediaQuery, useTheme } from '@mui/material';
import type { Player } from '../types/index';
import { getTrendIcon } from '../utils/scoring';
import ScoreBadge from './ScoreBadge';
import StatChip from './StatChip';

interface Props {
  player: Player;
}

const PlayerCard = ({ player }: Props) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        px: 2,
        py: 1.5,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 1,
      }}
    >
      {/* Left — slot + name */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>

        {/* Fixed width slot badge so all names align */}
        <Typography
          sx={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.5,
            color: 'text.secondary',
            bgcolor: 'background.default',
            border: '1px solid',
            borderColor: 'divider',
            px: 0.8,
            py: 0.3,
            borderRadius: 1,
            whiteSpace: 'nowrap',
            width: 42,
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          {player.slot}
        </Typography>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: 14,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {player.name}
            </Typography>
            {player.status === 'questionable' && (
              <Chip
                label="Q"
                size="small"
                sx={{
                  fontSize: 10,
                  height: 18,
                  bgcolor: '#eab30820',
                  color: '#eab308',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              />
            )}
            {player.status === 'out' && (
              <Chip
                label="OUT"
                size="small"
                sx={{
                  fontSize: 10,
                  height: 18,
                  bgcolor: '#ef444420',
                  color: '#ef4444',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              />
            )}
          </Box>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {player.team} · {player.position} · vs {player.opponent}
          </Typography>
        </Box>
      </Box>

      {/* Right — stats + score */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
        {/* Hide stat chips on mobile — show only score */}
        {!isMobile && (
          <>
            {player.vegasProp && <StatChip label="Prop" value={player.vegasProp} />}
            {player.teamTotal && <StatChip label="Tm Pts" value={player.teamTotal} />}
            {player.trend && <StatChip label="Trend" value={getTrendIcon(player.trend)} />}
          </>
        )}
        <ScoreBadge score={player.score} />
      </Box>
    </Box>
  );
};

export default PlayerCard;