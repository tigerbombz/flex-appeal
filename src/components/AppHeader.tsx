import { Box, Typography, IconButton, Chip } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';
import { useSettings } from '../context/SettingsContext';
import { mockLeague } from '../data/mockData';

interface Props {
  onSettingsClick?: () => void;
}

const AppHeader = ({ onSettingsClick }: Props) => {
  const { scoringFormat } = useSettings();

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        bgcolor: 'background.default',
        borderBottom: '1px solid',
        borderColor: 'divider',
        px: 2,
        py: 1.5,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      {/* Left — logo + brand */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            bgcolor: 'primary.main',
            borderRadius: 2,
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <SportsFootballIcon sx={{ fontSize: 18, color: '#000' }} />
        </Box>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: 18,
            letterSpacing: 0.5,
            color: 'primary.main',
          }}
        >
          SnapDecision
        </Typography>
      </Box>

      {/* Right — week badge + format + settings */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          label={`Week ${mockLeague.week}`}
          size="small"
          sx={{
            fontSize: 11,
            fontWeight: 700,
            bgcolor: 'background.paper',
            color: 'text.secondary',
            border: '1px solid',
            borderColor: 'divider',
            height: 24,
          }}
        />
        <Chip
          label={scoringFormat}
          size="small"
          sx={{
            fontSize: 11,
            fontWeight: 700,
            bgcolor: 'primary.main',
            color: '#000',
            height: 24,
          }}
        />
        <IconButton
          size="small"
          onClick={onSettingsClick}
          sx={{ color: 'text.secondary' }}
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default AppHeader;