import { Box, Typography, Chip, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import type { Player } from '../types/index';
import type { ScoringFormat } from '../utils/scoring';
import type { ScoredPlayer } from '../hooks/useScoring';
import {
  getScoreColor,
  getScoreLabel,
  getTrendIcon,
  getTrendColor,
  getMatchupColor,
} from '../utils/scoring';

interface Props {
  player: Player;
  scoredData: ScoredPlayer | null;
  onRemove: (id: number) => void;
  onToggleLock: (id: number) => void;
  scoringFormat: ScoringFormat;
  rank: number;
}

const getRankLabel = (rank: number): string => {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
};

const PlayerCompareCard = ({ player, scoredData, onRemove, onToggleLock, scoringFormat, rank }: Props) => {
  // Use backend score if available, fall back to mock score
  const adjustedScore = scoredData?.adjustedScore ?? player.score;
  const explanation = scoredData?.explanation ?? 'Loading explanation...';
  const scoreColor = getScoreColor(adjustedScore);
  const scoreLabel = getScoreLabel(adjustedScore);

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: player.isLocked ? 'primary.main' : 'divider',
        borderRadius: 3,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        transition: 'border-color 0.2s',
      }}
    >
      {/* Top row */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: 18 }}>{getRankLabel(rank)}</Typography>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
                {player.name}
              </Typography>
              {player.status === 'questionable' && (
                <Chip label="Q" size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#eab30820', color: '#eab308', fontWeight: 700 }} />
              )}
              {player.status === 'out' && (
                <Chip label="OUT" size="small" sx={{ fontSize: 10, height: 18, bgcolor: '#ef444420', color: '#ef4444', fontWeight: 700 }} />
              )}
            </Box>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {player.team} · {player.position} · vs {player.opponent}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => onToggleLock(player.id)}
            sx={{ color: player.isLocked ? 'primary.main' : 'text.secondary' }}
          >
            {player.isLocked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
          </IconButton>
          <IconButton
            size="small"
            onClick={() => onRemove(player.id)}
            sx={{ color: 'text.secondary' }}
            disabled={player.isLocked}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Score */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            bgcolor: scoreColor,
            borderRadius: 2,
            px: 1.5,
            py: 0.5,
            textAlign: 'center',
            minWidth: 56,
          }}
        >
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: '#000', lineHeight: 1 }}>
            {adjustedScore}
          </Typography>
          <Typography sx={{ fontSize: 9, fontWeight: 700, color: '#000', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {scoreLabel}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Chip
            label={`${scoringFormat} adjusted`}
            size="small"
            sx={{ fontSize: 10, height: 18, bgcolor: 'background.default', color: 'text.secondary' }}
          />
          {scoredData && scoredData.baseScore !== adjustedScore && (
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              Base: {scoredData.baseScore} → Adjusted: {adjustedScore}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {player.vegasProp && (
          <Box sx={{ bgcolor: 'background.default', borderRadius: 1.5, px: 1.5, py: 0.75, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 9, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Vegas Prop</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{player.vegasProp}</Typography>
          </Box>
        )}
        {player.teamTotal && (
          <Box sx={{ bgcolor: 'background.default', borderRadius: 1.5, px: 1.5, py: 0.75, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 9, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Team Pts</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{player.teamTotal}</Typography>
          </Box>
        )}
        {player.avgYards && (
          <Box sx={{ bgcolor: 'background.default', borderRadius: 1.5, px: 1.5, py: 0.75, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 9, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Avg Yds</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{player.avgYards}</Typography>
          </Box>
        )}
        {player.usage && (
          <Box sx={{ bgcolor: 'background.default', borderRadius: 1.5, px: 1.5, py: 0.75, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 9, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Usage</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 600 }}>{player.usage}</Typography>
          </Box>
        )}
        <Box sx={{ bgcolor: 'background.default', borderRadius: 1.5, px: 1.5, py: 0.75, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 9, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Trend</Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: getTrendColor(player.trend) }}>
            {getTrendIcon(player.trend)}
          </Typography>
        </Box>
        <Box sx={{ bgcolor: 'background.default', borderRadius: 1.5, px: 1.5, py: 0.75, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 9, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Matchup</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: getMatchupColor(player.matchupDifficulty) }}>
            {player.matchupDifficulty}
          </Typography>
        </Box>
      </Box>

      {/* Explanation from backend */}
      <Box sx={{ bgcolor: 'background.default', borderRadius: 1.5, px: 1.5, py: 1, display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <Typography sx={{ fontSize: 13 }}>💡</Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
          {explanation}
        </Typography>
      </Box>

      {/* Injury warnings */}
      {player.status === 'questionable' && (
        <Box sx={{ bgcolor: '#eab30815', border: '1px solid #eab30840', borderRadius: 1.5, px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography sx={{ fontSize: 13 }}>⚠️</Typography>
          <Typography sx={{ fontSize: 12, color: '#eab308' }}>
            {player.name} is listed as questionable — monitor before locking in.
          </Typography>
        </Box>
      )}
      {player.status === 'out' && (
        <Box sx={{ bgcolor: '#ef444415', border: '1px solid #ef444440', borderRadius: 1.5, px: 1.5, py: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography sx={{ fontSize: 13 }}>🚫</Typography>
          <Typography sx={{ fontSize: 12, color: '#ef4444' }}>
            {player.name} is OUT — remove from consideration.
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default PlayerCompareCard;