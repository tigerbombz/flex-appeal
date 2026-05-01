import { Box, Typography } from '@mui/material';

interface Props {
  lastUpdated: string | null;
  loading: boolean;
}

const FreshnessBadge = ({ lastUpdated, loading }: Props) => {
  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 20,
        px: 1.5,
        py: 0.5,
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: loading ? '#eab308' : '#22c55e',
          animation: loading ? 'none' : 'pulse 2s infinite',
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.3 },
          },
        }}
      />
      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
        {loading
          ? 'Updating...'
          : lastUpdated
          ? `Updated ${formatTime(lastUpdated)}`
          : 'No data'}
      </Typography>
    </Box>
  );
};

export default FreshnessBadge;