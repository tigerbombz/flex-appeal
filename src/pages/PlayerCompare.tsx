import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Button,
  Autocomplete,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlayerCompareCard from '../components/PlayerCompareCard';
import { mockRoster, nflPlayerPool } from '../data/mockData';
import { calcAdjustedScore } from '../utils/scoring';
import type { ScoringFormat } from '../utils/scoring';
import type { Player } from '../types/index';

type PositionFilter = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE';

// Combine roster + NFL pool, deduplicate by id
const allPlayers: Player[] = [
  ...mockRoster.starters,
  ...mockRoster.bench,
  ...nflPlayerPool,
].filter((p, index, self) => self.findIndex((x) => x.id === p.id) === index);

const PlayerCompare = () => {
  const [comparedPlayers, setComparedPlayers] = useState<Player[]>([
    mockRoster.starters[3], // Justin Jefferson
    mockRoster.starters[4], // Tyreek Hill
  ]);
  const [scoringFormat, setScoringFormat] = useState<ScoringFormat>('PPR');
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL');
  const [searchValue, setSearchValue] = useState<Player | null>(null);

  const filteredPool = useMemo(
    () =>
      allPlayers.filter((p) => {
        if (positionFilter !== 'ALL' && p.position !== positionFilter) return false;
        if (comparedPlayers.find((c) => c.id === p.id)) return false;
        return true;
      }),
    [positionFilter, comparedPlayers]
  );

  const sortedPlayers = useMemo(
    () =>
      [...comparedPlayers].sort(
        (a, b) => calcAdjustedScore(b, scoringFormat) - calcAdjustedScore(a, scoringFormat)
      ),
    [comparedPlayers, scoringFormat]
  );

  const topPlayer = sortedPlayers[0];

  const handleAdd = (player: Player | null) => {
    if (!player) return;
    if (comparedPlayers.length >= 5) return;
    if (comparedPlayers.find((p) => p.id === player.id)) return;
    setComparedPlayers((prev) => [...prev, { ...player, isLocked: false }]);
    setSearchValue(null);
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
          Compare up to 5 players · scores adjust for your league settings
        </Typography>
      </Box>

      {/* Settings row */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
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
          </Select>
        </FormControl>
      </Box>

      {/* Search + add */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, alignItems: 'center' }}>
        <Autocomplete
          value={searchValue}
          onChange={(_, newValue) => setSearchValue(newValue)}
          options={filteredPool}
          getOptionLabel={(option) => `${option.name} · ${option.position} · ${option.team}`}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder="Search any NFL player..."
              sx={{ bgcolor: 'background.paper' }}
            />
          )}
          sx={{ flex: 1 }}
          disabled={comparedPlayers.length >= 5}
        />
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => handleAdd(searchValue)}
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
              Top Pick · {scoringFormat}
            </Typography>
            <Typography sx={{ fontSize: 20, fontWeight: 700, color: '#000' }}>
              {topPlayer.name}
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#00000080' }}>
              {topPlayer.team} · vs {topPlayer.opponent} · {topPlayer.matchupDifficulty} matchup
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 36, fontWeight: 700, color: '#000' }}>
            {calcAdjustedScore(topPlayer, scoringFormat)}
          </Typography>
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />

      {/* Player cards sorted by score */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {sortedPlayers.map((player, index) => (
          <PlayerCompareCard
            key={player.id}
            player={player}
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