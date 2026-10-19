import { Link as RouterLink } from 'react-router-dom';
import { Alert, Button } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { formatDate, formatDateTime } from '../lib/format';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * El abono se paga a principio de mes. Si el mes en curso no está pago, se avisa hasta el
 * vencimiento (después la app se bloquea y se muestra la pantalla de abono pendiente).
 */
const SubscriptionBanner = () => {
  const { subscription, isAdmin, user } = useAuth();
  if (user?.access === 'temporary') {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Tenés acceso temporal hasta el {formatDateTime(user.accessUntil)}. Después, la app se cierra sola.
      </Alert>
    );
  }
  if (!subscription || subscription.state !== 'grace') return null;
  const month = MONTHS[new Date().getMonth()];
  const lastDay = new Date(new Date(`${subscription.blocksOn}T12:00:00`).getTime() - 86400000);

  return (
    <Alert
      severity="warning"
      sx={{ mb: 2 }}
      action={
        isAdmin && (
          <Button component={RouterLink} to="/billing" color="inherit" size="small">
            Ver abono
          </Button>
        )
      }
    >
      El abono de {month} está pendiente: vence el {formatDate(lastDay)}.
      {isAdmin ? ' Coordiná el pago con SRV.' : ' Avisale al administrador de tu empresa.'}
    </Alert>
  );
};

export default SubscriptionBanner;
