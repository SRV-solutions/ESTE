import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Chip,
  Grid,
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
  Typography,
} from '@mui/material';
import Add from '@mui/icons-material/Add';
import BugReportOutlined from '@mui/icons-material/BugReportOutlined';
import MailOutlined from '@mui/icons-material/MailOutlined';
import FormDialog from '../../components/FormDialog';
import { PLAN_OPTIONS } from '../../lib/plans';
import PasswordField from '../../components/PasswordField';
import { EmptyState, ErrorState, Loading, PageHeader, StatTile } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { api, errorMessage, fieldErrors } from '../../lib/api';
import { formatDate } from '../../lib/format';
import { ACCESS_STATE, formatArs, formatUsd } from '../../lib/money';
import { BRAND } from '../../theme';
import CompanyForm from '../billing/CompanyForm';
import { EMPTY_COMPANY } from '../billing/companyDefaults';

const EMPTY_ADMIN = { firstname: '', lastname: '', username: '', email: '', password: '' };

const NewCompanyDialog = ({ open, onClose, onCreated }) => {
  const { notify, confirm } = useFeedback();
  const [company, setCompany] = useState(EMPTY_COMPANY);
  const [admin, setAdmin] = useState(EMPTY_ADMIN);
  const [plan, setPlan] = useState('profesional');
  const [price, setPrice] = useState(1200);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const setA = (field) => (e) => setAdmin((a) => ({ ...a, [field]: e.target.value }));
  const valid = company.name.trim() && admin.username.trim() && admin.email.trim() && (!admin.password || admin.password.length >= 8);

  const save = async () => {
    setSaving(true);
    setErrors({});
    try {
      const { data } = await api.post('/platform/companies', { ...company, plan, monthlyPriceUsd: price, admin });
      notify(
        data.mailed
          ? `${data.name} creada. Le mandamos a ${admin.email} el usuario ${admin.username} y la contraseña temporal.`
          : `${data.name} creada, pero no se pudo mandar el mail: pasale la contraseña al administrador.`,
        data.mailed ? 'success' : 'warning',
      );
      setCompany(EMPTY_COMPANY);
      setAdmin(EMPTY_ADMIN);
      onCreated(data);
      if (data.temporaryPassword) {
        await confirm({
          title: `Contraseña temporal de ${data.name}`,
          message: `Usuario: ${admin.username}
Contraseña temporal: ${data.temporaryPassword}

No se pudo mandar el mail. Copiala ahora: no se vuelve a mostrar. La cambia al entrar.`,
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

  return (
    <FormDialog open={open} onClose={onClose} title="Nueva empresa" onSubmit={save} saving={saving} disabled={!valid} submitLabel="Crear empresa" maxWidth="md">
      <CompanyForm value={company} onChange={setCompany} errors={errors} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label="Plan"
          value={plan}
          onChange={(e) => {
            const p = PLAN_OPTIONS.find((o) => o.id === e.target.value);
            setPlan(p.id);
            setPrice(p.priceUsd);
          }}
          sx={{ minWidth: 240 }}
        >
          {PLAN_OPTIONS.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name} · USD {p.priceUsd} · {p.maxUsers} usuarios
            </MenuItem>
          ))}
        </TextField>
        <TextField
          type="number"
          label="Precio mensual (USD)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          inputProps={{ min: 0 }}
          helperText="El del plan, o uno especial. Se cobra al dólar blue y arranca con días de prueba."
          sx={{ maxWidth: 320 }}
        />
      </Stack>
      <Typography variant="h6">Administrador de la empresa</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Nombre" value={admin.firstname} onChange={setA('firstname')} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Apellido" value={admin.lastname} onChange={setA('lastname')} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth label="Usuario" value={admin.username} onChange={setA('username')} required error={!!errors.username} helperText={errors.username} autoComplete="off" />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField fullWidth type="email" label="Email" value={admin.email} onChange={setA('email')} required error={!!errors.email} helperText={errors.email} />
        </Grid>
        <Grid item xs={12} sm={4}>
          <PasswordField
            fullWidth
            label="Contraseña temporal"
            value={admin.password}
            onChange={setA('password')}
            autoComplete="new-password"
            error={!!errors.password}
            helperText={errors.password || 'Opcional (mínimo 8). Vacía, la generamos. Le llega por mail.'}
          />
        </Grid>
      </Grid>
    </FormDialog>
  );
};

/** Manda un mail de prueba y muestra el motivo exacto si Resend lo rechaza (dominio sin verificar, remitente mal escrito…). */
const EmailTestDialog = ({ open, onClose }) => {
  const { user } = useAuth();
  const [to, setTo] = useState('');
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    setResult(null);
    try {
      const { data } = await api.post('/platform/email-test', { to: to.trim() || undefined });
      setResult(data);
    } catch (err) {
      setResult({ ok: false, error: errorMessage(err) });
    } finally {
      setSending(false);
    }
  };
  const close = () => {
    setResult(null);
    onClose();
  };

  return (
    <FormDialog open={open} onClose={close} title="Probar mail" onSubmit={send} saving={sending} submitLabel="Mandar prueba" maxWidth="xs">
      <TextField type="email" label="Mandar a" value={to} onChange={(e) => setTo(e.target.value)} placeholder={user?.email || 'tu@email.com'} helperText="Vacío: a tu email." />
      {result &&
        (result.ok ? (
          <Alert severity="success">
            Resend aceptó el mail para {result.to}. Si no aparece en unos minutos, revisá spam. Remitente: {result.from}
          </Alert>
        ) : (
          <Alert severity="error">
            {result.error}
            {result.from && (
              <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                Remitente configurado (EMAIL_FROM): {result.from}
              </Typography>
            )}
          </Alert>
        ))}
    </FormDialog>
  );
};

const PlatformPage = () => {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const { data, loading, error, reload } = useLoader(async () => {
    const [overview, companies] = await Promise.all([api.get('/platform/overview').then((r) => r.data), api.get('/platform/companies').then((r) => r.data)]);
    return { overview, companies };
  }, []);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const { overview, companies } = data;

  return (
    <>
      <PageHeader
        overline="SRV"
        title="Panel de la plataforma"
        subtitle="Empresas que usan Event Box, sus suscripciones y la facturación."
        actions={
          <>
            <Button variant="outlined" startIcon={<BugReportOutlined />} onClick={() => navigate('/platform/feedback')}>
              Reportes{overview.openFeedback ? ` (${overview.openFeedback})` : ''}
            </Button>
            <Button variant="contained" startIcon={<Add />} onClick={() => setCreating(true)}>
              Nueva empresa
            </Button>
          </>
        }
      />

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}>
          <StatTile label="Empresas" value={overview.companies} hint={`${overview.byState.active} al día · ${overview.byState.grace} en gracia`} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatTile label="Bloqueadas / suspendidas" value={overview.byState.blocked + overview.byState.suspended} accent={overview.byState.blocked ? BRAND.orange : undefined} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatTile label="Ingreso mensual" value={formatUsd(overview.mrrUsd)} hint={overview.mrrArs ? `≈ ${formatArs(overview.mrrArs)}` : undefined} />
        </Grid>
        <Grid item xs={6} md={3}>
          <StatTile label="Cobrado (30 días)" value={formatArs(overview.collectedLast30DaysArs)} hint={overview.rate ? `Blue ${formatArs(overview.rate.sell)}` : 'Sin cotización'} />
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        <Chip
          variant="outlined"
          color={overview.integrations.mercadoPago ? 'success' : 'default'}
          label={`Mercado Pago: ${overview.integrations.mercadoPago ? 'conectado' : 'sin configurar'}`}
        />
        <Chip
          variant="outlined"
          color={overview.integrations.arca ? (overview.integrations.arcaProduction ? 'success' : 'warning') : 'default'}
          label={`ARCA: ${overview.integrations.arca ? (overview.integrations.arcaProduction ? 'producción' : 'homologación (pruebas)') : 'sin configurar'}`}
        />
        <Chip
          variant="outlined"
          color={overview.integrations.r2 ? 'success' : 'warning'}
          label={`Archivos: ${overview.integrations.r2 ? 'Cloudflare R2' : 'disco local (solo desarrollo)'}`}
        />
        <Chip
          variant="outlined"
          color={overview.integrations.email ? 'success' : 'default'}
          label={`Mails (Resend): ${overview.integrations.email ? 'conectado' : 'sin configurar'}`}
        />
        <Chip variant="outlined" icon={<MailOutlined />} label="Probar mail" onClick={() => setTestingEmail(true)} />
      </Stack>
      <EmailTestDialog open={testingEmail} onClose={() => setTestingEmail(false)} />

      <TableContainer component={Paper} variant="outlined">
        <Table size="small" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              <TableCell>Empresa</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Paga hasta</TableCell>
              <TableCell>Plan</TableCell>
              <TableCell align="right">Usuarios</TableCell>
              <TableCell align="right">Ítems</TableCell>
              <TableCell align="right">Órdenes activas</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companies.map((c) => (
              <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/platform/companies/${c.id}`)}>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {c.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.cuit ? `CUIT ${c.cuit}` : 'Sin CUIT'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip size="small" label={ACCESS_STATE[c.subscription.state].label} color={ACCESS_STATE[c.subscription.state].color} variant="outlined" />
                </TableCell>
                <TableCell>{formatDate(c.paidUntil)}</TableCell>
                <TableCell>
                  {PLAN_OPTIONS.find((p) => p.id === c.plan)?.name ?? c.plan} · {formatUsd(c.monthlyPriceUsd)}
                </TableCell>
                <TableCell align="right">{c.userCount}</TableCell>
                <TableCell align="right">{Number(c.itemCount).toLocaleString('es-AR')}</TableCell>
                <TableCell align="right">{c.activeOrderCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!companies.length && <EmptyState title="Todavía no hay empresas" description="Creá la primera con su administrador." />}
      </TableContainer>

      <NewCompanyDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(c) => {
          setCreating(false);
          navigate(`/platform/companies/${c.id}`);
        }}
      />
    </>
  );
};

export default PlatformPage;
