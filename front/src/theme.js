import { createTheme, alpha } from '@mui/material/styles';

/**
 * Sistema visual SRV (wearesrv.com): negro + azul #0B78FB + naranja #F6950A,
 * system-ui con títulos en 900. Mismos tokens que Sentryx.
 */
export const BRAND = { blue: '#0B78FB', orange: '#F6950A', black: '#000000' };

const tokens = {
  light: {
    bg: '#f5f6f8',
    surface: '#ffffff',
    surface2: '#f0f2f5',
    border: '#e3e6eb',
    text: '#0d0d0d',
    text2: '#4a4f57',
    text3: '#7a808a',
    primary: '#0b6be0',
    accent: '#d97f00',
    ok: '#138a43',
    warn: '#9a5b00',
    danger: '#c62828',
  },
  dark: {
    bg: '#000000',
    surface: '#0d0d0d',
    surface2: '#161616',
    border: '#242424',
    text: '#ffffff',
    text2: '#e0e0e0',
    text3: '#a0a0a0',
    primary: BRAND.blue,
    accent: BRAND.orange,
    ok: '#3ccf7a',
    warn: '#f6b14a',
    danger: '#ff6b6b',
  },
};

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export const getTheme = (mode) => {
  const t = tokens[mode];
  return createTheme({
    palette: {
      mode,
      primary: { main: t.primary, contrastText: '#ffffff' },
      secondary: { main: t.accent, contrastText: '#000000' },
      success: { main: t.ok },
      warning: { main: t.warn },
      error: { main: t.danger },
      background: { default: t.bg, paper: t.surface },
      text: { primary: t.text, secondary: t.text2, disabled: t.text3 },
      divider: t.border,
      surface2: t.surface2,
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: FONT,
      h1: { fontWeight: 900, letterSpacing: '-0.02em' },
      h2: { fontWeight: 900, letterSpacing: '-0.02em' },
      h3: { fontWeight: 900, letterSpacing: '-0.02em' },
      h4: { fontWeight: 900, letterSpacing: '-0.02em', fontSize: '1.6rem' },
      h5: { fontWeight: 800, letterSpacing: '-0.01em', fontSize: '1.25rem' },
      h6: { fontWeight: 800, letterSpacing: '-0.01em', fontSize: '1.05rem' },
      subtitle2: { fontWeight: 700 },
      button: { fontWeight: 700, textTransform: 'none' },
      overline: { fontWeight: 700, letterSpacing: '0.08em' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { WebkitFontSmoothing: 'antialiased' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 10, paddingInline: 16 } },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: t.border },
        },
      },
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: { root: { borderRadius: 14 } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: { borderColor: t.border },
          head: { fontWeight: 700, color: t.text3, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' },
        },
      },
      MuiTableRow: {
        styleOverrides: { root: { '&:last-child td': { borderBottom: 0 } } },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 700 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
      MuiDialogTitle: { styleOverrides: { root: { fontWeight: 900 } } },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiSelect: { defaultProps: { size: 'small' } },
      MuiAutocomplete: { defaultProps: { size: 'small' } },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            '&.active': { backgroundColor: alpha(t.primary, mode === 'dark' ? 0.18 : 0.1), color: t.primary },
            '&.active .MuiListItemIcon-root': { color: t.primary },
          },
        },
      },
    },
  });
};
