import { Chip } from '@mui/material';

interface Props {
  volatility: 'Low' | 'Medium' | 'High';
}

const COLORS = {
  Low:    { bg: '#22c55e20', color: '#22c55e', border: '#22c55e40' },
  Medium: { bg: '#eab30820', color: '#eab308', border: '#eab30840' },
  High:   { bg: '#ef444420', color: '#ef4444', border: '#ef444440' },
};

const ICONS = {
  Low:    '🔒',
  Medium: '〰️',
  High:   '🎲',
};

const VolatilityBadge = ({ volatility }: Props) => {
  const c = COLORS[volatility];
  return (
    <Chip
      size="small"
      label={`${ICONS[volatility]} ${volatility}`}
      sx={{
        fontSize: 10,
        height: 20,
        fontWeight: 600,
        bgcolor: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
      }}
    />
  );
};

export default VolatilityBadge;