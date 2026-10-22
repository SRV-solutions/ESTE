import { useRef, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import ArchitectureOutlined from '@mui/icons-material/ArchitectureOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import FileViewer from '../../components/FileViewer';
import FormDialog from '../../components/FormDialog';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { useUrlParams } from '../../hooks/useUrlParams';
import { api, errorMessage } from '../../lib/api';
import { getPrivateFile, saveFile } from '../../lib/privateFiles';
import { formatDate, formatDateTime, userName } from '../../lib/format';

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.dwg';
const TYPE_LABEL = { 'application/pdf': 'PDF', 'image/vnd.dwg': 'DWG', 'image/png': 'PNG', 'image/jpeg': 'JPG', 'image/webp': 'WEBP' };
const sizeLabel = (bytes) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`);

const UploadDialog = ({ open, onClose, events, onUploaded }) => {
  const { notify } = useFeedback();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [event, setEvent] = useState(null);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > MAX_BYTES) return notify('El archivo pesa más de 25 MB.', 'error');
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  };

  const save = async () => {
    setSaving(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('title', title.trim());
      if (event) form.append('eventId', event.id);
      if (description.trim()) form.append('description', description.trim());
      await api.post('/blueprints', form);
      notify('Plano subido: ya lo ve todo el equipo.');
      setFile(null);
      setTitle('');
      setEvent(null);
      setDescription('');
      onUploaded();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog open={open} onClose={onClose} title="Subir plano" onSubmit={save} saving={saving} disabled={!file || !title.trim()} submitLabel="Subir">
      <Button variant="outlined" startIcon={<UploadFileOutlined />} onClick={() => input.current?.click()} sx={{ alignSelf: 'flex-start' }}>
        {file ? `${file.name} · ${sizeLabel(file.size)}` : 'Elegir archivo (PDF, imagen o DWG)'}
      </Button>
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={pick} />
      <TextField label="Título" value={title} onChange={(e) => setTitle(e.target.value)} inputProps={{ maxLength: 160 }} required />
      <Autocomplete
        options={events}
        value={event}
        onChange={(_, v) => setEvent(v)}
        getOptionLabel={(e) => `${e.eventName} — ${formatDate(e.dateEvent)}`}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderInput={(params) => <TextField {...params} label="Evento (opcional)" helperText="Sin evento, queda como plano general (por ejemplo, el del depósito)." />}
      />
      <TextField label="Notas (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} />
    </FormDialog>
  );
};

/** Planos compartidos: cada salón, cada evento, el depósito. Se ven en el celular y se descargan. */
const BlueprintsPage = () => {
  const { can } = useAuth();
  const { notify, confirm } = useFeedback();
  const [uploading, setUploading] = useState(false);
  const [eventFilter, setEventFilter] = useState(null);
  const [search, setSearch] = useState('');
  const canUpload = can('blueprints', 'create');
  useUrlParams(({ accion, buscar }) => {
    if (accion === 'subir' && canUpload) setUploading(true);
    if (buscar) setSearch(buscar);
  });

  const { data, loading, error, reload } = useLoader(async () => {
    const [blueprints, events] = await Promise.all([api.get('/blueprints').then((r) => r.data), api.get('/events').then((r) => r.data)]);
    return { blueprints, events };
  }, []);

  const [viewing, setViewing] = useState(null); // archivo abierto en el visor
  const [downloads, setDownloads] = useState({}); // id -> avance (0 a 1, o null) de cada descarga

  const fileOf = (b) => ({ path: `/blueprints/${b.id}/file?view=1`, title: b.title, fileName: b.fileName, mimeType: b.mimeType });

  /** Ver: se abre al instante en el visor, que muestra el avance mientras baja. */
  const view = (b) => setViewing(fileOf(b));

  /** Descargar: el avance se ve en el botón de esa tarjeta; las demás siguen funcionando. */
  const download = async (b) => {
    if (b.id in downloads) return;
    setDownloads((d) => ({ ...d, [b.id]: null }));
    try {
      const entry = await getPrivateFile(fileOf(b).path, { onProgress: (p) => setDownloads((d) => ({ ...d, [b.id]: p })) });
      saveFile(entry.url, b.fileName);
    } catch (err) {
      notify(errorMessage(err, 'No se pudo descargar el plano.'), 'error');
    } finally {
      setDownloads((d) => {
        const rest = { ...d };
        delete rest[b.id];
        return rest;
      });
    }
  };

  const remove = async (b) => {
    if (!(await confirm({ title: `Eliminar “${b.title}”`, message: 'El archivo se borra para todo el equipo.', confirmLabel: 'Eliminar', danger: true }))) return;
    try {
      await api.delete(`/blueprints/${b.id}`);
      notify('Plano eliminado.');
      reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  const q = search.trim().toLowerCase();
  const visible = (data?.blueprints || []).filter(
    (b) => (!eventFilter || b.eventId === eventFilter.id) && (!q || `${b.title} ${b.description ?? ''} ${b.Event?.eventName ?? ''}`.toLowerCase().includes(q)),
  );

  return (
    <>
      <PageHeader
        title="Planos"
        subtitle="Los planos de cada salón y evento, a mano para todo el equipo."
        actions={
          canUpload && (
            <Button variant="contained" startIcon={<UploadFileOutlined />} onClick={() => setUploading(true)}>
              Subir plano
            </Button>
          )
        }
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField label="Buscar plano" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }} />
        <Autocomplete
          sx={{ flex: 1 }}
          options={data?.events || []}
          value={eventFilter}
          onChange={(_, v) => setEventFilter(v)}
          getOptionLabel={(e) => `${e.eventName} — ${formatDate(e.dateEvent)}`}
          isOptionEqualToValue={(a, b) => a.id === b.id}
          renderInput={(params) => <TextField {...params} label="Filtrar por evento" />}
        />
      </Stack>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !visible.length ? (
        <Paper variant="outlined">
          <EmptyState icon={ArchitectureOutlined} title="Todavía no hay planos" description={canUpload ? 'Subí el primero: PDF, imagen o DWG de AutoCAD, hasta 25 MB.' : undefined} />
        </Paper>
      ) : (
        <Grid container spacing={1.5}>
          {visible.map((b) => (
            <Grid item xs={12} sm={6} lg={4} key={b.id}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: 'primary.main', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: 900, fontSize: 11 }}>
                    {TYPE_LABEL[b.mimeType] ?? 'ARCH'}
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontWeight: 800 }} noWrap title={b.title}>
                      {b.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" component="div" noWrap>
                      {sizeLabel(b.size)} · {formatDateTime(b.createdAt)} · {userName(b.Uploader) || '—'}
                    </Typography>
                  </Box>
                </Stack>
                {b.Event ? <Chip size="small" variant="outlined" label={`${b.Event.eventName} · ${formatDate(b.Event.dateEvent)}`} sx={{ alignSelf: 'flex-start', maxWidth: '100%' }} /> : <Chip size="small" label="General" sx={{ alignSelf: 'flex-start' }} />}
                {b.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                    {b.description}
                  </Typography>
                )}
                <Stack direction="row" spacing={1} sx={{ mt: 'auto', pt: 0.5 }} alignItems="center">
                  {b.mimeType !== 'image/vnd.dwg' && (
                    <Button size="small" variant="contained" startIcon={<VisibilityOutlined />} onClick={() => view(b)}>
                      Ver
                    </Button>
                  )}
                  <Button
                    size="small"
                    startIcon={b.id in downloads ? <CircularProgress size={14} thickness={6} /> : <DownloadOutlined />}
                    onClick={() => download(b)}
                    disabled={b.id in downloads}
                  >
                    {b.id in downloads ? `Bajando${downloads[b.id] != null ? ` ${Math.round(downloads[b.id] * 100)}%` : '…'}` : 'Descargar'}
                  </Button>
                  {canUpload && (
                    <Tooltip title="Eliminar">
                      <IconButton size="small" onClick={() => remove(b)} sx={{ ml: 'auto', '&:hover': { color: 'error.main' } }}>
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      <FileViewer file={viewing} onClose={() => setViewing(null)} />

      <UploadDialog
        open={uploading}
        onClose={() => setUploading(false)}
        events={data?.events || []}
        onUploaded={() => {
          setUploading(false);
          reload();
        }}
      />
    </>
  );
};

export default BlueprintsPage;
