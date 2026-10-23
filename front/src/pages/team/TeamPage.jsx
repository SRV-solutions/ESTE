import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import FormDialog from '../../components/FormDialog';
import PasswordField from '../../components/PasswordField';
import UserAvatar from '../../components/UserAvatar';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { useUrlParams } from '../../hooks/useUrlParams';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import { formatDate, formatDateTime, timeAgo, userName } from '../../lib/format';
import RolesSection from './RolesSection';

/** Tipos de acceso. "Sin acceso" es parte del módulo de sueldos. */
const ACCESS = {
  app: {
    label: 'Usa la app',
    short: 'App',
    help: 'Entra a Event Box con su usuario. Cuenta para el límite de usuarios del plan.',
  },
  temporary: {
    label: 'Temporal',
    short: 'Temporal',
    help: 'Entra de 1 a 10 días (un evento, un reemplazo) y después el acceso se corta solo; se puede renovar. No cuenta para el límite de usuarios.',
  },
  none: {
    label: 'Sin acceso',
    short: 'Sin acceso',
    help: 'No entra a la app: eventuales o personal que solo cobra. Tiene datos laborales y recibos (firma en papel).',
  },
};

const EMPTY = {
  access: 'app',
  firstname: '',
  lastname: '',
  email: '',
  dni: '',
  username: '',
  password: '',
  roleId: '',
  days: 1,
  renew: '',
  cuil: '',
  position: '',
  area: '',
  startDate: '',
  phone: '',
  isActive: true,
};

/** Chip con el estado del acceso de la persona. */
const AccessChip = ({ person }) => {
  if (person.disabledAt) return <Chip size="small" color="warning" variant="outlined" label="Desactivado" />;
  if (person.access === 'none') return <Chip size="small" label="Sin acceso" />;
  if (person.access === 'temporary') {
    return person.canLogin ? (
      <Chip size="small" color="secondary" label={`Temporal · hasta ${formatDateTime(person.accessUntil)}`} />
    ) : (
      <Chip size="small" label="Temporal vencido" />
    );
  }
  return null;
};

const PersonDialog = ({ person, roles: allRoles, payroll, limits, onClose, onSaved }) => {
  const { notify, confirm } = useFeedback();
  const { user: me, isAdmin, can } = useAuth();
  const [acting, setActing] = useState(false);

  const act = async ({ title, message, confirmLabel, request }) => {
    if (!(await confirm({ title, message, confirmLabel, danger: true }))) return;
    setActing(true);
    try {
      const { data } = await request();
      notify(data.message);
      onSaved();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setActing(false);
    }
  };
  const disabled = !!person.disabledAt;
  const toggleDisabled = () =>
    act({
      title: disabled ? `Activar a ${userName(person)}` : `Desactivar a ${userName(person)}`,
      message: disabled
        ? 'Vuelve a poder entrar y a contar para el límite de usuarios del plan.'
        : 'No va a poder entrar y deja de contar para el plan. Sus órdenes, recibos y datos quedan guardados; se puede volver a activar cuando quieras.',
      confirmLabel: disabled ? 'Activar' : 'Desactivar',
      request: () => api.patch(`/team/${person.id}/disabled`, { disabled: !disabled }),
    });
  const remove = () =>
    act({
      title: `Eliminar a ${userName(person)} definitivamente`,
      message: 'Se borra el usuario y sus recibos de sueldo. Las órdenes que creó quedan sin creador y el material a su cargo sin responsable. No se puede deshacer.',
      confirmLabel: 'Eliminar definitivamente',
      request: () => api.delete(`/team/${person.id}`),
    });
  const isNew = !person.id;
  const isMe = person.id === me.id;
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    ...Object.fromEntries(Object.entries(person).map(([k, v]) => [k, v ?? EMPTY[k] ?? ''])),
    password: '',
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (f) => (e) => setForm((s) => ({ ...s, [f]: e.target.value }));
  const login = form.access !== 'none';
  // Pasa a tener usuario por primera vez: si no le ponen contraseña, se genera una temporal.
  const needsPassword = login && (isNew || person.access === 'none');
  const becomesTemporary = form.access === 'temporary' && person.access !== 'temporary';
  // El rol Administrador lo da solo un administrador, y nunca a un acceso temporal.
  const roles = allRoles.filter((r) => !r.locked || (isAdmin && form.access === 'app') || r.id === person.roleId);
  const dayOptions = Array.from({ length: limits.temporaryMaxDays }, (_, i) => i + 1);

  const valid =
    form.firstname.trim() && (form.access !== 'app' || form.email.trim()) && (!login || (form.username.trim() && form.roleId && (!form.password || form.password.length >= 6)));

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const { renew, days, ...rest } = form;
      const payload = {
        ...rest,
        ...(!form.password ? { password: undefined } : {}),
      };
      if (form.access === 'temporary') {
        if (isNew || becomesTemporary) payload.days = days;
        else if (renew) payload.days = renew;
      }
      const { data } = isNew ? await api.post('/team', payload) : await api.patch(`/team/${person.id}`, payload);
      notify(data.message, data.temporaryPassword ? 'warning' : 'success');
      onSaved();
      // El mail no salió: el administrador ve la contraseña generada para pasársela.
      if (data.temporaryPassword) {
        await confirm({
          title: `Contraseña temporal de ${form.firstname.trim()}`,
          message: `Usuario: ${form.username.trim()}
Contraseña temporal: ${data.temporaryPassword}

${data.message}
Copiala ahora: no se vuelve a mostrar.`,
          confirmLabel: 'Listo',
        });
      }
    } catch (err) {
      setErrors(fieldErrors(err));
      notify(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, { helperText, ...props } = {}) => (
    <TextField fullWidth label={label} value={form[key] ?? ''} onChange={set(key)} error={!!errors[key]} helperText={errors[key] || helperText} {...props} />
  );

  return (
    <FormDialog open onClose={onClose} title={isNew ? 'Agregar persona' : userName(person)} onSubmit={save} saving={saving} disabled={!valid} maxWidth="md">
      <Box>
        <ToggleButtonGroup exclusive fullWidth size="small" color="primary" value={form.access} onChange={(_, v) => v && setForm((s) => ({ ...s, access: v }))} disabled={isMe}>
          <ToggleButton value="app">{ACCESS.app.label}</ToggleButton>
          <ToggleButton value="temporary">{ACCESS.temporary.label}</ToggleButton>
          <ToggleButton value="none" disabled={!payroll}>
            {ACCESS.none.label}
          </ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {isMe ? 'No podés cambiar tu propio acceso.' : ACCESS[form.access].help}
          {!payroll && form.access !== 'none' && !isMe && ' Las personas sin acceso son parte del módulo de sueldos (plan Profesional).'}
        </Typography>
        {!isNew && person.access !== 'none' && (
          <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
            {person.lastLoginAt ? `Último ingreso: ${formatDateTime(person.lastLoginAt)}${person.lastLoginIp ? ` desde ${person.lastLoginIp}` : ''}.` : 'Todavía no entró a Event Box.'}
          </Typography>
        )}
        {form.access === 'app' && person.access !== 'app' && (
          <Typography variant="caption" color={limits.appUsers >= limits.maxUsers ? 'error' : 'text.secondary'}>
            Usuarios de la app: {limits.appUsers} de {limits.maxUsers}.
          </Typography>
        )}
        {becomesTemporary && (
          <Typography variant="caption" color={limits.activeTemporary >= limits.maxTemporary ? 'error' : 'text.secondary'}>
            Temporales activos: {limits.activeTemporary} de {limits.maxTemporary}.
          </Typography>
        )}
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          {field('firstname', 'Nombre', { required: true, autoFocus: isNew })}
        </Grid>
        <Grid item xs={12} sm={6}>
          {field('lastname', 'Apellido')}
        </Grid>
        <Grid item xs={12} sm={login ? 6 : 12}>
          {field('email', form.access === 'app' ? 'Email' : 'Email (opcional)', { type: 'email', required: form.access === 'app' })}
        </Grid>
        <Grid item xs={12} sm={6}>
          {field('dni', 'DNI', { inputProps: { inputMode: 'numeric', maxLength: 10 }, helperText: 'Opcional. Sirve para entrar; si cargás el CUIL, se completa solo.' })}
        </Grid>
        {login && (
          <>
            <Grid item xs={12} sm={6}>
              {field('username', 'Usuario para entrar', {
                required: true,
                autoComplete: 'off',
                inputProps: { autoCapitalize: 'none' },
              })}
            </Grid>
            <Grid item xs={12} sm={6}>
              <PasswordField
                fullWidth
                label={needsPassword ? 'Contraseña temporal' : 'Nueva contraseña temporal'}
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
                error={!!errors.password}
                helperText={
                  errors.password ||
                  (needsPassword
                    ? 'Opcional: si la dejás vacía la generamos. Le llega por mail y la cambia al entrar.'
                    : isMe
                      ? 'Dejala vacía para no cambiarla.'
                      : 'Dejala vacía para no cambiarla. Si ponés una, le llega por mail y la cambia al entrar.')
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              {field('roleId', 'Rol', {
                select: true,
                required: true,
                disabled: isMe,
                helperText: roles.find((r) => r.id === form.roleId)?.description,
                children: roles.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.roleName}
                  </MenuItem>
                )),
              })}
            </Grid>
          </>
        )}
        {form.access === 'temporary' && (
          <Grid item xs={12}>
            {isNew || becomesTemporary ? (
              field('days', 'Acceso por', {
                select: true,
                helperText: `Hasta ${limits.temporaryMaxDays} días. Después se puede renovar las veces que haga falta.`,
                children: dayOptions.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d === 1 ? '1 día (24 h)' : `${d} días`}
                  </MenuItem>
                )),
              })
            ) : (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  {person.canLogin ? `El acceso vence el ${formatDateTime(person.accessUntil)}.` : `El acceso venció el ${formatDateTime(person.accessUntil)}.`}
                </Typography>
                {field('renew', 'Renovar', {
                  select: true,
                  sx: { minWidth: 220 },
                  children: [
                    <MenuItem key="0" value="">
                      No renovar
                    </MenuItem>,
                    ...dayOptions.map((d) => (
                      <MenuItem key={d} value={d}>
                        {d === 1 ? '1 día' : `${d} días`} desde ahora
                      </MenuItem>
                    )),
                  ],
                })}
              </Stack>
            )}
          </Grid>
        )}

        {payroll && (
          <>
            <Grid item xs={12}>
              <Typography variant="overline" color="text.disabled">
                Datos laborales
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              {field('cuil', 'CUIL', {
                inputProps: { inputMode: 'numeric', maxLength: 13 },
              })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {field('startDate', 'Fecha de ingreso', {
                type: 'date',
                InputLabelProps: { shrink: true },
              })}
            </Grid>
            <Grid item xs={12} sm={6}>
              {field('position', 'Puesto')}
            </Grid>
            <Grid item xs={12} sm={6}>
              {field('area', 'Área')}
            </Grid>
            <Grid item xs={12} sm={6}>
              {field('phone', 'Teléfono')}
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Switch checked={!!form.isActive} onChange={(e) => setForm((s) => ({ ...s, isActive: e.target.checked }))} />}
                label="Cobra sueldo (aparece al cargar recibos)"
              />
            </Grid>
          </>
        )}
        {!isNew && !isMe && (
          <Grid item xs={12}>
            <Box sx={{ mt: 1, p: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2">{disabled ? 'Usuario desactivado' : 'Desactivar o eliminar'}</Typography>
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1.5 }}>
                {disabled
                  ? `Desactivado el ${formatDateTime(person.disabledAt)}: no entra ni cuenta para el plan.`
                  : 'Desactivar conserva todo y se puede revertir. Eliminar es definitivo.'}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button variant="outlined" color={disabled ? 'primary' : 'warning'} size="small" onClick={toggleDisabled} disabled={acting || saving}>
                  {disabled ? 'Volver a activar' : 'Desactivar'}
                </Button>
                {isAdmin && can('users', 'delete') && (
                  <Button variant="outlined" color="error" size="small" onClick={remove} disabled={acting || saving}>
                    Eliminar definitivamente
                  </Button>
                )}
              </Stack>
            </Box>
          </Grid>
        )}
      </Grid>
    </FormDialog>
  );
};

const Usage = ({ label, used, max }) => {
  const pct = Math.min((used / max) * 100, 100);
  return (
    <Box sx={{ flex: 1, minWidth: 180 }}>
      <Typography variant="caption" color="text.secondary">
        {label}: {used} de {max}
      </Typography>
      <LinearProgress variant="determinate" value={pct} color={pct >= 100 ? 'error' : pct > 85 ? 'warning' : 'primary'} sx={{ height: 8, borderRadius: 4 }} />
    </Box>
  );
};

const FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'app', label: 'Usan la app' },
  { value: 'temporary', label: 'Temporales' },
  { value: 'none', label: 'Sin acceso' },
];

/** Equipo: todas las personas de la empresa, su acceso a la app, su rol y sus datos laborales. */
const TeamPage = () => {
  const { can, user: me } = useAuth();
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('people');
  const { data, loading, error, reload } = useLoader(async () => {
    const [team, roles] = await Promise.all([api.get('/team').then((r) => r.data), api.get('/roles').then((r) => r.data)]);
    return { ...team, roles };
  }, []);
  // Desde el buscador: agregar una persona, ver los roles o abrir la ficha de alguien.
  useUrlParams(({ accion, buscar, ver }) => {
    if (accion === 'nueva' && can('users', 'create')) setEditing({});
    if (accion === 'roles') setTab('roles');
    if (buscar) setSearch(buscar);
    const person = ver && data.people.find((p) => String(p.id) === ver);
    if (person) {
      setTab('people');
      setEditing(person);
    }
  }, !!data);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.people || []).filter(
      (p) =>
        (filter === 'all' || p.access === filter) &&
        (!q || `${p.username ?? ''} ${p.email ?? ''} ${p.firstname ?? ''} ${p.lastname ?? ''} ${p.roleName ?? ''} ${p.position ?? ''} ${p.area ?? ''}`.toLowerCase().includes(q)),
    );
  }, [data, search, filter]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const { limits, payroll } = data;

  return (
    <>
      <PageHeader
        title="Equipo"
        subtitle="Todas las personas de la empresa: quién entra a la app, con qué rol, y sus datos laborales."
        actions={
          tab === 'people' &&
          can('users', 'create') && (
            <Button variant="contained" startIcon={<Add />} onClick={() => setEditing({})}>
              Agregar persona
            </Button>
          )
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab value="people" label={`Personas (${data.people.length})`} />
        <Tab value="roles" label="Roles y permisos" />
      </Tabs>

      {tab === 'roles' ? (
        <RolesSection roles={data.roles} onChanged={reload} />
      ) : (
        <>
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Usage label="Usuarios de la app" used={limits.appUsers} max={limits.maxUsers} />
              <Usage label={`Temporales activos (hasta ${limits.temporaryMaxDays} días c/u)`} used={limits.activeTemporary} max={limits.maxTemporary} />
            </Stack>
          </Paper>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }} alignItems={{ md: 'center' }}>
            <TextField label="Buscar por nombre, usuario, rol o puesto" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }} />
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {FILTERS.filter((f) => f.value !== 'none' || payroll).map((f) => (
                <Chip
                  key={f.value}
                  label={f.label}
                  color={filter === f.value ? 'primary' : 'default'}
                  variant={filter === f.value ? 'filled' : 'outlined'}
                  onClick={() => setFilter(f.value)}
                />
              ))}
            </Stack>
          </Stack>

          {!visible.length ? (
            <Paper variant="outlined">
              <EmptyState title="No hay personas para mostrar" />
            </Paper>
          ) : (
            <Grid container spacing={1.5}>
              {visible.map((p) => (
                <Grid item xs={12} sm={6} lg={4} key={p.id}>
                  <Paper
                    variant="outlined"
                    onClick={can('users', 'update') ? () => setEditing(p) : undefined}
                    sx={{
                      p: 2,
                      display: 'flex',
                      gap: 1.5,
                      alignItems: 'center',
                      height: '100%',
                      cursor: can('users', 'update') ? 'pointer' : 'default',
                      opacity: p.disabledAt ? 0.5 : p.access === 'none' || p.canLogin ? 1 : 0.6,
                      '&:hover': can('users', 'update') ? { borderColor: 'primary.main' } : undefined,
                    }}
                  >
                    <UserAvatar user={p} size={42} sx={p.id === me.id ? { bgcolor: 'secondary.main' } : undefined} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontWeight: 800 }} noWrap>
                        {userName(p)}
                        {p.id === me.id && (
                          <Typography component="span" variant="caption" color="text.secondary">
                            {' '}
                            (vos)
                          </Typography>
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" component="div" noWrap>
                        {[p.username && `@${p.username}`, p.position, p.area].filter(Boolean).join(' · ') || p.email || '—'}
                        {p.startDate ? ` · desde ${formatDate(p.startDate)}` : ''}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" component="div" noWrap>
                        {p.access === 'none' ? 'No usa la app' : p.lastLoginAt ? `Último ingreso ${timeAgo(p.lastLoginAt)}` : 'Nunca entró'}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                        {p.access !== 'none' && p.roleName && <Chip size="small" label={p.roleName} variant="outlined" />}
                        <AccessChip person={p} />
                        {p.pendingCount > 0 && <Chip size="small" color="warning" label={`${p.pendingCount} sin firmar`} />}
                        {payroll && p.isActive === false && <Chip size="small" label="No cobra sueldo" />}
                      </Stack>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}

          {!payroll && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Con el plan Profesional, cada persona suma sus datos laborales y sus recibos de sueldo, y podés cargar personal que no usa la app.
            </Alert>
          )}
        </>
      )}

      {editing && (
        <PersonDialog
          person={editing}
          roles={data.roles}
          payroll={payroll}
          limits={limits}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
};

export default TeamPage;
