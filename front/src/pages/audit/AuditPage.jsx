import { useState } from 'react';
import { Autocomplete, Box, Chip, Paper, Stack, TablePagination, TextField, Tooltip, Typography } from '@mui/material';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import GppBadOutlined from '@mui/icons-material/GppBadOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import FileOpenOutlined from '@mui/icons-material/FileOpenOutlined';
import DataTable from '../../components/DataTable';
import UserAvatar from '../../components/UserAvatar';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import { useColumns } from '../../hooks/useColumns';
import { useDebounced } from '../../hooks/useDebounced';
import { useLoader } from '../../hooks/useLoader';
import { api } from '../../lib/api';
import { formatDateTime, userName } from '../../lib/format';

/** Tipos de registro: chip de filtro y cómo se marca cada fila. */
const KINDS = {
  login: { label: 'Ingresos', icon: LoginOutlined, color: 'primary' },
  login_failed: { label: 'Intentos fallidos', icon: GppBadOutlined, color: 'error' },
  logout: { label: 'Salidas', icon: LogoutOutlined, color: 'default' },
  security: { label: 'Seguridad', icon: ShieldOutlined, color: 'warning' },
  change: { label: 'Cambios', icon: EditNoteOutlined, color: 'default' },
  download: { label: 'Documentos', icon: FileOpenOutlined, color: 'secondary' },
};

const COLUMNS = [
  { id: 'date', label: 'Fecha y hora', sx: { whiteSpace: 'nowrap' }, render: (e) => formatDateTime(e.createdAt) },
  {
    id: 'person',
    label: 'Persona',
    render: (e) =>
      e.user ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <UserAvatar user={e.user} size={24} />
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {userName(e.user)}
          </Typography>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" noWrap>
          {e.username || 'Desconocido'}
        </Typography>
      ),
  },
  {
    id: 'what',
    label: 'Qué hizo',
    sx: { maxWidth: 420 },
    render: (e) => {
      const k = KINDS[e.kind] ?? KINDS.change;
      const Icon = k.icon;
      const failed = e.kind === 'login_failed' || (e.status && e.status >= 400);
      return (
        <Stack direction="row" spacing={1} alignItems="center">
          <Icon fontSize="small" color={failed ? 'error' : k.color === 'default' ? 'action' : k.color} />
          <Typography variant="body2" color={failed ? 'error.main' : 'text.primary'}>
            {e.summary}
          </Typography>
        </Stack>
      );
    },
  },
  { id: 'company', label: 'Empresa', render: (e) => e.company || '—' },
  {
    id: 'ip',
    label: 'IP',
    sx: { fontFamily: 'ui-monospace, monospace', whiteSpace: 'nowrap' },
    render: (e) => e.ip || '—',
  },
  {
    id: 'device',
    label: 'Dispositivo',
    render: (e) => (
      <Tooltip title={e.userAgent || ''}>
        <span>{e.device}</span>
      </Tooltip>
    ),
  },
];

/**
 * Auditoría: quién entró, desde qué IP y dispositivo, y qué hizo (cambios, descargas de documentos,
 * acciones de seguridad e intentos fallidos). Solo el equipo de SRV, con todas las empresas.
 */
const AuditPage = () => {
  const [kind, setKind] = useState('');
  const [company, setCompany] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const q = useDebounced(search);
  const columns = useColumns('audit-all', COLUMNS);

  const companies = useLoader(() => api.get('/platform/companies').then((r) => r.data), []);
  const { data, loading, error, reload } = useLoader(
    () =>
      api
        .get('/audit', { params: { kind: kind || undefined, company: company?.id, from: from || undefined, to: to || undefined, q: q || undefined, page: page + 1 } })
        .then((r) => r.data),
    [kind, company, from, to, q, page],
  );
  const reset = (fn) => (v) => {
    fn(v);
    setPage(0);
  };

  return (
    <>
      <PageHeader overline="SRV" title="Auditoría" subtitle="Quién entró, desde dónde y qué hizo, en todas las empresas. Los registros se guardan un año." />

      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          <Chip label="Todo" color={!kind ? 'primary' : 'default'} variant={!kind ? 'filled' : 'outlined'} onClick={() => reset(setKind)('')} />
          {Object.entries(KINDS).map(([k, v]) => {
            const Icon = v.icon;
            return <Chip key={k} icon={<Icon />} label={v.label} color={kind === k ? 'primary' : 'default'} variant={kind === k ? 'filled' : 'outlined'} onClick={() => reset(setKind)(k)} />;
          })}
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
          <Autocomplete
            sx={{ flex: 1, minWidth: 220 }}
            options={companies.data || []}
            value={company}
            onChange={(_, v) => reset(setCompany)(v)}
            getOptionLabel={(c) => c.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            renderInput={(params) => <TextField {...params} label="Empresa" placeholder="Todas" />}
          />
          <TextField type="date" label="Desde" value={from} onChange={(e) => reset(setFrom)(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField type="date" label="Hasta" value={to} onChange={(e) => reset(setTo)(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField sx={{ flex: 1 }} label="Buscar persona, texto o IP" value={search} onChange={(e) => reset(setSearch)(e.target.value)} />
        </Stack>
      </Stack>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : (
        <Paper variant="outlined" sx={{ opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
          <DataTable columns={columns} rows={data.entries} minWidth={900} />
          {!data.entries.length && <EmptyState title="No hay registros con esos filtros" />}
          <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
            <TablePagination
              component="div"
              count={data.total}
              page={page}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={data.pageSize}
              rowsPerPageOptions={[data.pageSize]}
              labelDisplayedRows={({ from: a, to: b, count }) => `${a}–${b} de ${count.toLocaleString('es-AR')}`}
            />
          </Box>
        </Paper>
      )}
    </>
  );
};

export default AuditPage;
