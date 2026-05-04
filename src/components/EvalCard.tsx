import { Box, Typography, Chip } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import VolatilityBadge from './VolatilityBadge';
import FloorCeilingBar from './FloorCeilingBar';
import type { LineupEval } from '../hooks/useLineup';

interface Props {
  evaluation: LineupEval;
}

const EvalCard = ({ evaluation }: Props) => {
  const { slot, current, suggestion, recommendation, reason } = evaluation;
  const isSwap = recommendation === 'swap';

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: isSwap ? '#eab30840' : '#22c55e30',
        borderRadius: 3,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontWeight: 700, fontSize: 16, letterSpacing: 0.5 }}>
          {slot}
        </Typography>
        <Chip
          size="small"
          icon={isSwap ? <SwapHorizIcon /> : <CheckCircleOutlineIcon />}
          label={isSwap ? 'Consider Swap' : 'Keep Starter'}
          sx={{
            fontWeight: 600,
            fontSize: 12,
            bgcolor: isSwap ? '#eab30820' : '#22c55e20',
            color: isSwap ? '#eab308' : '#22c55e',
            border: '1px solid',
            borderColor: isSwap ? '#eab30840' : '#22c55e40',
            '& .MuiChip-icon': {
              color: isSwap ? '#eab308' : '#22c55e',
            },
          }}
        />
      </Box>

      {/* Player comparison */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'stretch' }}>

        {/* Current starter */}
        <Box sx={{ flex: 1, bgcolor: 'background.default', borderRadius: 2, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography sx={{ fontSize: 10, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Current Starter
          </Typography>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
            {current.name}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {current.team} · vs {current.opponent}
          </Typography>
          {current.status === 'questionable' && (
            <Typography sx={{ fontSize: 11, color: '#eab308' }}>⚠️ Questionable</Typography>
          )}
          <Typography sx={{ fontWeight: 700, fontSize: 20, color: current.scoreColor ?? '#7a8099' }}>
            {current.score}
          </Typography>
          {current.volatility && (
            <VolatilityBadge volatility={current.volatility as 'Low' | 'Medium' | 'High'} />
          )}
          {current.floor != null && current.score != null && current.ceiling != null && (
            <FloorCeilingBar
              floor={current.floor}
              score={current.score}
              ceiling={current.ceiling}
            />
          )}
        </Box>

        {/* Arrow */}
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', fontSize: 20, flexShrink: 0 }}>
          {isSwap ? '→' : '≠'}
        </Box>

        {/* Bench suggestion */}
        {suggestion?.name ? (
          <Box
            sx={{
              flex: 1,
              bgcolor: 'background.default',
              borderRadius: 2,
              p: 1.5,
              border: '1px solid',
              borderColor: isSwap ? '#eab30860' : 'transparent',
              opacity: isSwap ? 1 : 0.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Typography sx={{ fontSize: 10, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Bench Alternative
            </Typography>
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
              {suggestion.name}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {suggestion.team} · vs {suggestion.opponent}
            </Typography>
            {suggestion.status === 'questionable' && (
              <Typography sx={{ fontSize: 11, color: '#eab308' }}>⚠️ Questionable</Typography>
            )}
            <Typography sx={{ fontWeight: 700, fontSize: 20, color: suggestion.scoreColor ?? '#7a8099' }}>
              {suggestion.score}
            </Typography>
            {suggestion.volatility && (
              <VolatilityBadge volatility={suggestion.volatility as 'Low' | 'Medium' | 'High'} />
            )}
            {suggestion.floor != null && suggestion.score != null && suggestion.ceiling != null && (
              <FloorCeilingBar
                floor={suggestion.floor}
                score={suggestion.score}
                ceiling={suggestion.ceiling}
              />
            )}
          </Box>
        ) : (
          <Box sx={{ flex: 1, bgcolor: 'background.default', borderRadius: 2, p: 1.5, opacity: 0.4, display: 'flex', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              No eligible bench alternative
            </Typography>
          </Box>
        )}
      </Box>

      {/* Reason */}
      <Box sx={{ bgcolor: 'background.default', borderRadius: 2, p: 1.5, display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <Typography sx={{ fontSize: 13 }}>💡</Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
          {reason}
        </Typography>
      </Box>
    </Box>
  );
};

export default EvalCard;