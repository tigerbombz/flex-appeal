import { useState } from 'react';
import { Box, BottomNavigation, BottomNavigationAction, Paper, useMediaQuery, useTheme } from '@mui/material';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';
import BoltIcon from '@mui/icons-material/Bolt';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import SettingsIcon from '@mui/icons-material/Settings';
import AppHeader from './components/AppHeader';
import TeamOverview from './pages/TeamOverview';
import LineupEval from './pages/LineupEval';
import PlayerCompare from './pages/PlayerCompare';
import Settings from './pages/Settings';

const App = () => {
  const [tab, setTab] = useState(0);
  const theme         = useTheme();
  const isDesktop     = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <Box
      sx={{
        maxWidth: isDesktop ? 1100 : 480,
        mx: 'auto',
        minHeight: '100dvh',
        pb: '68px',
        px: isDesktop ? 3 : 0,
      }}
    >
      <AppHeader onSettingsClick={() => setTab(3)} />

      <Box>
        {tab === 0 && <TeamOverview onNavigate={setTab} />}
        {tab === 1 && <LineupEval />}
        {tab === 2 && <PlayerCompare />}
        {tab === 3 && <Settings />}
      </Box>

      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: isDesktop ? 1100 : 480,
          zIndex: 10,
        }}
        elevation={3}
      >
        <BottomNavigation value={tab} onChange={(_, val) => setTab(val)}>
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