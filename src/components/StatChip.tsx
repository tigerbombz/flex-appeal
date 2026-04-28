import { Box, Typography } from '@mui/material';

type Props = {
  label: string;
  value: string | number;
}

const StatChip = ({ label, value }: Props) => (
  <Box sx={{ bgcolor: 'background.default', borderRadius: 1.5, px: 1, py: 0.5, textAlign: 'center', minWidth: 44 }}>
    <Typography sx={{ fontSize: 9, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
      {value}
    </Typography>
  </Box>
);

export default StatChip;