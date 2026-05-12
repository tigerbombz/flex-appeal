import { Box, Typography, Button, Chip } from '@mui/material';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';
import BoltIcon from '@mui/icons-material/Bolt';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import BarChartIcon from '@mui/icons-material/BarChart';
import { yahooApi } from '../services/api';

const Landing = () => {
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 6,
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          borderRadius: 3,
          width: 64,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        <SportsFootballIcon sx={{ fontSize: 36, color: '#000' }} />
      </Box>

      {/* Brand */}
      <Typography
        sx={{
          fontWeight: 800,
          fontSize: 32,
          letterSpacing: 0.5,
          color: 'primary.main',
          mb: 1,
        }}
      >
        SnapDecision
      </Typography>
      <Typography
        sx={{
          fontSize: 16,
          color: 'text.secondary',
          textAlign: 'center',
          mb: 4,
          maxWidth: 320,
          lineHeight: 1.5,
        }}
      >
        The rational fantasy football advisor powered by Vegas data
      </Typography>

      {/* Feature chips */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          justifyContent: 'center',
          mb: 5,
          maxWidth: 360,
        }}
      >
        <Chip
          icon={<BoltIcon sx={{ fontSize: 14 }} />}
          label="Lineup Evaluation"
          size="small"
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            fontSize: 12,
          }}
        />
        <Chip
          icon={<CompareArrowsIcon sx={{ fontSize: 14 }} />}
          label="Player Compare"
          size="small"
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            fontSize: 12,
          }}
        />
        <Chip
          icon={<BarChartIcon sx={{ fontSize: 14 }} />}
          label="Vegas Props"
          size="small"
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            fontSize: 12,
          }}
        />
        <Chip
          icon={<SportsFootballIcon sx={{ fontSize: 14 }} />}
          label="Yahoo Fantasy"
          size="small"
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            fontSize: 12,
          }}
        />
      </Box>

      {/* Sign in button */}
      <Button
        variant="contained"
        size="large"
        onClick={() => window.location.href = yahooApi.connectUrl()}
        sx={{
          fontWeight: 700,
          fontSize: 16,
          py: 1.5,
          px: 4,
          borderRadius: 3,
          mb: 2,
          minWidth: 280,
        }}
      >
        Sign in with Yahoo Fantasy
      </Button>

      <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center', maxWidth: 280 }}>
        Connect your Yahoo Fantasy account to get started. Your data stays private.
      </Typography>

      {/* Environment flag — show mock data link in dev */}
      {import.meta.env.VITE_AUTH_ENABLED !== 'true' && (
        <Button
          size="small"
          onClick={() => {
            localStorage.setItem('yahoo_connected', 'true');
            window.location.reload();
          }}
          sx={{ mt: 3, color: 'text.secondary', fontSize: 11 }}
        >
          Continue with mock data (dev only)
        </Button>
      )}
    </Box>
  );
};

export default Landing;