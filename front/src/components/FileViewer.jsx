import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Close from '@mui/icons-material/Close';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import OpenInNew from '@mui/icons-material/OpenInNew';
import ZoomIn from '@mui/icons-material/ZoomIn';
import ZoomOut from '@mui/icons-material/ZoomOut';
import { errorMessage } from '../lib/api';
import { cachedFile, getPrivateFile, isImage, isPdf, saveFile } from '../lib/privateFiles';

const PdfPages = lazy(() => import('./PdfPages'));

const ZOOMS = [1, 1.5, 2, 3, 4];
const sizeLabel = (bytes) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.ceil(bytes / 1024))} KB`);

/** Mientras baja: un círculo con el porcentaje. */
const LoadingFile = ({ progress, title, onCancel }) => (
  <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ height: '100%', minHeight: 280, px: 3, textAlign: 'center' }}>
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress size={84} thickness={3.6} variant={progress == null ? 'indeterminate' : 'determinate'} value={(progress ?? 0) * 100} />
      {progress != null && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <Typography sx={{ fontWeight: 900 }}>{Math.round(progress * 100)}%</Typography>
        </Box>
      )}
    </Box>
    <Box>
      <Typography sx={{ fontWeight: 800 }}>Abriendo “{title}”…</Typography>
      <Typography variant="body2" color="text.secondary">
        Los archivos grandes pueden tardar unos segundos. Podés cerrar y seguir con otra cosa.
      </Typography>
    </Box>
    <Button color="inherit" onClick={onCancel}>
      Cancelar
    </Button>
  </Stack>
);

/**
 * Visor de archivos privados (planos, recibos) dentro de la app: imágenes con zoom y PDF.
 * En la computadora el PDF usa el visor del navegador; en el celular se dibuja con pdf.js.
 * `file`: { path, title, fileName, mimeType }.
 */
const FileViewer = ({ file, onClose }) => {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const touch = useMediaQuery('(pointer: coarse)');
  const [state, setState] = useState({ phase: 'idle' }); // idle | loading | ready | error
  const [zoom, setZoom] = useState(1);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setZoom(1);
    if (!file) return undefined;
    const hit = cachedFile(file.path);
    if (hit) {
      setState({ phase: 'ready', entry: hit });
      return undefined;
    }
    const ctrl = new AbortController();
    setState({ phase: 'loading', progress: null });
    getPrivateFile(file.path, { signal: ctrl.signal, onProgress: (progress) => setState({ phase: 'loading', progress }) })
      .then((entry) => setState({ phase: 'ready', entry }))
      .catch((err) => {
        if (err?.name !== 'AbortError') setState({ phase: 'error', message: errorMessage(err, 'No se pudo abrir el archivo. Revisá la conexión y probá de nuevo.') });
      });
    return () => ctrl.abort();
  }, [file, attempt]);

  const entry = file && state.phase === 'ready' ? state.entry : null; // al cerrar, el diálogo se desvanece sin contenido
  const type = file?.mimeType || entry?.type;
  const pdf = isPdf(type);
  const image = isImage(type);
  const nativePdf = pdf && !touch; // la computadora muestra el PDF con su propio visor
  const canZoom = entry && (image || (pdf && !nativePdf));
  const zi = ZOOMS.indexOf(zoom);

  return (
    <Dialog
      open={!!file}
      onClose={onClose}
      fullScreen={phone}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { height: { sm: '90vh' }, display: 'flex', flexDirection: 'column', overflow: 'hidden' } }}
    >
      {/* Barra: título y acciones */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: { xs: 1.5, sm: 2 }, py: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 800 }} noWrap title={file?.title}>
            {file?.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {file?.fileName}
            {entry ? ` · ${sizeLabel(entry.size)}` : ''}
          </Typography>
        </Box>
        {canZoom && (
          <Stack direction="row" alignItems="center" sx={{ display: { xs: 'none', sm: 'flex' } }}>
            <IconButton onClick={() => setZoom(ZOOMS[Math.max(zi - 1, 0)])} disabled={zi <= 0} aria-label="Alejar">
              <ZoomOut />
            </IconButton>
            <Typography variant="body2" sx={{ width: 44, textAlign: 'center', fontWeight: 700 }}>
              {Math.round(zoom * 100)}%
            </Typography>
            <IconButton onClick={() => setZoom(ZOOMS[Math.min(zi + 1, ZOOMS.length - 1)])} disabled={zi >= ZOOMS.length - 1} aria-label="Acercar">
              <ZoomIn />
            </IconButton>
          </Stack>
        )}
        {entry && !touch && (
          <Tooltip title="Abrir en otra pestaña">
            <IconButton onClick={() => window.open(entry.url, '_blank')} aria-label="Abrir en otra pestaña">
              <OpenInNew />
            </IconButton>
          </Tooltip>
        )}
        {entry && (
          <Button variant="contained" startIcon={<DownloadOutlined />} onClick={() => saveFile(entry.url, file?.fileName)} sx={{ flexShrink: 0 }}>
            {phone ? 'Bajar' : 'Descargar'}
          </Button>
        )}
        <IconButton onClick={onClose} aria-label="Cerrar">
          <Close />
        </IconButton>
      </Stack>

      {/* Contenido */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', bgcolor: (t) => (t.palette.mode === 'dark' ? '#0b0b0c' : '#eef0f3'), p: nativePdf && entry ? 0 : { xs: 1, sm: 2 } }}>
        {state.phase === 'loading' && <LoadingFile progress={state.progress} title={file?.title} onCancel={onClose} />}
        {state.phase === 'error' && (
          <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ height: '100%', minHeight: 240 }}>
            <Alert severity="error">{state.message}</Alert>
            <Button variant="contained" onClick={() => setAttempt((n) => n + 1)}>
              Reintentar
            </Button>
          </Stack>
        )}
        {entry && image && (
          <Box sx={{ minHeight: '100%', display: 'grid', placeItems: zoom === 1 ? 'center' : 'start' }}>
            <Box
              component="img"
              src={entry.url}
              alt={file?.title}
              onClick={() => setZoom(zoom === 1 ? 2 : 1)}
              sx={
                zoom === 1
                  ? { maxWidth: '100%', maxHeight: { xs: 'calc(100dvh - 90px)', sm: 'calc(90vh - 100px)' }, objectFit: 'contain', cursor: 'zoom-in', borderRadius: 1 }
                  : { width: `${zoom * 100}%`, maxWidth: 'none', cursor: 'zoom-out' }
              }
            />
          </Box>
        )}
        {entry && nativePdf && <Box component="iframe" src={entry.url} title={file?.title} sx={{ border: 0, width: '100%', height: '100%', display: 'block' }} />}
        {entry && pdf && !nativePdf && (
          <Suspense fallback={<CircularProgress sx={{ display: 'block', mx: 'auto', my: 6 }} />}>
            <PdfPages url={entry.url} zoom={zoom} />
            <Stack direction="row" spacing={1} justifyContent="center" sx={{ pb: 2 }}>
              <Button size="small" variant="outlined" startIcon={<ZoomOut />} onClick={() => setZoom(ZOOMS[Math.max(zi - 1, 0)])} disabled={zi <= 0}>
                Alejar
              </Button>
              <Button size="small" variant="outlined" startIcon={<ZoomIn />} onClick={() => setZoom(ZOOMS[Math.min(zi + 1, ZOOMS.length - 1)])} disabled={zi >= ZOOMS.length - 1}>
                Acercar
              </Button>
            </Stack>
          </Suspense>
        )}
        {entry && !pdf && !image && (
          <Stack alignItems="center" justifyContent="center" spacing={2} sx={{ height: '100%', minHeight: 240, textAlign: 'center' }}>
            <Typography>Este tipo de archivo no se puede ver acá. Descargalo para abrirlo con su programa.</Typography>
            <Button variant="contained" startIcon={<DownloadOutlined />} onClick={() => saveFile(entry.url, file?.fileName)}>
              Descargar
            </Button>
          </Stack>
        )}
      </Box>
    </Dialog>
  );
};

export default FileViewer;
