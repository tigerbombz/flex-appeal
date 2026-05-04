import { Box, Typography } from '@mui/material';

interface Props {
  floor: number;
  score: number;
  ceiling: number;
}

const FloorCeilingBar = ({ floor, score, ceiling }: Props) => {
  const range   = ceiling - floor || 1;
  const pct     = ((score - floor) / range) * 100;

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography sx={{ fontSize: 10, color: '#22c55e' }}>
          Floor {floor}
        </Typography>
        <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
          Ceiling {ceiling}
        </Typography>
      </Box>
      <Box
        sx={{
          height: 6,
          bgcolor: 'background.default',
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Range bar */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: '100%',
            background: 'linear-gradient(to right, #22c55e40, #eab30840, #ef444440)',
            borderRadius: 3,
          }}
        />
        {/* Score marker */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: `${pct}%`,
            transform: 'translate(-50%, -50%)',
            width: 10,
            height: 10,
            bgcolor: 'primary.main',
            borderRadius: '50%',
            border: '2px solid',
            borderColor: 'background.paper',
          }}
        />
      </Box>
    </Box>
  );
};

export default FloorCeilingBar;