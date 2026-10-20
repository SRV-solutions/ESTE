import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CssBaseline, ThemeProvider, useMediaQuery } from '@mui/material';
import { getTheme } from '../theme';

const KEY = 'eventbox.colorMode';
const ColorModeContext = createContext({ mode: 'light', toggle: () => {} });

const readStored = () => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
};

/** Claro/oscuro: sigue al sistema hasta que la persona elige uno. */
export const ColorModeProvider = ({ children }) => {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const [stored, setStored] = useState(readStored);
  const mode = stored ?? (prefersDark ? 'dark' : 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      toggle: () => {
        const next = mode === 'dark' ? 'light' : 'dark';
        setStored(next);
        try {
          localStorage.setItem(KEY, next);
        } catch {
          /* sin almacenamiento: queda solo para esta sesión */
        }
      },
    }),
    [mode],
  );

  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useColorMode = () => useContext(ColorModeContext);
