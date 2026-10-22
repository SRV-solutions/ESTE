import { Component, useState } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import Refresh from '@mui/icons-material/Refresh';
import BugReportOutlined from '@mui/icons-material/BugReportOutlined';
import FeedbackDialog from './FeedbackDialog';
import LostBox from './LostBox';

/** El navegador tiene una versión vieja de la app y el archivo de la pantalla ya no existe. */
const isNewVersion = (error) => /dynamically imported module|Importing a module script failed|Loading chunk|module script/i.test(error?.message || '');

const reload = () => {
  try {
    sessionStorage.removeItem('eventbox:recargada-por-version');
  } catch {
    /* sin almacenamiento */
  }
  window.location.reload();
};

// eslint-disable-next-line react-refresh/only-export-components
const CrashScreen = ({ error, onRetry, fullPage }) => {
  const [reporting, setReporting] = useState(false);
  const update = isNewVersion(error);
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: fullPage ? '100dvh' : '60vh', px: 2, py: 4, bgcolor: fullPage ? 'background.default' : undefined }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, maxWidth: 480, width: '100%', textAlign: 'center' }}>
        <Stack alignItems="center" spacing={1.5}>
          <LostBox size={150} mark={update ? '↻' : '!'} />
          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            {update ? 'Hay una versión nueva de Event Box' : 'Algo salió mal en esta pantalla'}
          </Typography>
          <Typography color="text.secondary">
            {update
              ? 'Recargá la página para seguir con la versión actualizada. No se pierde nada de lo que ya guardaste.'
              : 'Probá recargar la página. Si vuelve a pasar, reportalo: el detalle técnico se adjunta solo.'}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ pt: 1, width: { xs: '100%', sm: 'auto' } }}>
            <Button variant="contained" size="large" startIcon={<Refresh />} onClick={reload}>
              Recargar página
            </Button>
            {!update && (
              <Button variant="outlined" size="large" startIcon={<BugReportOutlined />} onClick={() => setReporting(true)}>
                Reportar el problema
              </Button>
            )}
          </Stack>
          {!update && (
            <>
              <Button size="small" color="inherit" onClick={onRetry}>
                Volver a intentar sin recargar
              </Button>
              <Typography component="code" variant="caption" color="text.disabled" sx={{ overflowWrap: 'anywhere' }}>
                {error?.message}
              </Typography>
            </>
          )}
        </Stack>
      </Paper>
      <FeedbackDialog
        open={reporting}
        onClose={() => setReporting(false)}
        technical={`Pantalla rota en ${window.location.pathname}: ${error?.message ?? ''}\n${(error?.stack || '').split('\n').slice(0, 6).join('\n')}`}
      />
    </Box>
  );
};

/**
 * Si una pantalla se rompe, en vez de quedar en blanco muestra "Recargar página" y "Reportar el problema".
 * Usarlo con key = ruta para que se reinicie al cambiar de pantalla.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[eventbox] Pantalla rota:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) return <CrashScreen error={this.state.error} fullPage={this.props.fullPage} onRetry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}
