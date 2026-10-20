import { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import LockOutlined from '@mui/icons-material/LockOutlined';
import FormDialog from '../../components/FormDialog';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import { FEATURE_LABELS, MIN_PLAN } from '../../lib/plans';

const ACTIONS = [
  { id: 'read', label: 'Ver' },
  { id: 'create', label: 'Crear' },
  { id: 'update', label: 'Editar' },
  { id: 'delete', label: 'Borrar' },
];

/** Las secciones y acciones las define la API (plans.permissionEntities); acá solo se dibujan. */
const summary = (entities, permissions) =>
  entities.map((e) => {
    const acts = ACTIONS.filter((a) => e.actions.includes(a.id) && permissions.includes(`${e.id}.${a.id}`));
    if (!acts.length) return null;
    return { text: `${e.label}: ${acts.length === e.actions.length ? 'todo' : acts.map((a) => a.label.toLowerCase()).join(', ')}`, feature: e.feature };
  }).filter(Boolean);

const RoleDialog = ({ role, entities, onClose, onSaved }) => {
  const { notify } = useFeedback();
  const { hasFeature } = useAuth();
  const isNew = !role.id;
  const [form, setForm] = useState({ roleName: role.roleName || '', description: role.description || '', permissions: role.permissions || ['serviceOrders.read'] });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const has = (k) => form.permissions.includes(k);

  // Sin "ver" no tiene sentido crear/editar/borrar: marcar una acción marca "ver"; desmarcar "ver" limpia la fila.
  const toggle = (entity, action) =>
    setForm((f) => {
      const key = `${entity}.${action}`;
      let next = f.permissions.includes(key) ? f.permissions.filter((p) => p !== key) : [...f.permissions, key];
      if (action === 'read' && !next.includes(key)) next = next.filter((p) => !p.startsWith(`${entity}.`));
      if (action !== 'read' && next.includes(key) && !next.includes(`${entity}.read`)) next.push(`${entity}.read`);
      return { ...f, permissions: next };
    });

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const { data } = isNew ? await api.post('/roles', form) : await api.patch(`/roles/${role.id}`, form);
      notify(data.message);
      onSaved();
    } catch (err) {
      setErrors(fieldErrors(err));
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog open onClose={onClose} title={isNew ? 'Nuevo rol' : `Rol ${role.roleName}`} onSubmit={save} saving={saving} disabled={form.roleName.trim().length < 2} maxWidth="md">
      <Grid container spacing={2}>
        <Grid item xs={12} sm={5}>
          <TextField fullWidth required autoFocus={isNew} label="Nombre" value={form.roleName} onChange={(e) => setForm((f) => ({ ...f, roleName: e.target.value }))} error={!!errors.roleName} helperText={errors.roleName} />
        </Grid>
        <Grid item xs={12} sm={7}>
          <TextField fullWidth label="Descripción" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Para qué es este rol" />
        </Grid>
      </Grid>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 460 }}>
          <TableHead>
            <TableRow>
              <TableCell>Sección</TableCell>
              {ACTIONS.map((a) => (
                <TableCell key={a.id} align="center">
                  {a.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {entities.map((e) => {
              const locked = e.feature && !hasFeature(e.feature);
              return (
                <TableRow key={e.id} sx={{ opacity: locked ? 0.55 : 1 }}>
                  <TableCell>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {e.label}
                      </Typography>
                      {e.feature && (
                        <Tooltip title={locked ? `Módulo del plan ${MIN_PLAN[e.feature]}: la empresa no lo tiene. El permiso se guarda, pero no tiene efecto hasta pasar de plan.` : `Módulo ${FEATURE_LABELS[e.feature]} (incluido en tu plan)`}>
                          <Chip size="small" icon={locked ? <LockOutlined /> : undefined} label={locked ? `Plan ${MIN_PLAN[e.feature]}` : 'Módulo'} sx={{ height: 20, fontSize: 11 }} />
                        </Tooltip>
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {e.hint}
                    </Typography>
                  </TableCell>
                  {ACTIONS.map((a) =>
                    e.actions.includes(a.id) ? (
                      <TableCell key={a.id} align="center" padding="checkbox">
                        <Checkbox checked={has(`${e.id}.${a.id}`)} onChange={() => toggle(e.id, a.id)} inputProps={{ 'aria-label': `${e.label}: ${a.label}` }} />
                      </TableCell>
                    ) : (
                      <TableCell key={a.id} align="center" padding="checkbox">
                        <Typography variant="caption" color="text.disabled">
                          —
                        </Typography>
                      </TableCell>
                    ),
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
      <Typography variant="caption" color="text.secondary">
        Marcar una acción también marca “Ver”. Los módulos con candado son de un plan superior: el permiso queda guardado y se activa al cambiar de plan. Los datos de la empresa, el abono y los roles son solo del Administrador.
      </Typography>
    </FormDialog>
  );
};

/** Roles de la empresa y qué puede hacer cada uno. Solo el administrador los modifica. */
const RolesSection = ({ roles, onChanged }) => {
  const { isAdmin, hasFeature } = useAuth();
  const { notify, confirm } = useFeedback();
  const [editing, setEditing] = useState(null);
  const { data: plans } = useLoader(() => api.get('/plans').then((r) => r.data), []);
  const entities = plans?.permissionEntities || [];

  const remove = async (role) => {
    if (!(await confirm({ title: `Borrar el rol ${role.roleName}`, confirmLabel: 'Borrar', danger: true }))) return;
    try {
      const { data } = await api.delete(`/roles/${role.id}`);
      notify(data.message);
      onChanged();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1} sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {isAdmin ? 'Tocá un rol para cambiar sus permisos.' : 'Solo el administrador de la empresa puede modificar los roles.'}
        </Typography>
        {isAdmin && (
          <Button variant="outlined" startIcon={<Add />} onClick={() => setEditing({})}>
            Nuevo rol
          </Button>
        )}
      </Stack>
      <Grid container spacing={1.5}>
        {roles.map((r) => {
          const editable = isAdmin && !r.locked;
          return (
            <Grid item xs={12} md={6} key={r.id}>
              <Paper
                variant="outlined"
                onClick={editable ? () => setEditing(r) : undefined}
                sx={{ p: 2, height: '100%', cursor: editable ? 'pointer' : 'default', '&:hover': editable ? { borderColor: 'primary.main' } : undefined }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ fontWeight: 800, flex: 1 }}>{r.roleName}</Typography>
                  {r.locked ? (
                    <Chip size="small" icon={<LockOutlined />} label="Todos los permisos" />
                  ) : (
                    <Chip size="small" variant="outlined" label={`${r.userCount} persona${r.userCount === 1 ? '' : 's'}`} />
                  )}
                  {editable && r.userCount === 0 && (
                    <Tooltip title="Borrar rol">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(r);
                        }}
                        sx={{ '&:hover': { color: 'error.main' } }}
                      >
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
                {r.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {r.description}
                  </Typography>
                )}
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                  {r.locked ? (
                    <Typography variant="caption" color="text.secondary">
                      Configura la empresa, el equipo y los roles. No se modifica.
                    </Typography>
                  ) : (
                    summary(entities, r.permissions).map((s) => (
                      <Chip key={s.text} size="small" label={s.text} icon={s.feature && !hasFeature(s.feature) ? <LockOutlined /> : undefined} sx={{ opacity: s.feature && !hasFeature(s.feature) ? 0.6 : 1 }} />
                    ))
                  )}
                  {!r.locked && !r.permissions.length && (
                    <Typography variant="caption" color="text.secondary">
                      Sin permisos: solo entra a su perfil y a sus recibos.
                    </Typography>
                  )}
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
      {editing && (
        <RoleDialog
          role={editing}
          entities={entities}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      )}
    </>
  );
};

export default RolesSection;
