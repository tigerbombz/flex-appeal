import { Box, Typography } from '@mui/material';

type Props = {
  score: number;
}

const getColor = (score: number): string => {
  if (score >= 80) return '#22c55e';
  if (score >= 65) return '#eab308';
  return '#ef4444';
};

const getLabel = (score: number): string => {
  if (score >= 80) return 'Start';
  if (score >= 65) return 'Lean';
  return 'Sit';
};

const ScoreBadge = ({ score }: Props) => {
  const color = getColor(score);
  return (
    <Box sx={{ bgcolor: color, borderRadius: 2, px: 1.5, py: 0.5, textAlign: 'center', minWidth: 52 }}>
      <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#000', lineHeight: 1 }}>
        {score}
      </Typography>
      <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#000', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {getLabel(score)}
      </Typography>
    </Box>
  );
};

export default ScoreBadge;