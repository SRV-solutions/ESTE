import { useState } from 'react';
import { Box, Button, Chip, Link, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { EmptyState, ErrorState, Loading, PageHeader } from '../../components/ui';
import UserAvatar from '../../components/UserAvatar';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { api, errorMessage } from '../../lib/api';
import { formatDateTime, userName } from '../../lib/format';

const TYPE = {
  error: { label: 'Error', color: 'error' },
  sugerencia: { label: 'Sugerencia', color: 'primary' },
  consulta: { label: 'Consulta', color: 'secondary' },
};

/** Reportes que mandan los usuarios desde el botón "Reportar un problema". */
const FeedbackPage = () => {
  const { notify } = useFeedback();
  const [status, setStatus] = useState('open');
  const { data, loading, error, reload } = useLoader(() => api.get('/platform/feedback', { params: { status } }).then((r) => r.data), [status]);

  const setResolved = async (item, resolved) => {
    try {
      await api.patch(`/platform/feedback/${item.id}`, { status: resolved ? 'resolved' : 'open' });
      notify(resolved ? 'Marcado como resuelto.' : 'Reabierto.');
      reload();
    } catch (err) {
      notify(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <PageHeader
        overline="SRV"
        title="Reportes de usuarios"
        subtitle="Problemas, sugerencias y consultas enviados desde Event Box."
        actions={
          <TextField select label="Mostrar" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="open">Abiertos</MenuItem>
            <MenuItem value="resolved">Resueltos</MenuItem>
            <MenuItem value="all">Todos</MenuItem>
          </TextField>
        }
      />
      {loading && !data ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : !data.length ? (
        <Paper variant="outlined">
          <EmptyState title={status === 'open' ? 'No hay reportes abiertos' : 'No hay reportes'} description="Cuando alguien use “Reportar un problema”, aparece acá." />
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {data.map((f) => (
            <Paper key={f.id} variant="outlined" sx={{ p: 2.25, opacity: f.status === 'resolved' ? 0.7 : 1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between">
                <Stack direction="row" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
                  <UserAvatar user={f.User} size={36} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography sx={{ fontWeight: 800 }}>{f.User ? userName(f.User) : 'Usuario eliminado'}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {f.Company?.name ?? 'SRV'} · {formatDateTime(f.createdAt)} · #{f.id}
                      </Typography>
                      <Chip size="small" label={TYPE[f.type]?.label} color={TYPE[f.type]?.color} variant="outlined" />
                    </Stack>
                    <Typography sx={{ mt: 1, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{f.message}</Typography>
                    <Stack direction="row" spacing={2} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
                      {f.User?.email && (
                        <Link href={`mailto:${f.User.email}?subject=${encodeURIComponent(`Tu reporte #${f.id} en Event Box`)}`} variant="body2">
                          Responder por mail
                        </Link>
                      )}
                      {f.pageUrl && (
                        <Typography variant="body2" color="text.disabled" noWrap title={f.pageUrl}>
                          {new URL(f.pageUrl, window.location.origin).pathname}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                </Stack>
                <Stack spacing={1} alignItems={{ xs: 'flex-start', sm: 'flex-end' }} sx={{ flexShrink: 0 }}>
                  {f.attachmentUrl && (
                    <Box component="a" href={f.attachmentUrl} target="_blank" rel="noopener">
                      <Box component="img" src={f.attachmentUrl} alt="Captura" sx={{ width: 140, height: 90, objectFit: 'cover', borderRadius: 1.5, border: 1, borderColor: 'divider', display: 'block' }} />
                    </Box>
                  )}
                  <Button size="small" variant={f.status === 'open' ? 'contained' : 'outlined'} onClick={() => setResolved(f, f.status === 'open')}>
                    {f.status === 'open' ? 'Marcar resuelto' : 'Reabrir'}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </>
  );
};

export default FeedbackPage;
