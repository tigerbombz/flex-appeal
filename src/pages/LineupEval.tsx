import { Box, Typography, Chip } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import EvalCard from '../components/EvalCard';
import { mockLineupEvaluations, mockLeague } from '../data/mockData';

const LineupEval = () => {
  const swaps = mockLineupEvaluations.filter((e) => e.recommendation === 'swap');
  const keeps = mockLineupEvaluations.filter((e) => e.recommendation === 'keep');

  return (
    <Box sx={{ p: 2 }}>

      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Lineup Evaluation
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>
          Week {mockLeague.week} · {mockLeague.scoringFormat} · Starters vs Bench
        </Typography>
      </Box>

      {/* Summary chips */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <Chip
          size="small"
          icon={<SwapHorizIcon />}
          label={`${swaps.length} suggested swap${swaps.length !== 1 ? 's' : ''}`}
          sx={{
            fontWeight: 600,
            bgcolor: '#eab30820',
            color: '#eab308',
            border: '1px solid #eab30840',
            '& .MuiChip-icon': { color: '#eab308' },
          }}
        />
        <Chip
          size="small"
          icon={<CheckCircleOutlineIcon />}
          label={`${keeps.length} confirmed starter${keeps.length !== 1 ? 's' : ''}`}
          sx={{
            fontWeight: 600,
            bgcolor: '#22c55e20',
            color: '#22c55e',
            border: '1px solid #22c55e40',
            '& .MuiChip-icon': { color: '#22c55e' },
          }}
        />
      </Box>

      {/* Eval cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {mockLineupEvaluations.map((evaluation, index) => (
          <EvalCard key={index} evaluation={evaluation} />
        ))}
      </Box>

      {/* Disclaimer */}
      <Typography
        sx={{
          mt: 3,
          fontSize: 12,
          color: 'text.secondary',
          textAlign: 'center',
          lineHeight: 1.6,
          px: 2,
        }}
      >
        Scores based on Vegas props (40%) · team totals (20%) · usage (20%) · trend (20%).
        Always apply your own judgment — this is a decision aid, not gospel.
      </Typography>

    </Box>
  );
};

export default LineupEval;