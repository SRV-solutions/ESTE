import { useState } from 'react';
import { Avatar, Box, Button, Chip, Grid, Paper, Stack, TextField, Typography } from '@mui/material';
import EditOutlined from '@mui/icons-material/EditOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import FormDialog from '../../components/FormDialog';
import PasswordField from '../../components/PasswordField';
import { PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import { userName } from '../../lib/format';

const ENTITY_LABELS = { serviceOrders: 'Órdenes', items: 'Stock', categories: 'Categorías', users: 'Usuarios' };
const ACTION_LABELS = { read: 'ver', create: 'crear', update: 'editar', delete: 'borrar' };

const ProfileDialog = ({ open, onClose }) => {
  const { user, setUser } = useAuth();
  const { notify } = useFeedback();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  if (open && !form) {
    setForm({ firstname: user.firstname ?? '', lastname: user.lastname ?? '', username: user.username, email: user.email });
  }
  if (!open && form) setForm(null);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const { data } = await api.patch('/me', form);
      setUser(data);
      notify('Perfil actualizado.');
      onClose();
    } catch (err) {
      setErrors(fieldErrors(err));
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog open={open} onClose={onClose} title="Editar perfil" onSubmit={save} saving={saving} disabled={!form?.username?.trim() || !form?.email?.trim()}>
      {form && (
        <>
          <TextField label="Nombre" value={form.firstname} onChange={set('firstname')} error={!!errors.firstname} helperText={errors.firstname} />
          <TextField label="Apellido" value={form.lastname} onChange={set('lastname')} error={!!errors.lastname} helperText={errors.lastname} />
          <TextField label="Usuario" value={form.username} onChange={set('username')} required error={!!errors.username} helperText={errors.username || 'Con este nombre iniciás sesión'} />
          <TextField label="Email" type="email" value={form.email} onChange={set('email')} required error={!!errors.email} helperText={errors.email} />
        </>
      )}
    </FormDialog>
  );
};

const EMPTY_PASSWORD = { currentPassword: '', newPassword: '', confirmPassword: '' };

const PasswordDialog = ({ open, onClose }) => {
  const { notify } = useFeedback();
  const [form, setForm] = useState(EMPTY_PASSWORD);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const close = () => {
    setForm(EMPTY_PASSWORD);
    setErrors({});
    onClose();
  };
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const mismatch = form.confirmPassword && form.newPassword !== form.confirmPassword;
  const valid = form.currentPassword && form.newPassword.length >= 6 && form.newPassword === form.confirmPassword;

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      await api.put('/me/password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      notify('Contraseña actualizada.');
      close();
    } catch (err) {
      setErrors(fieldErrors(err));
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog open={open} onClose={close} title="Cambiar contraseña" onSubmit={save} saving={saving} disabled={!valid} maxWidth="xs">
      <PasswordField
        label="Contraseña actual"
        value={form.currentPassword}
        onChange={set('currentPassword')}
        autoComplete="current-password"
        error={!!errors.currentPassword}
        helperText={errors.currentPassword}
        required
      />
      <PasswordField
        label="Nueva contraseña"
        value={form.newPassword}
        onChange={set('newPassword')}
        autoComplete="new-password"
        error={!!errors.newPassword}
        helperText={errors.newPassword || 'Mínimo 6 caracteres'}
        required
      />
      <PasswordField
        label="Repetir nueva contraseña"
        value={form.confirmPassword}
        onChange={set('confirmPassword')}
        autoComplete="new-password"
        error={!!mismatch}
        helperText={mismatch ? 'No coincide' : ' '}
        required
      />
    </FormDialog>
  );
};

const ProfilePage = () => {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const permissions = Object.entries(
    (user.permissions || []).reduce((acc, p) => {
      (acc[p.entity] ||= []).push(ACTION_LABELS[p.action] || p.action);
      return acc;
    }, {}),
  );

  return (
    <>
      <PageHeader title="Mi perfil" />
      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
            <Avatar sx={{ width: 84, height: 84, mx: 'auto', fontSize: 30, fontWeight: 900, bgcolor: 'primary.main' }}>
              {(userName(user) || '?').slice(0, 2).toUpperCase()}
            </Avatar>
            <Typography variant="h5" sx={{ mt: 2 }}>
              {userName(user)}
            </Typography>
            <Typography color="text.secondary">@{user.username}</Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              {user.email}
            </Typography>
            <Chip label={user.roleName || 'Sin rol'} color={user.isAdmin ? 'secondary' : 'primary'} />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="center" sx={{ mt: 3 }}>
              <Button variant="outlined" startIcon={<EditOutlined />} onClick={() => setEditing(true)}>
                Editar datos
              </Button>
              <Button variant="outlined" startIcon={<LockOutlined />} onClick={() => setChangingPassword(true)}>
                Cambiar contraseña
              </Button>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Qué podés hacer
            </Typography>
            <Stack spacing={1.5}>
              {permissions.map(([entity, actions]) => (
                <Box key={entity} sx={{ display: 'flex', gap: 2, alignItems: 'baseline' }}>
                  <Typography sx={{ fontWeight: 800, width: 110, flexShrink: 0 }}>{ENTITY_LABELS[entity] || entity}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    {actions.map((a) => (
                      <Chip key={a} size="small" label={a} variant="outlined" />
                    ))}
                  </Box>
                </Box>
              ))}
              {!permissions.length && <Typography color="text.secondary">Tu rol no tiene permisos asignados.</Typography>}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
      <ProfileDialog open={editing} onClose={() => setEditing(false)} />
      <PasswordDialog open={changingPassword} onClose={() => setChangingPassword(false)} />
    </>
  );
};

export default ProfilePage;
