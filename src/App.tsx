import { useState } from 'react';
import { Box, BottomNavigation, BottomNavigationAction, Paper, useMediaQuery, useTheme, CircularProgress } from '@mui/material';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';
import BoltIcon from '@mui/icons-material/Bolt';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SettingsIcon from '@mui/icons-material/Settings';
import AppHeader from './components/AppHeader';
import TeamOverview from './pages/TeamOverview';
import LineupEval from './pages/LineupEval';
import PlayerCompare from './pages/PlayerCompare';
import Settings from './pages/Settings';
import Landing from './pages/Landing';
import { useAuthContext } from './context/AuthContext';

const ACTIVE_TAB_KEY  = 'snapdecision_active_tab';
const AUTH_ENABLED    = import.meta.env.VITE_AUTH_ENABLED === 'true';

const App = () => {
  const [tab, setTab] = useState<number>(
    parseInt(localStorage.getItem(ACTIVE_TAB_KEY) || '0')
  );
  const theme         = useTheme();
  const isDesktop     = useMediaQuery(theme.breakpoints.up('md'));
  const { user, loading, checked } = useAuthContext();

  const handleTabChange = (newTab: number) => {
    localStorage.setItem(ACTIVE_TAB_KEY, String(newTab));
    setTab(newTab);
  };

  // Show spinner while checking auth
  if (AUTH_ENABLED && !checked) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Show landing page if auth is enabled and user is not logged in
  if (AUTH_ENABLED && !user) {
    return <Landing />;
  }

  return (
    <Box
      sx={{
        maxWidth: isDesktop ? 1400 : 480,
        mx: 'auto',
        minHeight: '100dvh',
        pb: '68px',
        px: isDesktop ? 4 : 0,
      }}
    >
      <AppHeader onSettingsClick={() => handleTabChange(3)} />

      <Box>
        {tab === 0 && <TeamOverview onNavigate={handleTabChange} />}
        {tab === 1 && <LineupEval />}
        {tab === 2 && <PlayerCompare />}
        {tab === 3 && <Settings />}
      </Box>

      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
        }}
        elevation={3}
      >
        <BottomNavigation value={tab} onChange={(_, val) => handleTabChange(val)}>
          <BottomNavigationAction label="My Team" icon={<SportsFootballIcon />} />
          <BottomNavigationAction label="Lineup" icon={<BoltIcon />} />
          <BottomNavigationAction label="Compare" icon={<CompareArrowsIcon />} />
          <BottomNavigationAction label="Settings" icon={<SettingsIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default App;