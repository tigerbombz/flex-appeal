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
import { NFL_TEAMS, dstToPlayer } from '../data/nflTeams';
import { useScoring } from '../hooks/useScoring';
import { usePlayers, toPlayer } from '../hooks/usePlayers';
import ModeSelector from '../components/ModeSelector';
import type { ScoringFormat } from '../utils/scoring';
import type { ScoringMode } from '../hooks/useScoring';
import type { Player } from '../types/index';
import type { SleeperPlayer } from '../hooks/usePlayers';

type PositionFilter = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';

const dstPool: Player[] = NFL_TEAMS.map(dstToPlayer);

const PlayerCompare = () => {
  const [comparedPlayers, setComparedPlayers] = useState<Player[]>([
    mockRoster.starters[3],
    mockRoster.starters[4],
  ]);
  const [scoringFormat, setScoringFormat] = useState<ScoringFormat>('PPR');
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL');
  const [scoringMode, setScoringMode] = useState<ScoringMode>('balanced');
  const [searchValue, setSearchValue] = useState<SleeperPlayer | Player | null>(null);
  const [inputValue, setInputValue] = useState('');

  const { results, loading: searchLoading, search, clearResults } = usePlayers();

  const { scoredPlayers, loading: scoreLoading, error, topPick } = useScoring(
    comparedPlayers,
    scoringFormat,
    scoringMode
  );

  // Build search options based on position filter and input
  const searchOptions = useMemo((): (SleeperPlayer | Player)[] => {
    const alreadyAdded = comparedPlayers.map((p) => p.id);

    if (positionFilter === 'DST') {
      // Show all 32 DSTs filtered by search input
      return dstPool.filter((p) => {
        if (alreadyAdded.includes(p.id)) return false;
        if (!inputValue) return true;
        const q = inputValue.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.team.toLowerCase().includes(q)
        );
      });
    }

    if (positionFilter === 'ALL') {
      // Combine Sleeper results with DST matches
      const sleeperResults = results.filter(
        (p) => !alreadyAdded.includes(parseInt(p.id))
      );

      // Also filter DSTs by search input for ALL mode
      const dstMatches: Player[] = inputValue
        ? dstPool.filter((p) => {
            if (alreadyAdded.includes(p.id)) return false;
            const q = inputValue.toLowerCase();
            return (
              p.name.toLowerCase().includes(q) ||
              p.team.toLowerCase().includes(q)
            );
          })
        : [];

      return [...sleeperResults, ...dstMatches];
    }

    // Specific position filter (QB/RB/WR/TE/K)
    return results.filter(
      (p) => !alreadyAdded.includes(parseInt(p.id))
    );
  }, [positionFilter, results, comparedPlayers, inputValue, dstPool]);

  const sortedPlayers = useMemo(() => {
    return [...comparedPlayers].sort((a, b) => {
      const scoreA = scoredPlayers.find((s) => s.id === a.id)?.adjustedScore ?? a.score;
      const scoreB = scoredPlayers.find((s) => s.id === b.id)?.adjustedScore ?? b.score;
      return scoreB - scoreA;
    });
  }, [comparedPlayers, scoredPlayers]);

  const topPlayer = sortedPlayers[0];

  const handleAdd = (player: Player | SleeperPlayer | null) => {
    if (!player) return;
    if (comparedPlayers.length >= 5) return;

    // Check if DST (Player shape)
    if ('position' in player && (player.position === 'DST' || player.position === 'D/ST')) {
      const dstPlayer = player as Player;
      if (comparedPlayers.find((p) => p.id === dstPlayer.id)) return;
      setComparedPlayers((prev) => [...prev, { ...dstPlayer, isLocked: false }]);
    } else if ('id' in player && typeof (player as SleeperPlayer).id === 'string') {
      // Sleeper player
      const sleeperPlayer = player as SleeperPlayer;
      if (comparedPlayers.find((p) => p.id === parseInt(sleeperPlayer.id))) return;
      setComparedPlayers((prev) => [...prev, toPlayer(sleeperPlayer)]);
    }

    setSearchValue(null);
    setInputValue('');
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

  const getOptionLabel = (option: SleeperPlayer | Player): string => {
    if ('position' in option && option.position === 'DST') {
      return `${option.name} · ${option.team}`;
    }
    const p = option as SleeperPlayer;
    return `${p.name} · ${p.position} · ${p.team}`;
  };

  return (
    <Box sx={{ p: 2 }}>

      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Player Compare
        </Typography>
        <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}>
          Compare up to 5 players · QB, RB, WR, TE, K, D/ST supported
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
            onChange={(e) => {
              setPositionFilter(e.target.value as PositionFilter);
              clearResults();
              setSearchValue(null);
              setInputValue('');
            }}
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
          inputValue={inputValue}
          onInputChange={(_, value) => {
            setInputValue(value);
            if (positionFilter !== 'DST') {
              search(
                value,
                positionFilter !== 'ALL' ? positionFilter : undefined
              );
            }
          }}
          onChange={(_, newValue) => setSearchValue(newValue)}
          options={searchOptions}
          getOptionLabel={getOptionLabel}
          filterOptions={(x) => x}
          isOptionEqualToValue={(option, value) => {
            const optId = 'position' in option && option.position === 'DST'
              ? (option as Player).id
              : parseInt((option as SleeperPlayer).id);
            const valId = 'position' in value && value.position === 'DST'
              ? (value as Player).id
              : parseInt((value as SleeperPlayer).id);
            return optId === valId;
          }}
          loading={searchLoading}
          openOnFocus={positionFilter === 'DST'}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder={
                positionFilter === 'DST'
                  ? 'Search or select a D/ST...'
                  : 'Search any NFL player or D/ST...'
              }
              sx={{ bgcolor: 'background.paper' }}
            />
          )}
          sx={{ flex: 1 }}
          disabled={comparedPlayers.length >= 5}
          noOptionsText={
            inputValue.length < 1
              ? 'Start typing to search...'
              : positionFilter === 'DST'
              ? 'No D/ST found'
              : 'No players found'
          }
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
              {scoreLoading ? 'Calculating...' : `Top Pick · ${scoringFormat} · ${scoringMode}`}
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
        <Typography sx={{ mt: 2, fontSize: 12, color: 'text.secondary', textAlign: 'center' }}>
          Maximum of 5 players reached — remove one to add another.
        </Typography>
      )}

      {/* Empty state */}
      {comparedPlayers.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography sx={{ fontSize: 32, mb: 1 }}>⚖️</Typography>
          <Typography sx={{ fontWeight: 600, mb: 0.5 }}>No players added yet</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            Search for any NFL player or D/ST above to start comparing
          </Typography>
        </Box>
      )}

    </Box>
  );
};

export default PlayerCompare;