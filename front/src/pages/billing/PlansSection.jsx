import { useState } from 'react';
import { Box, Button, Chip, Grid, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/FeedbackContext';
import { useLoader } from '../../hooks/useLoader';
import { api, errorMessage } from '../../lib/api';
import { formatUsd } from '../../lib/money';
import { BRAND } from '../../theme';

/**
 * Comparador de planes. El costo por usuario hace evidente el negocio: subir de plan
 * cuesta poco más y el precio por persona baja mucho.
 */
const PlansSection = ({ onChanged }) => {
  const { plan: current, isAdmin, refresh } = useAuth();
  const { notify, confirm } = useFeedback();
  const [busy, setBusy] = useState(null);
  const { data } = useLoader(() => api.get('/plans').then((r) => r.data), []);
  if (!data || !current) return null;

  const usage = Math.min((current.userCount / current.maxUsers) * 100, 100);

  const change = async (plan) => {
    const downgrade = plan.priceUsd < data.plans.find((p) => p.id === current.id).priceUsd;
    const ok = await confirm({
      title: `Pasar al plan ${plan.name}`,
      message: `${formatUsd(plan.priceUsd)} por mes, hasta ${plan.maxUsers} usuarios. El precio nuevo se aplica desde el próximo abono.${
        downgrade ? '\n\nOjo: se dejan de ver los módulos que no incluye este plan (los datos no se borran).' : ''
      }`,
      confirmLabel: 'Cambiar de plan',
      danger: downgrade,
    });
    if (!ok) return;
    setBusy(plan.id);
    try {
      const { data: res } = await api.patch('/company/plan', { plan: plan.id });
      notify(res.message);
      await refresh();
      onChanged?.();
    } catch (err) {
      notify(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Box id="planes" sx={{ mt: 4, scrollMarginTop: 80 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'flex-end' }} spacing={1} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5">Planes</Typography>
          <Typography color="text.secondary">Estás en el plan {current.name}.</Typography>
        </Box>
        <Box sx={{ minWidth: 220 }}>
          <Typography variant="caption" color="text.secondary">
            {current.userCount} de {current.maxUsers} usuarios de la app
          </Typography>
          <LinearProgress variant="determinate" value={usage} color={usage > 85 ? 'warning' : 'primary'} sx={{ height: 8, borderRadius: 4 }} />
        </Box>
      </Stack>
      <Grid container spacing={2}>
        {data.plans.map((p) => {
          const isCurrent = p.id === current.id;
          const perUser = p.priceUsd / p.maxUsers;
          return (
            <Grid item xs={12} md={4} key={p.id}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderColor: isCurrent ? 'primary.main' : p.highlight ? 'secondary.main' : 'divider',
                  borderWidth: isCurrent || p.highlight ? 2 : 1,
                  position: 'relative',
                }}
              >
                <Stack direction="row" spacing={1} sx={{ position: 'absolute', top: -12, left: 16 }}>
                  {isCurrent && <Chip size="small" color="primary" label="Tu plan" />}
                  {p.highlight && !isCurrent && <Chip size="small" color="secondary" label="El más elegido" />}
                </Stack>
                <Typography variant="h6">{p.name}</Typography>
                <Typography sx={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1, mt: 1 }}>
                  {formatUsd(p.priceUsd)}
                  <Typography component="span" color="text.secondary" sx={{ fontSize: 14, fontWeight: 600 }}>
                    {' '}
                    / mes
                  </Typography>
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
                  Hasta {p.maxUsers} usuarios ·{' '}
                  <Box component="span" sx={{ color: BRAND.orange }}>
                    USD {perUser.toFixed(2).replace('.', ',')} por usuario
                  </Box>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  + hasta {p.maxTemporary} accesos temporales a la vez (hasta 10 días, renovables), que no cuentan como usuarios
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
                  {p.tagline}
                </Typography>
                <Stack spacing={0.75} sx={{ mb: 2 }}>
                  {p.features.map((f) => (
                    <Stack key={f} direction="row" spacing={1} alignItems="flex-start">
                      <CheckRounded sx={{ fontSize: 18, color: 'success.main', mt: '1px' }} />
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {data.features[f]}
                        {data.inDevelopment.includes(f) && <Chip label="En desarrollo" size="small" sx={{ ml: 0.75, height: 18, fontSize: 10 }} />}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
                <Box sx={{ mt: 'auto' }}>
                  {isAdmin && !isCurrent && (
                    <Button fullWidth variant={p.highlight ? 'contained' : 'outlined'} onClick={() => change(p)} disabled={!!busy}>
                      {busy === p.id ? 'Cambiando…' : `Pasar a ${p.name}`}
                    </Button>
                  )}
                </Box>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1.5 }}>
        Abono mensual en dólares, que se paga a principio de mes en pesos al dólar blue del día. Los módulos “En desarrollo” ya están incluidos: cuando salgan, se habilitan sin costo extra.
      </Typography>
    </Box>
  );
};

export default PlansSection;
