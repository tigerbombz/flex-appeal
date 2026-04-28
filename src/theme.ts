import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00e5a0',       // your accent green
    },
    secondary: {
      main: '#00b8ff',       // your accent blue
    },
    background: {
      default: '#0d0f14',
      paper: '#161920',
    },
    text: {
      primary: '#e8eaf0',
      secondary: '#7a8099',
    },
  },
  typography: {
    fontFamily: `'DM Sans', sans-serif`,
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
});

export default theme;