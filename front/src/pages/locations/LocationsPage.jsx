import { useState } from 'react';
import { Button, IconButton, Paper, Stack, TextField, Tooltip, useMediaQuery } from '@mui/material';
import Add from '@mui/icons-material/Add';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DataTable, { ColumnsButton } from '../../components/DataTable';
import FormDialog from '../../components/FormDialog';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useColumns } from '../../hooks/useColumns';
import { useLoader } from '../../hooks/useLoader';
import { api, errorMessage } from '../../lib/api';

const EMPTY = { locationName: '', address: '', city: '', country: '' };
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
];

const LocationsPage = () => {
  const { can } = useAuth();
  const { notify } = useFeedback();
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const isPhone = useMediaQuery((t) => t.breakpoints.down('sm'));
  const columns = useColumns('locations', COLUMNS);
  const { data, loading, error, reload } = useLoader(() => api.get('/locations').then((r) => r.data), []);

  const valid = editing && FIELDS.every(([k]) => String(editing[k] ?? '').trim());

  const save = async () => {
    setSaving(true);
    try {
      if (editing.id) await api.patch(`/locations/${editing.id}`, editing);
      else await api.post('/locations', editing);
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
            {can('serviceOrders', 'create') && (
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
              can('serviceOrders', 'update')
                ? (l) => (
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => setEditing(l)}>
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
      </FormDialog>
    </>
  );
};

export default LocationsPage;
