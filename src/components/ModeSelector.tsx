import { Box, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { ScoringMode } from '../hooks/useScoring';

interface Props {
  mode: ScoringMode;
  onChange: (mode: ScoringMode) => void;
}

const ModeSelector = ({ mode, onChange }: Props) => (
  <Box>
    <Typography sx={{ fontSize: 10, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5 }}>
      Mode
    </Typography>
    <ToggleButtonGroup
      value={mode}
      exclusive
      onChange={(_, val) => { if (val) onChange(val); }}
      size="small"
    >
      <ToggleButton
        value="floor"
        sx={{
          fontSize: 11,
          fontWeight: 600,
          px: 1.5,
          color: mode === 'floor' ? '#22c55e' : 'text.secondary',
          borderColor: 'divider',
          '&.Mui-selected': {
            bgcolor: '#22c55e20',
            color: '#22c55e',
            borderColor: '#22c55e40',
          },
        }}
      >
        🛡 Floor
      </ToggleButton>
      <ToggleButton
        value="balanced"
        sx={{
          fontSize: 11,
          fontWeight: 600,
          px: 1.5,
          color: mode === 'balanced' ? 'primary.main' : 'text.secondary',
          borderColor: 'divider',
          '&.Mui-selected': {
            bgcolor: 'primary.main',
            color: '#000',
            borderColor: 'primary.main',
          },
        }}
      >
        ⚖️ Balanced
      </ToggleButton>
      <ToggleButton
        value="upside"
        sx={{
          fontSize: 11,
          fontWeight: 600,
          px: 1.5,
          color: mode === 'upside' ? '#ef4444' : 'text.secondary',
          borderColor: 'divider',
          '&.Mui-selected': {
            bgcolor: '#ef444420',
            color: '#ef4444',
            borderColor: '#ef444440',
          },
        }}
      >
        🚀 Upside
      </ToggleButton>
    </ToggleButtonGroup>
  </Box>
);

export default ModeSelector;