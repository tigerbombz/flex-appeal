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
  CircularProgress,
  Tooltip,
} from '@mui/material';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import LinkIcon           from '@mui/icons-material/Link';
import LinkOffIcon        from '@mui/icons-material/LinkOff';
import RefreshIcon        from '@mui/icons-material/Refresh';
import SyncIcon           from '@mui/icons-material/Sync';
import InfoOutlinedIcon   from '@mui/icons-material/InfoOutlined';
import { useYahooStatus, useYahooLeagues } from '../hooks/useYahoo';
import { yahooApi, backtestApi } from '../services/api';
import ModeSelector  from '../components/ModeSelector';
import { useSettings } from '../context/SettingsContext';
import type { ScoringFormat } from '../utils/scoring';

interface Props {
  onLogout: () => void;
}

// Weeks 1-18 (full NFL regular season)
const NFL_WEEKS = Array.from({ length: 18 }, (_, i) => i + 1);

const Settings = ({ onLogout }: Props) => {
  const { scoringFormat, scoringMode, setScoringFormat, setScoringMode } = useSettings();

  const [notifications, setNotifications] = useState(
    localStorage.getItem('snapdecision_notifications') === 'true'
  );
  const [saved, setSaved]                       = useState(false);
  const [backtestSummary, setBacktestSummary]   = useState<any>(null);

  // Sync week state
  const [syncWeek, setSyncWeek]                 = useState<number>(1);
  const [syncLeagueKey, setSyncLeagueKey]       = useState<string>('');
  const [syncLoading, setSyncLoading]           = useState(false);
  const [syncResult, setSyncResult]             = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const { connected, loading: yahooLoading, sessionExpired } = useYahooStatus();
  const { leagues } = useYahooLeagues(connected, sessionExpired);

  // Pre-select first league when leagues load
  useEffect(() => {
    if (leagues.length > 0 && !syncLeagueKey) {
      setSyncLeagueKey(leagues[0].league_key);
    }
  }, [leagues]);

  // Load backtest summary — re-fetch when league selection changes
  useEffect(() => {
    backtestApi
      .getSummary('2025', syncLeagueKey || undefined)
      .then(setBacktestSummary)
      .catch(console.error);
  }, [syncLeagueKey]);

  const handleSave = () => {
    localStorage.setItem('snapdecision_notifications', String(notifications));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSyncWeek = async () => {
    if (!syncLeagueKey) {
      setSyncResult({ type: 'error', message: 'Select a league first' });
      return;
    }
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const result = await backtestApi.syncWeek(syncLeagueKey, syncWeek, '2025');
      setSyncResult({
        type:    'success',
        message: `Synced ${result.players_synced} players, updated ${result.updated} evaluations for Week ${syncWeek}`,
      });
      // Refresh accuracy stats after sync
      const summary = await backtestApi.getSummary('2025', syncLeagueKey);
      setBacktestSummary(summary);
    } catch (err: any) {
      setSyncResult({
        type:    'error',
        message: err?.response?.data?.detail || 'Sync failed — try again',
      });
    } finally {
      setSyncLoading(false);
    }
  };

  const handleLogoutWithCacheClear = () => {
    // Clear league settings cache on logout so fresh data loads for next user
    yahooApi.clearLeagueSettingsCache();
    onLogout();
  };

  return (
    <Box sx={{ p: 2 }}>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Settings</Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>
          Configure your league preferences and account
        </Typography>
      </Box>

      {saved && (
        <Alert severity="success" sx={{ mb: 2, fontSize: 13 }}>
          Settings saved successfully
        </Alert>
      )}

      {/* ── Yahoo Account ────────────────────────────────────────────────── */}
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5 }}>
        Yahoo Account
      </Typography>
      <Box
        sx={{
          bgcolor:      'background.paper',
          border:       '1px solid',
          borderColor:  connected && !sessionExpired ? '#22c55e40' : 'divider',
          borderRadius: 3,
          p:            2,
          mb:           3,
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
              <Typography sx={{ fontWeight: 600, fontSize: 14 }}>Not connected</Typography>
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
                onClick={() => {
                  yahooApi.clearLeagueSettingsCache();
                  window.location.href = yahooApi.connectUrl();
                }}
                sx={{ fontWeight: 600, bgcolor: '#eab308', '&:hover': { bgcolor: '#ca9d07' } }}
              >
                Reconnect
              </Button>
              <Button
                size="small"
                onClick={handleLogoutWithCacheClear}
                sx={{ color: 'text.secondary', fontSize: 11 }}
              >
                Sign Out
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
                onClick={handleLogoutWithCacheClear}
                sx={{ color: 'text.secondary', fontSize: 11 }}
              >
                Sign Out
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
                        bgcolor:        'background.default',
                        borderRadius:   2,
                        px:             1.5,
                        py:             1,
                        display:        'flex',
                        justifyContent: 'space-between',
                        alignItems:     'center',
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
                        label={(league as any).scoring_format?.toUpperCase() || 'PPR'}
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

      {/* ── League Preferences ───────────────────────────────────────────── */}
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5 }}>
        League Preferences
      </Typography>
      <Box
        sx={{
          bgcolor:       'background.paper',
          border:        '1px solid',
          borderColor:   'divider',
          borderRadius:  3,
          p:             2,
          mb:            3,
          display:       'flex',
          flexDirection: 'column',
          gap:           2.5,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>Scoring Format</Typography>
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
          <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>Default Scoring Mode</Typography>
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

      {/* ── App Preferences ──────────────────────────────────────────────── */}
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5 }}>
        App Preferences
      </Typography>
      <Box
        sx={{
          bgcolor:      'background.paper',
          border:       '1px solid',
          borderColor:  'divider',
          borderRadius: 3,
          p:            2,
          mb:           3,
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
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Lineup Reminders</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                Get reminded to set your lineup before kickoff
              </Typography>
            </Box>
          }
          sx={{ alignItems: 'flex-start', mx: 0 }}
        />
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* ── Engine Accuracy ───────────────────────────────────────────────── */}
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5 }}>
        Engine Accuracy
      </Typography>
      <Box
        sx={{
          bgcolor:      'background.paper',
          border:       '1px solid',
          borderColor:  'divider',
          borderRadius: 3,
          p:            2,
          mb:           2,
        }}
      >
        {backtestSummary ? (
          backtestSummary.total_evaluated === 0 ? (
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5 }}>No data yet</Typography>
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
              {backtestSummary.avg_score_diff != null && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                      Avg Swap Gain
                    </Typography>
                    <Tooltip title="Average fantasy points gained when following a swap recommendation">
                      <InfoOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                    </Tooltip>
                  </Box>
                  <Typography
                    sx={{
                      fontSize:   13,
                      fontWeight: 600,
                      color:      backtestSummary.avg_score_diff >= 0 ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {backtestSummary.avg_score_diff >= 0 ? '+' : ''}
                    {backtestSummary.avg_score_diff} pts
                  </Typography>
                </Box>
              )}
              {backtestSummary.leagues_tracked > 1 && (
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  Across {backtestSummary.leagues_tracked} leagues
                </Typography>
              )}
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

      {/* ── Sync Week ─────────────────────────────────────────────────────── */}
      <Box
        sx={{
          bgcolor:      'background.paper',
          border:       '1px solid',
          borderColor:  'divider',
          borderRadius: 3,
          p:            2,
          mb:           3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>Sync Week Results</Typography>
          <Tooltip title="Pulls actual fantasy points from Yahoo for a completed week. Run this Tuesday morning after stats finalize.">
            <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          </Tooltip>
        </Box>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 2 }}>
          After each week finishes, sync to update engine accuracy stats
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, flexWrap: 'wrap' }}>
          {/* League selector — only shown when user has multiple leagues */}
          {leagues.length > 1 && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>League</InputLabel>
              <Select
                value={syncLeagueKey}
                label="League"
                onChange={(e) => setSyncLeagueKey(e.target.value)}
              >
                {leagues.map((l) => (
                  <MenuItem key={l.league_key} value={l.league_key}>
                    {l.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>Week</InputLabel>
            <Select
              value={syncWeek}
              label="Week"
              onChange={(e) => setSyncWeek(Number(e.target.value))}
            >
              {NFL_WEEKS.map((w) => (
                <MenuItem key={w} value={w}>Week {w}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            size="small"
            startIcon={syncLoading ? <CircularProgress size={14} color="inherit" /> : <SyncIcon />}
            onClick={handleSyncWeek}
            disabled={syncLoading || !connected || !syncLeagueKey}
            sx={{ fontWeight: 600, whiteSpace: 'nowrap', alignSelf: 'center' }}
          >
            {syncLoading ? 'Syncing…' : 'Sync Week'}
          </Button>
        </Box>

        {syncResult && (
          <Alert
            severity={syncResult.type}
            sx={{ fontSize: 12 }}
            onClose={() => setSyncResult(null)}
          >
            {syncResult.message}
          </Alert>
        )}

        {!connected && (
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
            Connect Yahoo to enable week syncing
          </Typography>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* ── About ─────────────────────────────────────────────────────────── */}
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5 }}>
        About
      </Typography>
      <Box
        sx={{
          bgcolor:       'background.paper',
          border:        '1px solid',
          borderColor:   'divider',
          borderRadius:  3,
          p:             2,
          mb:            3,
          display:       'flex',
          flexDirection: 'column',
          gap:           1,
        }}
      >
        {[
          ['Version',         '1.0.0'],
          ['Scoring Engine',  'v2 — League Personalized'],
          ['Data Sources',    'Yahoo · Sleeper · Odds API'],
          ['Backend',         'FastAPI + PostgreSQL'],
        ].map(([label, value]) => (
          <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{label}</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{value}</Typography>
          </Box>
        ))}
      </Box>

      {/* Save */}
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