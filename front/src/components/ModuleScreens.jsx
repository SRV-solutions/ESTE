import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import LockOutlined from '@mui/icons-material/LockOutlined';
import ConstructionOutlined from '@mui/icons-material/ConstructionOutlined';
import { useAuth } from '../context/AuthContext';
import { FEATURE_LABELS, MIN_PLAN } from '../lib/plans';
import { BRAND } from '../theme';

/** Qué hace cada módulo (para las pantallas de candado y "Pronto"). */
const PITCH = {
  blueprints: 'Subí los planos de cada salón o evento (PDF, imagen o AutoCAD) y que todo el equipo los tenga en el celular.',
  payroll: 'Cargá los recibos de sueldo en PDF y que cada persona los vea y los firme en conformidad desde su usuario.',
  eventTools: 'Duplicá un evento con todo su material y pasá el material de un evento que terminó directo al siguiente.',
  stageOwners: 'Asigná un responsable para logística y otro para la recepción: cada uno avanza su etapa.',
  checkin: 'Registrá desde el celular cuándo el material llega al evento y cuándo se retira, con la ubicación verificada contra el lugar.',
  reports: 'Qué material se usa más, cuál está parado, cuántos eventos por mes y qué se pierde o se rompe.',
  multiWarehouse: 'Manejá varios depósitos y mové stock entre ellos.',
  apiAccess: 'Conectá Event Box con tus sistemas.',
};

const Shell = ({ icon: Icon, color, chip, title, children }) => (
  <Paper variant="outlined" sx={{ p: { xs: 3, sm: 5 }, maxWidth: 640, mx: 'auto', mt: { xs: 1, sm: 4 }, textAlign: 'center' }}>
    <Box sx={{ width: 56, height: 56, borderRadius: 3, mx: 'auto', display: 'grid', placeItems: 'center', bgcolor: color, color: '#000' }}>
      <Icon />
    </Box>
    <Chip label={chip} size="small" sx={{ mt: 2 }} />
    <Typography variant="h5" sx={{ mt: 1.5 }}>
      {title}
    </Typography>
    {children}
  </Paper>
);

/** El plan de la empresa no incluye el módulo. */
export const UpsellScreen = ({ feature }) => {
  const { isAdmin } = useAuth();
  return (
    <Shell icon={LockOutlined} color={BRAND.orange} chip={`Plan ${MIN_PLAN[feature] ?? 'superior'}`} title={FEATURE_LABELS[feature]}>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {PITCH[feature]}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 2 }}>
        Este módulo es parte del plan <b>{MIN_PLAN[feature] ?? 'superior'}</b>.{' '}
        {isAdmin ? 'Podés cambiar de plan en un minuto.' : 'Pedile al administrador de tu empresa que cambie de plan.'}
      </Typography>
      {isAdmin && (
        <Button variant="contained" component={RouterLink} to="/billing#planes" sx={{ mt: 3 }}>
          Ver planes
        </Button>
      )}
    </Shell>
  );
};

/** Módulo contratado que todavía se está construyendo. */
export const ComingSoonScreen = ({ feature }) => (
  <Shell icon={ConstructionOutlined} color={BRAND.blue} chip="En desarrollo" title={FEATURE_LABELS[feature]}>
    <Typography color="text.secondary" sx={{ mt: 1 }}>
      {PITCH[feature]}
    </Typography>
    <Stack spacing={0.5} sx={{ mt: 2 }}>
      <Typography color="text.secondary">Lo estamos construyendo y ya está incluido en tu plan: cuando salga, aparece acá sin costo extra.</Typography>
      <Typography variant="body2" color="text.disabled">
        ¿Tenés ideas para este módulo? Contanos con “Reportar un problema” → Sugerencia.
      </Typography>
    </Stack>
  </Shell>
);
