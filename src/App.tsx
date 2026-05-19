import { useState, useEffect } from 'react';
import {
  Box,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  useMediaQuery,
  useTheme,
  CircularProgress,
} from '@mui/material';
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
import TradeAnalyzer  from './pages/TradeAnalyzer';
import WaiverAssistant from './pages/WaiverAssistant';
import SwapHorizIcon  from '@mui/icons-material/SwapHoriz';
import PersonAddIcon  from '@mui/icons-material/PersonAdd';
import LeagueSelector from './components/LeagueSelector';
import { useAuthContext } from './context/AuthContext';
import { useYahooLeagues } from './hooks/useYahoo';

const ACTIVE_TAB_KEY     = 'snapdecision_active_tab';
const LEAGUE_KEY_KEY     = 'snapdecision_league_key';
const ONBOARDED_KEY      = 'snapdecision_onboarded';
const AUTH_ENABLED       = import.meta.env.VITE_AUTH_ENABLED === 'true';

const App = () => {
  const [tab, setTab] = useState<number>(
    parseInt(localStorage.getItem(ACTIVE_TAB_KEY) || '0')
  );
  const [selectedLeague, setSelectedLeague] = useState<string>(
    localStorage.getItem(LEAGUE_KEY_KEY) || ''
  );
  const [showLeagueSelector, setShowLeagueSelector] = useState(false);

  const theme     = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { user, checked, logout } = useAuthContext();

  const isConnected   = !!user;
  const { leagues, loading: leaguesLoading } = useYahooLeagues(
    isConnected,
    false
  );

  // Show league selector after first login
  useEffect(() => {
    if (!user) return;
    const onboarded = localStorage.getItem(ONBOARDED_KEY) === 'true';
    if (!onboarded) {
      setShowLeagueSelector(true);
    }
  }, [user]);

  const handleTabChange = (newTab: number) => {
    localStorage.setItem(ACTIVE_TAB_KEY, String(newTab));
    setTab(newTab);
  };

  const handleLeagueSelect = (leagueKey: string) => {
    localStorage.setItem(LEAGUE_KEY_KEY, leagueKey);
    localStorage.setItem(ONBOARDED_KEY, 'true');
    setSelectedLeague(leagueKey);
    setShowLeagueSelector(false);
  };

  const handleLogout = () => {
    localStorage.removeItem(ONBOARDED_KEY);
    localStorage.removeItem(LEAGUE_KEY_KEY);
    logout();
  };

  if (AUTH_ENABLED && !checked) {
    return (
      <Box sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

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
      {/* League selector modal — shown after first login */}
      <LeagueSelector
        open={showLeagueSelector}
        leagues={leagues}
        loading={leaguesLoading}
        onSelect={handleLeagueSelect}
      />

      <AppHeader onSettingsClick={() => handleTabChange(3)} />

      <Box>
        {tab === 0 && (
          <TeamOverview
            onNavigate={handleTabChange}
            selectedLeague={selectedLeague}
            onChangeLeague={(key) => {
              localStorage.setItem(LEAGUE_KEY_KEY, key);
              setSelectedLeague(key);
            }}
          />
        )}
        {tab === 1 && <LineupEval />}
        {tab === 2 && <PlayerCompare />}
        {tab === 3 && <TradeAnalyzer />}
        {tab === 4 && <WaiverAssistant />}
        {tab === 5 && <Settings onLogout={handleLogout} />}
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
          <BottomNavigationAction label="Trade"   icon={<SwapHorizIcon />} />
          <BottomNavigationAction label="Waivers" icon={<PersonAddIcon />} />
          <BottomNavigationAction label="Settings" icon={<SettingsIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default App;