import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Autocomplete,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { mockRoster } from '../data/mockData';
import { useSettings } from '../context/SettingsContext';
import { aiApi } from '../services/api';
import type { Player } from '../types/index';

const allPlayers = [...mockRoster.starters, ...mockRoster.bench];

const VERDICT_COLORS: Record<string, string> = {
  accept:    '#22c55e',
  reject:    '#ef4444',
  negotiate: '#eab308',
};

const VERDICT_ICONS: Record<string, string> = {
  accept:    '✅',
  reject:    '❌',
  negotiate: '🤝',
};

const TradeAnalyzer = () => {
  const { scoringFormat, scoringMode } = useSettings();
  const [giving, setGiving]           = useState<Player[]>([]);
  const [getting, setGetting]         = useState<Player[]>([]);
  const [notes, setNotes]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<any>(null);
  const [error, setError]             = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!giving.length || !getting.length) return;

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const payload = {
        starters:        mockRoster.starters.map((p) => ({
          name: p.name, position: p.position, team: p.team,
          slot: p.slot, score: p.score, floor: null, ceiling: null, volatility: p.volatility,
        })),
        bench:           mockRoster.bench.map((p) => ({
          name: p.name, position: p.position, team: p.team,
          slot: p.slot, score: p.score, floor: null, ceiling: null, volatility: p.volatility,
        })),
        giving_players:  giving.map((p) => ({
          name: p.name, position: p.position, team: p.team, score: p.score,
        })),
        getting_players: getting.map((p) => ({
          name: p.name, position: p.position, team: p.team, score: p.score,
        })),
        scoring_format:  scoringFormat,
        scoring_mode:    scoringMode,
        user_notes:      notes || undefined,
      };

      const data = await aiApi.analyzeTrade(payload);
      setResult(data.analysis);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to analyze trade');
    } finally {
      setLoading(false);
    }
  };

  const verdictColor = result ? VERDICT_COLORS[result.verdict] || '#7a8099' : '#7a8099';
  const verdictIcon  = result ? VERDICT_ICONS[result.verdict] || '🤔' : '';

  return (
    <Box sx={{ p: 2 }}>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Trade Analyzer
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>
          AI-powered trade evaluation for your {scoringFormat} league
        </Typography>
      </Box>

      {/* Trade builder */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 2,
          mb: 2,
        }}
      >
        {/* You give */}
        <Box
          sx={{
            bgcolor:      'background.paper',
            border:       '1px solid',
            borderColor:  '#ef444440',
            borderRadius: 3,
            p:            2,
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>
            You Give
          </Typography>
          <Autocomplete
            multiple
            value={giving}
            onChange={(_, val) => setGiving(val)}
            options={allPlayers.filter((p) => !getting.find((g) => g.id === p.id))}
            getOptionLabel={(p) => `${p.name} (${p.position})`}
            renderValue={(value, getItemProps) =>
              value.map((p, i) => (
                <Chip
                  key={p.id}
                  label={`${p.name} · ${p.position}`}
                  size="small"
                  {...getItemProps({ index: i })}
                  sx={{ bgcolor: '#ef444420', color: '#ef4444', fontSize: 11 }}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Add players you're giving..."
                sx={{ bgcolor: 'background.default' }}
              />
            )}
          />
          {giving.length > 0 && (
            <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {giving.map((p) => (
                <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <Typography sx={{ fontSize: 12 }}>{p.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Score: {p.score}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* You get */}
        <Box
          sx={{
            bgcolor:      'background.paper',
            border:       '1px solid',
            borderColor:  '#22c55e40',
            borderRadius: 3,
            p:            2,
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: 1, mb: 1.5 }}>
            You Get
          </Typography>
          <Autocomplete
            multiple
            value={getting}
            onChange={(_, val) => setGetting(val)}
            options={allPlayers.filter((p) => !giving.find((g) => g.id === p.id))}
            getOptionLabel={(p) => `${p.name} (${p.position})`}
            renderValue={(value, getItemProps) =>
              value.map((p, i) => (
                <Chip
                  key={p.id}
                  label={`${p.name} · ${p.position}`}
                  size="small"
                  {...getItemProps({ index: i })}
                  sx={{ bgcolor: '#22c55e20', color: '#22c55e', fontSize: 11 }}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Add players you're getting..."
                sx={{ bgcolor: 'background.default' }}
              />
            )}
          />
          {getting.length > 0 && (
            <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {getting.map((p) => (
                <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <Typography sx={{ fontSize: 12 }}>{p.name}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Score: {p.score}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>

      {/* Optional notes */}
      <TextField
        fullWidth
        size="small"
        multiline
        rows={2}
        placeholder="Any context? (e.g. I need RB depth, my WR2 is injured...)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        sx={{ mb: 2, bgcolor: 'background.paper' }}
      />

      {/* Analyze button */}
      <Button
        variant="contained"
        fullWidth
        size="large"
        startIcon={loading ? <CircularProgress size={18} sx={{ color: '#000' }} /> : <SwapHorizIcon />}
        onClick={handleAnalyze}
        disabled={!giving.length || !getting.length || loading}
        sx={{ fontWeight: 700, py: 1.4, mb: 3 }}
      >
        {loading ? 'Analyzing with AI...' : 'Analyze Trade'}
      </Button>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Result */}
      {result && (
        <Box>
          {/* Verdict banner */}
          <Box
            sx={{
              bgcolor:      `${verdictColor}20`,
              border:       '1px solid',
              borderColor:  `${verdictColor}40`,
              borderRadius: 3,
              p:            2,
              mb:           2,
              display:      'flex',
              alignItems:   'center',
              gap:          2,
            }}
          >
            <Typography sx={{ fontSize: 36 }}>{verdictIcon}</Typography>
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: verdictColor, textTransform: 'uppercase', letterSpacing: 1 }}>
                {result.verdict} · {result.confidence} confidence
              </Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
                {result.summary}
              </Typography>
            </Box>
          </Box>

          {/* Detail cards */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1, mb: 0.75 }}>
                What You're Giving Up
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>
                {result.giving_analysis}
              </Typography>
            </Box>

            <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: 1, mb: 0.75 }}>
                What You're Getting Back
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>
                {result.getting_analysis}
              </Typography>
            </Box>

            <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, p: 2, border: '1px solid', borderColor: 'divider' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'primary.main', textTransform: 'uppercase', letterSpacing: 1, mb: 0.75 }}>
                Roster Impact
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>
                {result.roster_impact}
              </Typography>
            </Box>

            <Box
              sx={{
                bgcolor:      'background.paper',
                borderRadius: 3,
                p:            2,
                border:       '1px solid',
                borderColor:  `${verdictColor}40`,
              }}
            >
              <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 0.75 }}>
                💡 Recommendation
              </Typography>
              <Typography sx={{ fontSize: 13, lineHeight: 1.6 }}>
                {result.recommendation}
              </Typography>
            </Box>

            {result.counter_offer && (
              <Box sx={{ bgcolor: '#eab30815', border: '1px solid #eab30840', borderRadius: 3, p: 2 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#eab308', textTransform: 'uppercase', letterSpacing: 1, mb: 0.75 }}>
                  🤝 Counter Offer Suggestion
                </Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>
                  {result.counter_offer}
                </Typography>
              </Box>
            )}
          </Box>

          <Typography sx={{ fontSize: 11, color: 'text.secondary', textAlign: 'center', mt: 2 }}>
            Powered by Claude AI · Always apply your own judgment
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TradeAnalyzer;