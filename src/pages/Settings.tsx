import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Chip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkIcon from '@mui/icons-material/Link';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useYahooStatus, useYahooLeagues } from '../hooks/useYahoo';
import { yahooApi, backtestApi } from '../services/api';
import ModeSelector from '../components/ModeSelector';
import { useSettings } from '../context/SettingsContext';
import type { ScoringFormat } from '../utils/scoring';

const Settings = () => {
  const { scoringFormat, scoringMode, setScoringFormat, setScoringMode } = useSettings();
  const [notifications, setNotifications] = useState(
    localStorage.getItem('snapdecision_notifications') === 'true'
  );
  const [saved, setSaved] = useState(false);
  const [backtestSummary, setBacktestSummary] = useState<any>(null);

  const { connected, loading: yahooLoading, sessionExpired, disconnect } = useYahooStatus();
  const { leagues } = useYahooLeagues(connected, sessionExpired);

  useEffect(() => {
    backtestApi.getSummary('2025').then(setBacktestSummary).catch(console.error);
  }, []);

  const handleSave = () => {
    localStorage.setItem('snapdecision_notifications', String(notifications));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <Box sx={{ p: 2 }}>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Settings
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>
          Configure your league preferences and account
        </Typography>
      </Box>

      {/* Saved confirmation */}
      {saved && (
        <Alert severity="success" sx={{ mb: 2, fontSize: 13 }}>
          Settings saved successfully
        </Alert>
      )}

      {/* Yahoo Account */}
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5 }}>
        Yahoo Account
      </Typography>
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: connected && !sessionExpired ? '#22c55e40' : 'divider',
          borderRadius: 3,
          p: 2,
          mb: 3,
        }}
      >
        {yahooLoading && (
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            Checking connection...
          </Typography>
        )}

        {!yahooLoading && !connected && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                Not connected
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                Connect Yahoo to pull your real roster and leagues
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<LinkIcon />}
              onClick={() => window.location.href = yahooApi.connectUrl()}
              sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              Connect
            </Button>
          </Box>
        )}

        {!yahooLoading && connected && sessionExpired && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#eab308' }}>
                Session Expired
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                Your Yahoo session expired — reconnect to continue
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.href = yahooApi.connectUrl()}
                sx={{ fontWeight: 600, bgcolor: '#eab308', '&:hover': { bgcolor: '#ca9d07' } }}
              >
                Reconnect
              </Button>
              <Button
                size="small"
                onClick={disconnect}
                sx={{ color: 'text.secondary', fontSize: 11 }}
              >
                Disconnect
              </Button>
            </Box>
          </Box>
        )}

        {!yahooLoading && connected && !sessionExpired && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 18 }} />
                <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#22c55e' }}>
                  Yahoo Connected
                </Typography>
              </Box>
              <Button
                size="small"
                startIcon={<LinkOffIcon />}
                onClick={disconnect}
                sx={{ color: 'text.secondary', fontSize: 11 }}
              >
                Disconnect
              </Button>
            </Box>

            {leagues.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
                  Active Leagues
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {leagues.map((league) => (
                    <Box
                      key={league.league_key}
                      sx={{
                        bgcolor: 'background.default',
                        borderRadius: 2,
                        px: 1.5,
                        py: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                          {league.name}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                          {league.num_teams} teams · Season {league.season}
                        </Typography>
                      </Box>
                      <Chip
                        label={league.scoring_type?.toUpperCase() || 'PPR'}
                        size="small"
                        sx={{ fontSize: 10, height: 20, bgcolor: 'primary.main', color: '#000', fontWeight: 700 }}
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {leagues.length === 0 && (
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                No active leagues found — check back when the season starts
              </Typography>
            )}
          </Box>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* League Preferences */}
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5 }}>
        League Preferences
      </Typography>

      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          p: 2,
          mb: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 2.5,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
            Scoring Format
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1 }}>
            Applied globally across all pages
          </Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Format</InputLabel>
            <Select
              value={scoringFormat}
              label="Format"
              onChange={(e) => setScoringFormat(e.target.value as ScoringFormat)}
            >
              <MenuItem value="PPR">PPR (Point Per Reception)</MenuItem>
              <MenuItem value="Half">Half PPR</MenuItem>
              <MenuItem value="Standard">Standard</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Divider />

        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
            Default Scoring Mode
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
            Sets the default mode across Lineup and Compare pages
          </Typography>
          <ModeSelector mode={scoringMode} onChange={setScoringMode} />
          <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1 }}>
            {scoringMode === 'floor'    && '🛡 Prioritizes safe, consistent players'}
            {scoringMode === 'balanced' && '⚖️ Weighs all factors equally'}
            {scoringMode === 'upside'   && '🚀 Targets boom potential over floor'}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* App Preferences */}
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5 }}>
        App Preferences
      </Typography>

      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          p: 2,
          mb: 3,
        }}
      >
        <FormControlLabel
          control={
            <Switch
              checked={notifications}
              onChange={(e) => setNotifications(e.target.checked)}
              color="primary"
            />
          }
          label={
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                Lineup Reminders
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                Get reminded to set your lineup before kickoff
              </Typography>
            </Box>
          }
          sx={{ alignItems: 'flex-start', mx: 0 }}
        />
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Engine Accuracy */}
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5 }}>
        Engine Accuracy
      </Typography>

      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          p: 2,
          mb: 3,
        }}
      >
        {backtestSummary ? (
          backtestSummary.total_evaluated === 0 ? (
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>
                No data yet
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                {backtestSummary.message}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Overall Accuracy</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'primary.main' }}>
                  {backtestSummary.overall_accuracy}%
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Swap Accuracy</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                  {backtestSummary.swap_accuracy ?? 'N/A'}%
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Keep Accuracy</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                  {backtestSummary.keep_accuracy ?? 'N/A'}%
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Slots Evaluated</Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                  {backtestSummary.total_evaluated}
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5 }}>
                {backtestSummary.message}
              </Typography>
            </Box>
          )
        ) : (
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            Loading accuracy data...
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* About */}
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5 }}>
        About
      </Typography>

      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          p: 2,
          mb: 3,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Version</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>1.0.0</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Scoring Engine</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>v2 — Position Weighted</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Data Sources</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Yahoo · Sleeper · Odds API</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Backend</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>FastAPI + PostgreSQL</Typography>
        </Box>
      </Box>

      {/* Save button */}
      <Button
        variant="contained"
        fullWidth
        onClick={handleSave}
        sx={{ fontWeight: 700, py: 1.5, fontSize: 15 }}
      >
        Save Settings
      </Button>

      <Typography sx={{ fontSize: 11, color: 'text.secondary', textAlign: 'center', mt: 1.5 }}>
        Format and mode changes apply instantly across all pages
      </Typography>

    </Box>
  );
};

export default Settings;