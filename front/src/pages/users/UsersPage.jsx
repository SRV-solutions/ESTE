import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import EditOutlined from '@mui/icons-material/EditOutlined';
import FormDialog from '../../components/FormDialog';
import PasswordField from '../../components/PasswordField';
import UserAvatar from '../../components/UserAvatar';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import { userName } from '../../lib/format';

const EMPTY = { username: '', email: '', firstname: '', lastname: '', password: '', roleId: '' };

const UserDialog = ({ user, roles, onClose, onSaved }) => {
  const { notify } = useFeedback();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const isNew = !user?.id;

  useEffect(() => {
    if (user) {
      setForm({ ...EMPTY, ...user, firstname: user.firstname ?? '', lastname: user.lastname ?? '', password: '' });
      setErrors({});
    }
  }, [user]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const valid = form.username.trim() && form.email.trim() && form.roleId && (!isNew || form.password.length >= 6);

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        firstname: form.firstname,
        lastname: form.lastname,
        roleId: form.roleId,
        ...(form.password ? { password: form.password } : {}),
      };
      if (isNew) await api.post('/users', payload);
      else await api.patch(`/users/${user.id}`, payload);
      notify(isNew ? 'Usuario creado.' : 'Usuario actualizado.');
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog open={!!user} onClose={onClose} title={isNew ? 'Nuevo usuario' : `Editar ${user?.username}`} onSubmit={save} saving={saving} disabled={!valid}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Nombre" value={form.firstname} onChange={set('firstname')} error={!!errors.firstname} helperText={errors.firstname} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Apellido" value={form.lastname} onChange={set('lastname')} error={!!errors.lastname} helperText={errors.lastname} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Usuario"
            value={form.username}
            onChange={set('username')}
            required
            autoComplete="off"
            error={!!errors.username}
            helperText={errors.username || 'Con este nombre inicia sesión'}
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth type="email" label="Email" value={form.email} onChange={set('email')} required error={!!errors.email} helperText={errors.email} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField select fullWidth label="Rol" value={form.roleId} onChange={set('roleId')} required>
            {roles.map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.roleName}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={6}>
          <PasswordField
            fullWidth
            label={isNew ? 'Contraseña' : 'Nueva contraseña'}
            value={form.password}
            onChange={set('password')}
            required={isNew}
            autoComplete="new-password"
            error={!!errors.password}
            helperText={errors.password || (isNew ? 'Mínimo 6 caracteres' : 'Dejala vacía para no cambiarla')}
          />
        </Grid>
      </Grid>
      {form.roleId && (
        <Typography variant="body2" color="text.secondary">
          {roles.find((r) => r.id === form.roleId)?.description}
        </Typography>
      )}
    </FormDialog>
  );
};

const UsersPage = () => {
  const { can, user: me } = useAuth();
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const { data, loading, error, reload } = useLoader(async () => {
    const [users, roles] = await Promise.all([api.get('/users').then((r) => r.data), api.get('/roles').then((r) => r.data)]);
    return { users, roles };
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.users || []).filter(
      (u) => !q || `${u.username} ${u.email} ${u.firstname ?? ''} ${u.lastname ?? ''} ${u.Role?.roleName ?? ''}`.toLowerCase().includes(q),
    );
  }, [data, search]);

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle="Quién entra a Event Box y qué puede hacer según su rol."
        actions={
          can('users', 'create') && (
            <Button variant="contained" startIcon={<Add />} onClick={() => setEditing(EMPTY)}>
              Nuevo usuario
            </Button>
          )
        }
      />
      <Stack sx={{ mb: 2 }}>
        <TextField label="Buscar por nombre, usuario, email o rol" value={search} onChange={(e) => setSearch(e.target.value)} />
      </Stack>

      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                <TableCell>Persona</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <UserAvatar user={u} size={30} sx={u.id === me.id ? { bgcolor: 'secondary.main' } : undefined} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {userName(u)}
                        {u.id === me.id && (
                          <Typography component="span" variant="caption" color="text.secondary">
                            {' '}
                            (vos)
                          </Typography>
                        )}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>@{u.username}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip size="small" label={u.Role?.roleName || 'Sin rol'} variant="outlined" />
                  </TableCell>
                  <TableCell align="right" sx={{ width: 48 }}>
                    {can('users', 'update') && (
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => setEditing(u)}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!visible.length && <EmptyState title="No hay usuarios para mostrar" />}
        </TableContainer>
      )}

      <UserDialog
        user={editing}
        roles={data?.roles || []}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          reload();
        }}
      />
    </>
  );
};

export default UsersPage;
