import { useState } from 'react';
import { Button, IconButton, Link, Paper, Stack, TextField, Tooltip, Typography, useMediaQuery } from '@mui/material';
import MyLocationOutlined from '@mui/icons-material/MyLocationOutlined';
import Add from '@mui/icons-material/Add';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DataTable, { ColumnsButton } from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useColumns } from '../../hooks/useColumns';
import { useLoader } from '../../hooks/useLoader';
import { useUrlParams } from '../../hooks/useUrlParams';
import { api, errorMessage } from '../../lib/api';

const EMPTY = { locationName: '', address: '', city: '', country: '', lat: '', lng: '' };
const FIELDS = [
  ['locationName', 'Nombre del lugar'],
  ['address', 'Dirección'],
  ['city', 'Ciudad'],
  ['country', 'País'],
];

const COLUMNS = [
  {
    id: 'locationName',
    label: 'Lugar',
    sx: { fontWeight: 700 },
    render: (l) => l.locationName,
  },
  { id: 'address', label: 'Dirección', render: (l) => l.address },
  { id: 'city', label: 'Ciudad', render: (l) => l.city },
  { id: 'country', label: 'País', render: (l) => l.country },
  {
    id: 'coords',
    label: 'Coordenadas',
    render: (l) =>
      l.lat != null ? (
        <Link href={`https://www.google.com/maps?q=${l.lat},${l.lng}`} target="_blank" rel="noopener" variant="body2">
          Ver en el mapa
        </Link>
      ) : (
        <Typography variant="body2" color="text.disabled">
          Sin cargar
        </Typography>
      ),
  },
];

const LocationsPage = () => {
  const { can } = useAuth();
  const { notify } = useFeedback();
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const isPhone = useMediaQuery((t) => t.breakpoints.down('sm'));
  const columns = useColumns('locations', COLUMNS);
  const { data, loading, error, reload } = useLoader(() => api.get('/locations').then((r) => r.data), []);
  // Desde el buscador: crear un lugar o abrir uno.
  useUrlParams(({ accion, ver }) => {
    if (accion === 'nuevo' && can('locations', 'create')) setEditing(EMPTY);
    const found = ver && data.find((l) => String(l.id) === ver);
    if (found) setEditing(found);
  }, !!data);

  const valid = editing && FIELDS.every(([k]) => String(editing[k] ?? '').trim()) && !!String(editing.lat ?? '').trim() === !!String(editing.lng ?? '').trim();

  // Coordenadas desde el navegador (hay que estar en el lugar) para el check-in por geolocalización.
  const useMyPosition = () => {
    if (!navigator.geolocation) return notify('Este navegador no tiene geolocalización.', 'error');
    navigator.geolocation.getCurrentPosition(
      (p) => setEditing((e) => ({ ...e, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })),
      () => notify('No se pudo obtener la ubicación. Revisá el permiso del navegador.', 'error'),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...editing, lat: String(editing.lat ?? '').trim() || null, lng: String(editing.lng ?? '').trim() || null };
      if (editing.id) await api.patch(`/locations/${editing.id}`, payload);
      else await api.post('/locations', payload);
      notify(editing.id ? 'Lugar actualizado.' : 'Lugar creado.');
      setEditing(null);
      reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Lugares"
        subtitle="Salones, estadios y espacios donde se hacen los eventos."
        actions={
          <Stack direction="row" spacing={1}>
            {!isPhone && <ColumnsButton columns={columns} />}
            {can('locations', 'create') && (
              <Button variant="contained" startIcon={<Add />} onClick={() => setEditing(EMPTY)}>
                Nuevo lugar
              </Button>
            )}
          </Stack>
        }
      />

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <Paper variant="outlined">
          <DataTable
            columns={columns}
            rows={data}
            actions={
              can('locations', 'update')
                ? (l) => (
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => setEditing({ ...l, lat: l.lat ?? '', lng: l.lng ?? '' })}>
                        <EditOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )
                : undefined
            }
          />
          {!data.length && <EmptyState title="Todavía no hay lugares" description="Creá el primero para poder asignarlo a un evento." />}
        </Paper>
      )}

      <FormDialog open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Editar lugar' : 'Nuevo lugar'} onSubmit={save} saving={saving} disabled={!valid}>
        {editing &&
          FIELDS.map(([key, label], i) => (
            <TextField key={key} label={label} value={editing[key]} onChange={(e) => setEditing({ ...editing, [key]: e.target.value })} required autoFocus={i === 0} />
          ))}
        {editing && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Coordenadas (para el check-in)
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <TextField label="Latitud" value={editing.lat ?? ''} onChange={(e) => setEditing({ ...editing, lat: e.target.value })} inputProps={{ inputMode: 'decimal' }} sx={{ flex: 1 }} />
              <TextField label="Longitud" value={editing.lng ?? ''} onChange={(e) => setEditing({ ...editing, lng: e.target.value })} inputProps={{ inputMode: 'decimal' }} sx={{ flex: 1 }} />
              <Button variant="outlined" startIcon={<MyLocationOutlined />} onClick={useMyPosition} sx={{ whiteSpace: 'nowrap' }}>
                Estoy acá
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Con las coordenadas, el check-in verifica que la persona esté en el lugar. Se cargan estando ahí con “Estoy acá”, o copiándolas de Google Maps (clic derecho sobre el lugar).
            </Typography>
          </>
        )}
      </FormDialog>
    </>
  );
};

export default LocationsPage;
