import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CircularProgress,
  Dialog,
  Chip,
} from '@mui/material';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { YahooLeague } from '../hooks/useYahoo';
import { useSettings } from '../context/SettingsContext';
import type { ScoringFormat } from '../utils/scoring';

interface Props {
  open:     boolean;
  leagues:  YahooLeague[];
  loading:  boolean;
  onSelect: (leagueKey: string, scoringFormat: ScoringFormat) => void;
}

const LeagueSelector = ({ open, leagues, loading, onSelect }: Props) => {
  const [selected, setSelected]              = useState('');
  const { setScoringFormat }                 = useSettings();

  const selectedLeague = leagues.find((l) => l.league_key === selected);

  const handleConfirm = () => {
    if (!selected && leagues.length > 0) return;
    const format = ((selectedLeague as any)?.scoring_format as ScoringFormat) || 'PPR';
    setScoringFormat(format);
    onSelect(selected, format);
  };

  return (
    <Dialog
      open={open}
    //   PaperProps={{
    //     sx: {
    //       bgcolor:      'background.paper',
    //       border:       '1px solid',
    //       borderColor:  'divider',
    //       borderRadius: 3,
    //       p:            3,
    //       width:        { xs: '90%', sm: 440 },
    //       maxWidth:     440,
    //     },
    //   }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Box
          sx={{
            bgcolor:        'primary.main',
            borderRadius:   2,
            width:          40,
            height:         40,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            flexShrink:     0,
          }}
        >
          <SportsFootballIcon sx={{ fontSize: 22, color: '#000' }} />
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: 18 }}>
            Welcome to SnapDecision
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
            Select your league to get started
          </Typography>
        </Box>
      </Box>

      {/* Yahoo connected badge */}
      <Box
        sx={{
          bgcolor:      '#22c55e15',
          border:       '1px solid #22c55e40',
          borderRadius: 2,
          px:           1.5,
          py:           1,
          mb:           2.5,
          display:      'flex',
          alignItems:   'center',
          gap:          1,
        }}
      >
        <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 16 }} />
        <Typography sx={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>
          Yahoo Fantasy connected
        </Typography>
      </Box>

      {/* Loading */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      )}

      {/* No leagues — offseason */}
      {!loading && leagues.length === 0 && (
        <Box
          sx={{
            bgcolor:      'background.default',
            borderRadius: 2,
            p:            2,
            mb:           2.5,
            textAlign:    'center',
          }}
        >
          <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 0.5 }}>
            No active leagues found
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
            It's the offseason — your leagues will appear here when the season starts.
            We'll show you mock data in the meantime.
          </Typography>
        </Box>
      )}

      {/* League list */}
      {!loading && leagues.length > 0 && (
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Select League</InputLabel>
          <Select
            value={selected}
            label="Select League"
            onChange={(e) => setSelected(e.target.value)}
          >
            {leagues.map((league) => (
              <MenuItem key={league.league_key} value={league.league_key}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: 1 }}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                      {league.name}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                      {league.num_teams} teams · Season {league.season}
                    </Typography>
                  </Box>
                  <Chip
                    label={(league as any).scoring_format || 'PPR'}
                    size="small"
                    sx={{ fontSize: 10, height: 20, bgcolor: 'primary.main', color: '#000', fontWeight: 700, flexShrink: 0 }}
                  />
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Selected league info */}
      {selectedLeague && (
        <Box
          sx={{
            bgcolor:      'background.default',
            borderRadius: 2,
            p:            1.5,
            mb:           2,
            display:      'flex',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Format</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'primary.main' }}>
              {(selectedLeague as any).scoring_format || 'PPR'}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Teams</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
              {selectedLeague.num_teams}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>Season</Typography>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
              {selectedLeague.season}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Confirm button */}
      <Button
        variant="contained"
        fullWidth
        onClick={handleConfirm}
        disabled={!selected && leagues.length > 0}
        sx={{ fontWeight: 700, py: 1.2 }}
      >
        {leagues.length === 0 ? 'Continue with Mock Data' : 'Load My Team'}
      </Button>

      {leagues.length > 0 && (
        <Typography sx={{ fontSize: 11, color: 'text.secondary', textAlign: 'center', mt: 1.5 }}>
          Scoring format will be set automatically from your league settings
        </Typography>
      )}
    </Dialog>
  );
};

export default LeagueSelector;