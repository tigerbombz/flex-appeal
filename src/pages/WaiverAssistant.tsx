import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  Autocomplete,
} from '@mui/material';
import PersonAddIcon      from '@mui/icons-material/PersonAdd';
// import RefreshIcon        from '@mui/icons-material/Refresh';
import { mockRoster, nflPlayerPool, mockLeague } from '../data/mockData';
import { useSettings }    from '../context/SettingsContext';
import { useYahooStatus } from '../hooks/useYahoo';
import { useRoster }      from '../hooks/useRoster';
import { aiApi, yahooApi } from '../services/api';
import type { Player }    from '../types/index';

const PRIORITY_COLORS: Record<string, string> = {
  high:   '#22c55e',
  medium: '#eab308',
  low:    '#7a8099',
};

// Shape of a free agent from Yahoo (richer than our Player type)
interface FreeAgent {
  player_key:    string;
  name:          string;
  position:      string;
  team:          string;
  status:        string;
  injury_note:   string;
  ownership_pct: number;
  bye_week:      string | null;
  score:         number;
}

// Convert FreeAgent to Player shape for the autocomplete + AI payload
const freeAgentToPlayer = (fa: FreeAgent): Player => ({
  id:                 parseInt(fa.player_key) || Math.abs(fa.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)),
  name:               fa.name,
  position:           fa.position,
  slot:               fa.position,
  team:               fa.team,
  opponent:           'TBD',
  score:              fa.score ?? 50,
  volatility:         'Medium',
  status:             fa.status === 'Active' ? 'active' : 'questionable',
  matchupDifficulty:  'Medium',
  isLocked:           false,
  isDome:             false,
  weather:            'Clear',
  trend:              'neutral',
  usage:              'Medium',
  passingYardsProp:   null,
  rushingYardsProp:   null,
  receivingYardsProp: null,
  pointsAllowedProp:  null,
  projectedFgProp:    null,
  teamTotal:          null,
  oppTotal:           null,
  avgYards:           null,
  oppRank:            null,
  oppPointsAllowed:   null,
  snapPct:            null,
  targetShare:        null,
  carryShare:         null,
  pointsLastThree:    [],
} as Player);

const WaiverAssistant = () => {
  const { scoringFormat, scoringMode } = useSettings();
  const { connected, sessionExpired }  = useYahooStatus();

  const selectedLeagueKey = localStorage.getItem('selected_league_key') ?? '';

  const {
    starters:    rosterStarters,
    bench:       rosterBench,
    isRealData,
    loading:     rosterLoading,
    week,
  } = useRoster(connected, sessionExpired, selectedLeagueKey, scoringFormat);

  const starters   = rosterStarters.length ? rosterStarters : mockRoster.starters;
  const bench      = rosterBench.length    ? rosterBench    : mockRoster.bench;
  const activeWeek = week ?? mockLeague.week;

  // Free agents state
  const [freeAgents, setFreeAgents]         = useState<FreeAgent[]>([]);
  const [freeAgentsLoading, setFreeAgentsLoading] = useState(false);
  const [freeAgentsSource, setFreeAgentsSource]   = useState<'yahoo' | 'mock'>('mock');

  // Available players selected for analysis (starts pre-filled)
  const [available, setAvailable] = useState<Player[]>([]);

  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<any>(null);
  const [error, setError]     = useState<string | null>(null);

  // Fetch real free agents when Yahoo is connected and league is selected
  useEffect(() => {
    if (!connected || sessionExpired || !selectedLeagueKey) {
      // Offseason / not connected — use mock pool
      setFreeAgents([]);
      setAvailable(nflPlayerPool.slice(0, 10) as unknown as Player[]);
      setFreeAgentsSource('mock');
      return;
    }

    const fetchFreeAgents = async () => {
      try {
        setFreeAgentsLoading(true);
        const data = await yahooApi.getFreeAgents(selectedLeagueKey);

        if (data?.players?.length) {
          setFreeAgents(data.players);
          // Pre-fill available with top 10 by ownership so page is ready to analyze
          const top10 = data.players.slice(0, 10).map(freeAgentToPlayer);
          setAvailable(top10);
          setFreeAgentsSource('yahoo');
        } else {
          // Yahoo returned nothing (offseason) — fall back to mock
          setFreeAgents([]);
          setAvailable(nflPlayerPool.slice(0, 10) as unknown as Player[]);
          setFreeAgentsSource('mock');
        }
      } catch {
        setFreeAgents([]);
        setAvailable(nflPlayerPool.slice(0, 10) as unknown as Player[]);
        setFreeAgentsSource('mock');
      } finally {
        setFreeAgentsLoading(false);
      }
    };

    fetchFreeAgents();
  }, [connected, sessionExpired, selectedLeagueKey]);

  // Autocomplete options — Yahoo free agents when available, mock pool as fallback
  const autocompleteOptions: Player[] =
    freeAgentsSource === 'yahoo'
      ? freeAgents.map(freeAgentToPlayer)
      : (nflPlayerPool as unknown as Player[]);

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      // Build enriched available_players payload with ownership % and status
      // so Claude has full context for each waiver candidate
      const availableWithContext = available.map((p) => {
        const fa = freeAgents.find((f) => f.name === p.name || f.player_key === String(p.id));
        return {
          name:          p.name,
          position:      p.position,
          team:          p.team,
          score:         p.score,
          status:        fa?.status        ?? 'Active',
          ownership_pct: fa?.ownership_pct ?? null,
          bye_week:      fa?.bye_week      ?? null,
          injury_note:   fa?.injury_note   ?? '',
        };
      });

      const payload = {
        starters: starters.map((p) => ({
          name:       p.name,
          position:   p.position,
          team:       p.team,
          slot:       p.slot,
          score:      p.score,
          volatility: p.volatility,
          status:     p.status,
          pointsLastThree: p.pointsLastThree ?? [],
        })),
        bench: bench.map((p) => ({
          name:       p.name,
          position:   p.position,
          team:       p.team,
          slot:       p.slot,
          score:      p.score,
          volatility: p.volatility,
          status:     p.status,
          pointsLastThree: p.pointsLastThree ?? [],
        })),
        available_players: availableWithContext,
        scoring_format:    scoringFormat,
        scoring_mode:      scoringMode,
        week:              activeWeek,
      };

      const data = await aiApi.analyzeWaiver(payload);
      setResult(data.recommendations);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to get waiver recommendations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Waiver Assistant
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>
          AI-powered waiver wire recommendations for Week {activeWeek}
          {rosterLoading && (
            <CircularProgress size={10} sx={{ ml: 1, verticalAlign: 'middle' }} />
          )}
        </Typography>
      </Box>

      {/* Roster summary */}
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
            Your Roster
          </Typography>
          {rosterLoading ? (
            <Chip label="Loading…" size="small" sx={{ fontSize: 10, height: 18, bgcolor: 'background.default', color: 'text.secondary' }} />
          ) : isRealData ? (
            <Chip label="Live from Yahoo" size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40' }} />
          ) : (
            <Chip label="Mock data" size="small" sx={{ fontSize: 10, height: 18, bgcolor: 'background.default', color: 'text.secondary' }} />
          )}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {[...starters, ...bench].map((p) => (
            <Chip
              key={p.id}
              label={`${p.name} · ${p.position}`}
              size="small"
              sx={{
                fontSize:    11,
                bgcolor:     starters.find((s) => s.id === p.id) ? 'background.default' : '#ffffff10',
                color:       'text.secondary',
                border:      '1px solid',
                borderColor: 'divider',
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Available players / waiver pool */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
            Waiver Pool
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {freeAgentsLoading ? (
              <Chip label="Fetching waivers…" size="small" sx={{ fontSize: 10, height: 18, bgcolor: 'background.default', color: 'text.secondary' }} />
            ) : freeAgentsSource === 'yahoo' ? (
              <Chip label={`${freeAgents.length} available · Live`} size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40' }} />
            ) : (
              <Chip label="Mock pool · Offseason" size="small" sx={{ fontSize: 10, height: 18, bgcolor: 'background.default', color: 'text.secondary' }} />
            )}
          </Box>
        </Box>

        {/* Show top free agents as quick-add chips when Yahoo data is available */}
        {freeAgentsSource === 'yahoo' && freeAgents.length > 0 && (
          <Box sx={{ mb: 1.5 }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.75 }}>
              Top available by ownership %:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {freeAgents.slice(0, 8).map((fa) => (
                <Chip
                  key={fa.player_key}
                  label={`${fa.name} · ${fa.position} · ${fa.ownership_pct.toFixed(0)}%`}
                  size="small"
                  onClick={() => {
                    const p = freeAgentToPlayer(fa);
                    if (!available.find((a) => a.id === p.id)) {
                      setAvailable((prev) => [...prev, p]);
                    }
                  }}
                  sx={{
                    fontSize:    10,
                    cursor:      'pointer',
                    bgcolor:     fa.status !== 'Active' ? '#ef444415' : 'background.paper',
                    color:       fa.status !== 'Active' ? '#ef4444'   : 'text.secondary',
                    border:      '1px solid',
                    borderColor: fa.status !== 'Active' ? '#ef444430' : 'divider',
                    '&:hover':   { bgcolor: 'action.hover' },
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        <Autocomplete
          multiple
          value={available}
          onChange={(_, val) => setAvailable(val)}
          options={autocompleteOptions}
          getOptionLabel={(p) => `${p.name} (${p.position}, ${p.team})`}
          renderValue={(value, getItemProps) =>
            value.map((p, i) => (
              <Chip
                label={`${p.name} · ${p.position}`}
                size="small"
                {...getItemProps({ index: i })}
                sx={{ fontSize: 11 }}
              />
            ))
          }
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder={
                freeAgentsLoading
                  ? 'Loading waiver pool…'
                  : freeAgentsSource === 'yahoo'
                  ? 'Search your waiver wire…'
                  : 'Search players…'
              }
              sx={{ bgcolor: 'background.paper' }}
            />
          )}
        />
      </Box>

      {/* Analyze button */}
      <Button
        variant="contained"
        fullWidth
        size="large"
        startIcon={
          loading
            ? <CircularProgress size={18} sx={{ color: '#000' }} />
            : <PersonAddIcon />
        }
        onClick={handleAnalyze}
        disabled={loading || !available.length}
        sx={{ fontWeight: 700, py: 1.4, mb: 3 }}
      >
        {loading ? 'Analyzing with AI...' : 'Get Waiver Recommendations'}
      </Button>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Results */}
      {result && (
        <Box>
          {/* Roster analysis */}
          <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2, mb: 2 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', letterSpacing: 1, mb: 0.75 }}>
              Roster Analysis
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>
              {result.roster_analysis}
            </Typography>
            {result.priority_positions?.length > 0 && (
              <Box sx={{ display: 'flex', gap: 0.75, mt: 1.5, flexWrap: 'wrap' }}>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', alignSelf: 'center' }}>
                  Priority positions:
                </Typography>
                {result.priority_positions.map((pos: string) => (
                  <Chip
                    key={pos}
                    label={pos}
                    size="small"
                    sx={{ fontSize: 11, bgcolor: 'primary.main', color: '#000', fontWeight: 700 }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* Recommendations */}
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>
            Recommendations
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
            {result.recommendations?.map((rec: any, i: number) => (
              <Box
                key={i}
                sx={{
                  bgcolor:      'background.paper',
                  border:       '1px solid',
                  borderColor:  `${PRIORITY_COLORS[rec.priority]}40`,
                  borderRadius: 3,
                  p:            2,
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
                        ➕ {rec.player}
                      </Typography>
                      <Chip
                        label={rec.position}
                        size="small"
                        sx={{ fontSize: 10, height: 18, bgcolor: 'background.default', color: 'text.secondary' }}
                      />
                    </Box>
                    {rec.drop_player && (
                      <Typography sx={{ fontSize: 12, color: '#ef4444' }}>
                        ➖ Drop: {rec.drop_player}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    label={rec.priority}
                    size="small"
                    sx={{
                      fontSize:    11,
                      fontWeight:  700,
                      height:      22,
                      bgcolor:     `${PRIORITY_COLORS[rec.priority]}20`,
                      color:       PRIORITY_COLORS[rec.priority],
                      border:      '1px solid',
                      borderColor: `${PRIORITY_COLORS[rec.priority]}40`,
                    }}
                  />
                </Box>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>
                  {rec.reasoning}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Weekly tip */}
          {result.weekly_tip && (
            <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'primary.main', borderRadius: 3, p: 2 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', letterSpacing: 1, mb: 0.75 }}>
                💡 Weekly Tip
              </Typography>
              <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>
                {result.weekly_tip}
              </Typography>
            </Box>
          )}

          <Typography sx={{ fontSize: 11, color: 'text.secondary', textAlign: 'center', mt: 2 }}>
            Powered by Claude AI · Always apply your own judgment
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default WaiverAssistant;