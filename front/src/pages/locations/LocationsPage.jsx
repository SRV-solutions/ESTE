import { useState } from 'react';
import {
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import EditOutlined from '@mui/icons-material/EditOutlined';
import FormDialog from '../../components/FormDialog';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { api, errorMessage } from '../../lib/api';

const EMPTY = { locationName: '', address: '', city: '', country: '' };
const FIELDS = [
  ['locationName', 'Nombre del lugar'],
  ['address', 'Dirección'],
  ['city', 'Ciudad'],
  ['country', 'País'],
];

const LocationsPage = () => {
  const { can } = useAuth();
  const { notify } = useFeedback();
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
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
          can('serviceOrders', 'create') && (
            <Button variant="contained" startIcon={<Add />} onClick={() => setEditing(EMPTY)}>
              Nuevo lugar
            </Button>
          )
        }
      />

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>Lugar</TableCell>
                <TableCell>Dirección</TableCell>
                <TableCell>Ciudad</TableCell>
                <TableCell>País</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((l) => (
                <TableRow key={l.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{l.locationName}</TableCell>
                  <TableCell>{l.address}</TableCell>
                  <TableCell>{l.city}</TableCell>
                  <TableCell>{l.country}</TableCell>
                  <TableCell align="right" sx={{ width: 48 }}>
                    {can('serviceOrders', 'update') && (
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => setEditing(l)}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!data.length && <EmptyState title="Todavía no hay lugares" description="Creá el primero para poder asignarlo a un evento." />}
        </TableContainer>
      )}

      <FormDialog
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Editar lugar' : 'Nuevo lugar'}
        onSubmit={save}
        saving={saving}
        disabled={!valid}
      >
        {editing &&
          FIELDS.map(([key, label], i) => (
            <TextField
              key={key}
              label={label}
              value={editing[key]}
              onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
              required
              autoFocus={i === 0}
            />
          ))}
      </FormDialog>
    </>
  );
};

export default LocationsPage;
