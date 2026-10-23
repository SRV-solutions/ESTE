import { Suspense } from 'react';
import { Navigate, Link as RouterLink, useLocation } from 'react-router-dom';
import { Button } from '@mui/material';
import LockOutlined from '@mui/icons-material/LockOutlined';
import PaymentsOutlined from '@mui/icons-material/PaymentsOutlined';
import { useAuth } from '../context/AuthContext';
import { lazyPage } from '../lib/lazyPage';
import { ComingSoonScreen, UpsellScreen } from './ModuleScreens';
import { EmptyState, Loading } from './ui';

const TemporaryPasswordPage = lazyPage(() => import('../pages/PasswordRecoveryPages').then((m) => ({ default: m.TemporaryPasswordPage })));

/**
 * Protege rutas.
 * - `perm`: permiso [entidad, acción] dentro de la empresa.
 * - `admin` / `superAdmin`: solo administradores de la empresa / equipo de SRV.
 * - `allowBlocked`: se puede usar aunque la suscripción esté vencida (pantalla de pago).
 * - `shell`: solo exige sesión (el layout; cada pantalla aplica sus propias reglas).
 * Quien entró con una contraseña temporal no ve la app hasta elegir una propia.
 */
const RequireAuth = ({ children, perm, admin, superAdmin, allowBlocked, shell, feature }) => {
  const { status, user, can, isAdmin, isSuperAdmin, company, hasAccess, subscription, hasFeature, inDevelopment } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Loading label="Abriendo Event Box…" />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />;
  if (user?.mustChangePassword) {
    return shell ? (
      <Suspense fallback={<Loading />}>
        <TemporaryPasswordPage />
      </Suspense>
    ) : null;
  }
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
        title={suspended ? 'La cuenta de tu empresa está suspendida' : 'El abono del mes está pendiente'}
        description={
          suspended
            ? 'Contactá a SRV para reactivarla.'
            : isAdmin
              ? 'El abono se paga a principio de mes. Coordiná el pago con SRV y apenas se registra vuelven a usar Event Box. Los datos están intactos.'
              : 'Avisale al administrador de tu empresa: apenas se registre el pago del mes vuelven a usar Event Box. Los datos están intactos.'
        }
        action={
          isAdmin &&
          !suspended && (
            <Button variant="contained" component={RouterLink} to="/billing">
              Ver abono
            </Button>
          )
        }
      />
    );
  }

  if (perm && !can(...perm)) return denied;
  if (feature && !hasFeature(feature)) return <UpsellScreen feature={feature} />;
  if (feature && inDevelopment(feature)) return <ComingSoonScreen feature={feature} />;
  return children;
};

export default RequireAuth;
