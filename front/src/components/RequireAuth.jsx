import { Navigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { Button } from '@mui/material';
import LockOutlined from '@mui/icons-material/LockOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import { useAuth } from '../context/AuthContext';
import { EmptyState, Loading } from './ui';

/**
 * Protege rutas.
 * - `perm`: permiso [entidad, acción] dentro de la empresa.
 * - `admin` / `superAdmin`: solo administradores de la empresa / equipo de SRV.
 * - `allowBlocked`: se puede usar aunque la suscripción esté vencida (pantalla de pago).
 * - `shell`: solo exige sesión (el layout; cada pantalla aplica sus propias reglas).
 */
const RequireAuth = ({ children, perm, admin, superAdmin, allowBlocked, shell }) => {
  const { status, can, isAdmin, isSuperAdmin, company, hasAccess, subscription } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Loading label="Abriendo Sortex…" />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />;
  if (shell) return children;

  const denied = (
    <EmptyState
      icon={LockOutlined}
      title="No tenés acceso a esta sección"
      description="Tu rol no tiene permiso para verla. Si lo necesitás, pedíselo a un administrador."
    />
  );

  if (superAdmin) return isSuperAdmin ? children : denied;
  // Equipo de SRV sin empresa propia: su lugar es el panel.
  if (!company) {
    if (allowBlocked && !admin) return children; // Mi perfil
    return isSuperAdmin ? <Navigate to="/platform" replace /> : denied;
  }
  if (admin && !isAdmin) return denied;

  if (!hasAccess && !allowBlocked) {
    const suspended = subscription?.state === 'suspended';
    return (
      <EmptyState
        icon={PaymentsOutlined}
        title={suspended ? 'La cuenta de tu empresa está suspendida' : 'La suscripción de tu empresa está vencida'}
        description={
          suspended
            ? 'Contactá a SRV para reactivarla.'
            : isAdmin
              ? 'Regularizá el pago para volver a usar Sortex. Tus datos están intactos.'
              : 'Avisale al administrador de tu empresa para que regularice el pago. Tus datos están intactos.'
        }
        action={
          isAdmin &&
          !suspended && (
            <Button variant="contained" component={RouterLink} to="/billing">
              Ir a pagar
            </Button>
          )
        }
      />
    );
  }

  if (perm && !can(...perm)) return denied;
  return children;
};

export default RequireAuth;
