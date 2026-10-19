import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../lib/format';

/** Aviso de suscripción: por vencer (7 días) o vencida dentro del período de gracia. */
const SubscriptionBanner = () => {
  const { subscription, isAdmin } = useAuth();
  if (!subscription) return null;
  const { state, daysLeft, blocksOn } = subscription;

  const soon = state === 'active' && daysLeft !== null && daysLeft <= 7;
  if (state !== 'grace' && !soon) return null;

  const message =
    state === 'grace'
      ? `La suscripción está vencida. Event Box se bloquea el ${formatDate(blocksOn)} si no se registra el pago.`
      : daysLeft === 0
        ? 'La suscripción vence hoy.'
        : `La suscripción vence en ${daysLeft} día${daysLeft === 1 ? '' : 's'}.`;

  return (
    <Alert
      severity={state === 'grace' ? 'warning' : 'info'}
      sx={{ mb: 2 }}
      action={
        isAdmin && (
          <Button component={RouterLink} to="/billing" color="inherit" size="small">
            Pagar
          </Button>
        )
      }
    >
      {message}
      {!isAdmin && ' Avisale al administrador de tu empresa.'}
    </Alert>
  );
};

export default SubscriptionBanner;
