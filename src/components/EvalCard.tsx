import { Box, Typography, Chip } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import type { LineupEvaluation } from '../types/index';

interface Props {
  evaluation: LineupEvaluation;
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
          icon={isSwap ? <SwapHorizIcon /> : <CheckCircleOutlinedIcon />}
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
        <Box
          sx={{
            flex: 1,
            bgcolor: 'background.default',
            borderRadius: 2,
            p: 1.5,
          }}
        >
          <Typography sx={{ fontSize: 10, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
            Current Starter
          </Typography>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
            {current.name}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
            {current.team} · vs {current.opponent}
          </Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 18, color: current.score >= 80 ? '#22c55e' : current.score >= 65 ? '#eab308' : '#ef4444' }}>
            {current.score}
          </Typography>
        </Box>

        {/* Arrow */}
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', fontSize: 20 }}>
          {isSwap ? '→' : '≠'}
        </Box>

        {/* Bench suggestion */}
        <Box
          sx={{
            flex: 1,
            bgcolor: 'background.default',
            borderRadius: 2,
            p: 1.5,
            border: '1px solid',
            borderColor: isSwap ? '#eab30860' : 'transparent',
            opacity: isSwap ? 1 : 0.5,
          }}
        >
          <Typography sx={{ fontSize: 10, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
            Bench
          </Typography>
          <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
            {suggestion.name}
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
            {suggestion.team} · vs {suggestion.opponent}
          </Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 18, color: suggestion.score >= 80 ? '#22c55e' : suggestion.score >= 65 ? '#eab308' : '#ef4444' }}>
            {suggestion.score}
          </Typography>
        </Box>
      </Box>

      {/* Reason */}
      <Box
        sx={{
          bgcolor: 'background.default',
          borderRadius: 2,
          p: 1.5,
          display: 'flex',
          gap: 1,
          alignItems: 'flex-start',
        }}
      >
        <Typography sx={{ fontSize: 14 }}>💡</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>
          {reason}
        </Typography>
      </Box>
    </Box>
  );
};

export default EvalCard;