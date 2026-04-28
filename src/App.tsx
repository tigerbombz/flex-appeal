import { useState } from 'react';
import { Box, BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';
import BoltIcon from '@mui/icons-material/Bolt';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';

import TeamOverview from './pages/TeamOverview';
import LineupEval from './pages/LineupEval';
import PlayerCompare from './pages/PlayerCompare';

export default function App() {
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ maxWidth: 480, mx: 'auto', minHeight: '100dvh', pb: '68px' }}>
      <Box>
        {tab === 0 && <TeamOverview onNavigate={setTab} />}
        {tab === 1 && <LineupEval />}
        {tab === 2 && <PlayerCompare />}
      </Box>

      <Paper
        sx={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 480,
          zIndex: 10,
        }}
        elevation={3}
      >
        <BottomNavigation value={tab} onChange={(_, val) => setTab(val)}>
          <BottomNavigationAction label="My Team" icon={<SportsFootballIcon />} />
          <BottomNavigationAction label="Lineup" icon={<BoltIcon />} />
          <BottomNavigationAction label="Compare" icon={<CompareArrowsIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}