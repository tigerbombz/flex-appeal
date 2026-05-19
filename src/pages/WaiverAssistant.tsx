import { useState } from 'react';
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
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { mockRoster, nflPlayerPool } from '../data/mockData';
import { useSettings } from '../context/SettingsContext';
import { aiApi } from '../services/api';
import { mockLeague } from '../data/mockData';
import type { Player } from '../types/index';

const PRIORITY_COLORS: Record<string, string> = {
  high:   '#22c55e',
  medium: '#eab308',
  low:    '#7a8099',
};

const WaiverAssistant = () => {
  const { scoringFormat, scoringMode } = useSettings();
  const [available, setAvailable]      = useState<Player[]>(nflPlayerPool);
  const [loading, setLoading]          = useState(false);
  const [result, setResult]            = useState<any>(null);
  const [error, setError]              = useState<string | null>(null);

  const handleAnalyze = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const payload = {
        starters: mockRoster.starters.map((p) => ({
          name: p.name, position: p.position, team: p.team,
          slot: p.slot, score: p.score, volatility: p.volatility,
        })),
        bench: mockRoster.bench.map((p) => ({
          name: p.name, position: p.position, team: p.team,
          slot: p.slot, score: p.score, volatility: p.volatility,
        })),
        available_players: available.map((p) => ({
          name: p.name, position: p.position, team: p.team, score: p.score,
        })),
        scoring_format: scoringFormat,
        scoring_mode:   scoringMode,
        week:           mockLeague.week,
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
          AI-powered waiver wire recommendations for Week {mockLeague.week}
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
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>
          Your Roster
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
          {[...mockRoster.starters, ...mockRoster.bench].map((p) => (
            <Chip
              key={p.id}
              label={`${p.name} · ${p.position}`}
              size="small"
              sx={{
                fontSize:    11,
                bgcolor:     mockRoster.starters.find((s) => s.id === p.id)
                  ? 'background.default'
                  : '#ffffff10',
                color:       'text.secondary',
                border:      '1px solid',
                borderColor: 'divider',
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Available players */}
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, mb: 1 }}>
          Available on Waivers
        </Typography>
        <Autocomplete
          multiple
          value={available}
          onChange={(_, val) => setAvailable(val)}
          options={nflPlayerPool}
          getOptionLabel={(p) => `${p.name} (${p.position}, ${p.team})`}
          renderValue={(value, getItemProps) =>
            value.map((p, i) => (
              <Chip
                key={p.id}
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
              placeholder="Search available players..."
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
        startIcon={loading ? <CircularProgress size={18} sx={{ color: '#000' }} /> : <PersonAddIcon />}
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
            <Box
              sx={{
                bgcolor:      'background.paper',
                border:       '1px solid',
                borderColor:  'primary.main',
                borderRadius: 3,
                p:            2,
              }}
            >
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