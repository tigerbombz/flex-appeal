import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Button,
  Autocomplete,
  Divider,
  Alert,
  CircularProgress,
  TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayerCompareCard from '../components/PlayerCompareCard';
import { mockRoster } from '../data/mockData';
import { useScoring } from '../hooks/useScoring';
import { usePlayers, toPlayer } from '../hooks/usePlayers';
import type { ScoringFormat } from '../utils/scoring';
import type { Player } from '../types/index';
import type { SleeperPlayer } from '../hooks/usePlayers';
import ModeSelector from '../components/ModeSelector';
import type { ScoringMode } from '../hooks/useScoring';

type PositionFilter = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';

const PlayerCompare = () => {
  const [comparedPlayers, setComparedPlayers] = useState<Player[]>([
    mockRoster.starters[3], // Justin Jefferson
    mockRoster.starters[4], // Tyreek Hill
  ]);
  const [scoringFormat, setScoringFormat] = useState<ScoringFormat>('PPR');
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL');
  const [searchValue, setSearchValue] = useState<SleeperPlayer | null>(null);
  const [scoringMode, setScoringMode] = useState<ScoringMode>('balanced');

  // Live player search from Sleeper via backend
  const { results, loading: searchLoading, search, clearResults } = usePlayers();

  // Backend scoring hook
  const { scoredPlayers, loading: scoreLoading, error, topPick } = useScoring(
  comparedPlayers,
  scoringFormat,
  scoringMode
);

  // Sort by backend adjusted score, fall back to mock score
  const sortedPlayers = useMemo(() => {
    return [...comparedPlayers].sort((a, b) => {
      const scoreA = scoredPlayers.find((s) => s.id === a.id)?.adjustedScore ?? a.score;
      const scoreB = scoredPlayers.find((s) => s.id === b.id)?.adjustedScore ?? b.score;
      return scoreB - scoreA;
    });
  }, [comparedPlayers, scoredPlayers]);

  const topPlayer = sortedPlayers[0];

  const handleAdd = (player: Player | null) => {
    if (!player) return;
    if (comparedPlayers.length >= 5) return;
    if (comparedPlayers.find((p) => p.id === player.id)) return;
    setComparedPlayers((prev) => [...prev, { ...player, isLocked: false }]);
    setSearchValue(null);
    clearResults();
  };

  const handleRemove = (id: number) => {
    setComparedPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleToggleLock = (id: number) => {
    setComparedPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isLocked: !p.isLocked } : p))
    );
  };

  return (
    <Box sx={{ p: 2 }}>

      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Player Compare
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>
          Compare up to 5 players · scores from backend engine
        </Typography>
      </Box>

      {/* Error banner */}
      {error && (
        <Alert severity="warning" sx={{ mb: 2, fontSize: 13 }}>
          {error}
        </Alert>
      )}

      {/* Settings row */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>Format</InputLabel>
          <Select
            value={scoringFormat}
            label="Format"
            onChange={(e) => setScoringFormat(e.target.value as ScoringFormat)}
          >
            <MenuItem value="PPR">PPR</MenuItem>
            <MenuItem value="Half">Half PPR</MenuItem>
            <MenuItem value="Standard">Standard</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 110 }}>
          <InputLabel>Position</InputLabel>
          <Select
            value={positionFilter}
            label="Position"
            onChange={(e) => setPositionFilter(e.target.value as PositionFilter)}
          >
            <MenuItem value="ALL">All</MenuItem>
            <MenuItem value="QB">QB</MenuItem>
            <MenuItem value="RB">RB</MenuItem>
            <MenuItem value="WR">WR</MenuItem>
            <MenuItem value="TE">TE</MenuItem>
            <MenuItem value="K">K</MenuItem>
            <MenuItem value="DST">D/ST</MenuItem>
          </Select>
        </FormControl>

        <ModeSelector mode={scoringMode} onChange={setScoringMode} />
      </Box>

      {/* Search + add */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, alignItems: 'center' }}>
        <Autocomplete
          value={searchValue}
          onChange={(_, newValue) => setSearchValue(newValue)}
          options={results}
          getOptionLabel={(option) => `${option.name} · ${option.position} · ${option.team}`}
          onInputChange={(_, value) =>
            search(value, positionFilter !== 'ALL' ? positionFilter : undefined)
          }
          loading={searchLoading}
          filterOptions={(x) => x}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder="Search any NFL player..."
              sx={{ bgcolor: 'background.paper' }}
              // InputProps={{
              //   ...params.InputProps,
              //   endAdornment: (
              //     <>
              //       {searchLoading && <CircularProgress size={16} />}
              //       {params.InputProps.endAdornment}
              //     </>
              //   ),
              // }}
            />
          )}
          sx={{ flex: 1 }}
          disabled={comparedPlayers.length >= 5}
          noOptionsText="Type to search NFL players..."
        />
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => {
            if (searchValue) {
              handleAdd(toPlayer(searchValue));
            }
          }}
          disabled={!searchValue || comparedPlayers.length >= 5}
          sx={{ whiteSpace: 'nowrap', py: 1 }}
        >
          Add
        </Button>
      </Box>

      {/* Verdict banner */}
      {topPlayer && (
        <Box
          sx={{
            bgcolor: 'primary.main',
            borderRadius: 3,
            px: 2,
            py: 1.5,
            mb: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Box>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: '#000',
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              {scoreLoading ? 'Calculating...' : `Top Pick · ${scoringFormat}`}
            </Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#000' }}>
              {scoreLoading ? '...' : topPick ?? topPlayer.name}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#00000080' }}>
              {topPlayer.team} · vs {topPlayer.opponent} · {topPlayer.matchupDifficulty} matchup
            </Typography>
          </Box>
          {scoreLoading ? (
            <CircularProgress size={32} sx={{ color: '#000' }} />
          ) : (
            <Typography sx={{ fontSize: 36, fontWeight: 700, color: '#000' }}>
              {scoredPlayers.find((s) => s.id === topPlayer.id)?.adjustedScore ?? topPlayer.score}
            </Typography>
          )}
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Player cards sorted by score */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sortedPlayers.map((player, index) => (
          <PlayerCompareCard
            key={player.id}
            player={player}
            scoredData={scoredPlayers.find((s) => s.id === player.id) ?? null}
            onRemove={handleRemove}
            onToggleLock={handleToggleLock}
            scoringFormat={scoringFormat}
            rank={index + 1}
          />
        ))}
      </Box>

      {/* Max players notice */}
      {comparedPlayers.length >= 5 && (
        <Typography
          sx={{ mt: 2, fontSize: 12, color: 'text.secondary', textAlign: 'center' }}
        >
          Maximum of 5 players reached — remove one to add another.
        </Typography>
      )}

      {/* Empty state */}
      {comparedPlayers.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography sx={{ fontSize: 32, mb: 1 }}>⚖️</Typography>
          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>No players added yet</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            Search for any NFL player above to start comparing
          </Typography>
        </Box>
      )}

    </Box>
  );
};

export default PlayerCompare;