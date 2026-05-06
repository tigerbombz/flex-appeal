import { Box, Typography, Chip, FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import EvalCard from '../components/EvalCard';
import ModeSelector from '../components/ModeSelector';
import { mockRoster, mockLeague } from '../data/mockData';
import { useLineup } from '../hooks/useLineup';
import { useSettings } from '../context/SettingsContext';
import type { ScoringFormat } from '../utils/scoring';

const LineupEval = () => {
  const { scoringFormat, scoringMode, setScoringFormat, setScoringMode } = useSettings();

  const { result, loading, error } = useLineup(
    mockRoster.starters,
    mockRoster.bench,
    scoringFormat,
    scoringMode
  );

  return (
    <Box sx={{ p: 2 }}>

      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Lineup Evaluation
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>
          Week {mockLeague.week} · Starters vs Bench · Includes K and D/ST
        </Typography>
      </Box>

      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>Format</InputLabel>
          <Select
            value={scoringFormat}
            label="Format"
            onChange={(e) => setScoringFormat(e.target.value as ScoringFormat)}
          >
            <MenuItem value="PPR">PPR</MenuItem>
            <MenuItem value="Half">Half PPR</MenuItem>
            <MenuItem value="Standard">Standard</MenuItem>
          </Select>
        </FormControl>
        <ModeSelector mode={scoringMode} onChange={setScoringMode} />
      </Box>

      {/* Mode explanation */}
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          px: 2,
          py: 1,
          mb: 2,
        }}
      >
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          {scoringMode === 'floor'    && '🛡 Floor mode — prioritizes safe, consistent players. Best for must-win weeks or when protecting a lead.'}
          {scoringMode === 'balanced' && '⚖️ Balanced mode — weighs all factors equally. Best for most situations.'}
          {scoringMode === 'upside'   && '🚀 Upside mode — targets boom potential. Best for must-win when you need a big week.'}
        </Typography>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6, gap: 2 }}>
          <CircularProgress size={24} />
          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
            Evaluating your lineup...
          </Typography>
        </Box>
      )}

      {/* Results */}
      {!loading && result && (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              size="small"
              icon={<SwapHorizIcon />}
              label={`${result.totalSwaps} suggested swap${result.totalSwaps !== 1 ? 's' : ''}`}
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
              label={`${result.totalKeeps} confirmed starter${result.totalKeeps !== 1 ? 's' : ''}`}
              sx={{
                fontWeight: 600,
                bgcolor: '#22c55e20',
                color: '#22c55e',
                border: '1px solid #22c55e40',
                '& .MuiChip-icon': { color: '#22c55e' },
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {result.evaluations.map((evaluation, index) => (
              <EvalCard key={index} evaluation={evaluation} />
            ))}
          </Box>

          <Typography sx={{ mt: 3, fontSize: 12, color: 'text.secondary', textAlign: 'center', lineHeight: 1.6, px: 2 }}>
            Position-specific weights · Vegas props · Team totals · Usage · Trend · Matchup.
            Always apply your own judgment — this is a decision aid, not gospel.
          </Typography>
        </>
      )}

    </Box>
  );
};

export default LineupEval;