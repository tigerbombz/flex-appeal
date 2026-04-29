import { Box, Typography } from '@mui/material';
import { getScoreColor, getScoreLabel } from '../utils/scoring';

interface Props {
  score: number;
}

const ScoreBadge = ({ score }: Props) => (
  <Box sx={{ bgcolor: getScoreColor(score), borderRadius: 2, px: 1.5, py: 0.5, textAlign: 'center', minWidth: 52 }}>
    <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#000', lineHeight: 1 }}>
      {score}
    </Typography>
    <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#000', textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {getScoreLabel(score)}
    </Typography>
  </Box>
);

export default ScoreBadge;