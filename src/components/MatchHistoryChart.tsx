import { Box, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { mockMatchupHistory } from '../data/mockData';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 1.5,
        minWidth: 140,
      }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 0.5 }}>
        Week {label}
      </Typography>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>
        vs {data.opponent}
      </Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 700, color: data.result === 'W' ? '#22c55e' : '#ef4444' }}>
        {data.result} · {data.pointsFor}pts
      </Typography>
      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
        Opp: {data.pointsAgainst}pts
      </Typography>
    </Box>
  );
};

const MatchHistoryChart = () => {
  const wins   = mockMatchupHistory.filter((m) => m.result === 'W').length;
  const losses = mockMatchupHistory.filter((m) => m.result === 'L').length;
  const avgPts = (
    mockMatchupHistory.reduce((sum, m) => sum + m.pointsFor, 0) /
    mockMatchupHistory.length
  ).toFixed(1);

  return (
    <Box>
      {/* Summary row */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Box
          sx={{
            flex: 1,
            bgcolor: '#22c55e15',
            border: '1px solid #22c55e30',
            borderRadius: 2,
            p: 1.5,
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: '#22c55e', lineHeight: 1 }}>
            {wins}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Wins
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            bgcolor: '#ef444415',
            border: '1px solid #ef444430',
            borderRadius: 2,
            p: 1.5,
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: '#ef4444', lineHeight: 1 }}>
            {losses}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Losses
          </Typography>
        </Box>
        <Box
          sx={{
            flex: 1,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            p: 1.5,
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: 'primary.main', lineHeight: 1 }}>
            {avgPts}
          </Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Avg Pts
          </Typography>
        </Box>
      </Box>

      {/* Bar chart */}
      <Box sx={{ width: '100%', height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={mockMatchupHistory}
            margin={{ top: 4, right: 4, left: -24, bottom: 0 }}
            barSize={18}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#2a2f3d"
              vertical={false}
            />
            <XAxis
              dataKey="week"
              tick={{ fill: '#7a8099', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              label={{
                value: 'Week',
                position: 'insideBottom',
                offset: -2,
                fill: '#7a8099',
                fontSize: 10,
              }}
            />
            <YAxis
              tick={{ fill: '#7a8099', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              domain={[60, 160]}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: '#ffffff08' }}
            />
            <ReferenceLine
              y={parseFloat(avgPts)}
              stroke="#00e5a0"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Bar dataKey="pointsFor" radius={[4, 4, 0, 0]}>
              {mockMatchupHistory.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.result === 'W' ? '#22c55e' : '#ef4444'}
                  opacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: '#22c55e' }} />
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Win</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: '#ef4444' }} />
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Loss</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 20, height: 2, bgcolor: '#00e5a0', borderRadius: 1 }} />
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Avg</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default MatchHistoryChart;