import { Suspense } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import AppShell from './components/AppShell';
import RequireAuth from './components/RequireAuth';
import { Loading } from './components/ui';
import { lazyPage } from './lib/lazyPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';

// Cada sección se descarga recién cuando se abre.
const OrdersPage = lazyPage(() => import('./pages/orders/OrdersPage'));
const NewOrderPage = lazyPage(() => import('./pages/orders/NewOrderPage'));
const OrderDetailPage = lazyPage(() => import('./pages/orders/OrderDetailPage'));
const ItemsPage = lazyPage(() => import('./pages/items/ItemsPage'));
const CategoriesPage = lazyPage(() => import('./pages/categories/CategoriesPage'));
const LocationsPage = lazyPage(() => import('./pages/locations/LocationsPage'));
const TeamPage = lazyPage(() => import('./pages/team/TeamPage'));
const ProfilePage = lazyPage(() => import('./pages/profile/ProfilePage'));
const BillingPage = lazyPage(() => import('./pages/billing/BillingPage'));
const PlatformPage = lazyPage(() => import('./pages/platform/PlatformPage'));
const PlatformCompanyPage = lazyPage(() => import('./pages/platform/PlatformCompanyPage'));
const FeedbackPage = lazyPage(() => import('./pages/platform/FeedbackPage'));
const EventsPage = lazyPage(() => import('./pages/events/EventsPage'));
const BlueprintsPage = lazyPage(() => import('./pages/blueprints/BlueprintsPage'));
const PayrollPage = lazyPage(() => import('./pages/payroll/PayrollPage'));
const MyPayslipsPage = lazyPage(() => import('./pages/payroll/MyPayslipsPage'));
const CheckinPage = lazyPage(() => import('./pages/checkin/CheckinPage'));
const ReportsPage = lazyPage(() => import('./pages/reports/ReportsPage'));
const AuditPage = lazyPage(() => import('./pages/audit/AuditPage'));
const ForgotPasswordPage = lazyPage(() => import('./pages/PasswordRecoveryPages').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazyPage(() => import('./pages/PasswordRecoveryPages').then((m) => ({ default: m.ResetPasswordPage })));

const guard = (element, perm, options = {}) => (
  <RequireAuth perm={perm} {...options}>
    <Suspense fallback={<Loading />}>{element}</Suspense>
  </RequireAuth>
);

const App = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/forgot-password" element={<Suspense fallback={<Loading />}><ForgotPasswordPage /></Suspense>} />
    <Route path="/reset-password" element={<Suspense fallback={<Loading />}><ResetPasswordPage /></Suspense>} />
    {/* El layout se muestra aunque la suscripción esté vencida: cada pantalla decide. */}
    <Route element={guard(<AppShell />, undefined, { shell: true })}>
      <Route index element={guard(<DashboardPage />)} />
      <Route path="service-orders" element={guard(<OrdersPage />, ['serviceOrders', 'read'])} />
      <Route path="service-orders/new" element={guard(<NewOrderPage />, ['serviceOrders', 'create'])} />
      <Route path="service-orders/:id" element={guard(<OrderDetailPage />, ['serviceOrders', 'read'])} />
      {/* Ruta vieja, por si quedaron enlaces guardados */}
      <Route path="service-orders/:id/items" element={<LegacyOrderRedirect />} />
      <Route path="events" element={guard(<EventsPage />, ['events', 'read'])} />
      <Route path="blueprints" element={guard(<BlueprintsPage />, ['blueprints', 'read'], { feature: 'blueprints' })} />
      <Route path="payroll" element={guard(<PayrollPage />, ['payroll', 'read'], { feature: 'payroll' })} />
      <Route path="staff" element={<Navigate to="/payroll" replace />} />
      <Route path="my-payslips" element={guard(<MyPayslipsPage />, undefined, { feature: 'payroll' })} />
      {/* Módulos en desarrollo: la protección muestra "Pronto" o el plan que los incluye. */}
      <Route path="checkin" element={guard(<CheckinPage />, ['checkin', 'read'], { feature: 'checkin' })} />
      <Route path="reports" element={guard(<ReportsPage />, ['reports', 'read'], { feature: 'reports' })} />
      <Route path="items" element={guard(<ItemsPage />, ['items', 'read'])} />
      <Route path="categories" element={guard(<CategoriesPage />, ['categories', 'read'])} />
      <Route path="locations" element={guard(<LocationsPage />, ['locations', 'read'])} />
      <Route path="team" element={guard(<TeamPage />, ['users', 'read'])} />
      <Route path="users" element={<Navigate to="/team" replace />} />
      <Route path="profile" element={guard(<ProfilePage />, undefined, { allowBlocked: true })} />
      <Route path="billing" element={guard(<BillingPage />, undefined, { admin: true, allowBlocked: true })} />
      <Route path="audit" element={guard(<AuditPage />, undefined, { admin: true })} />
      <Route path="platform" element={guard(<PlatformPage />, undefined, { superAdmin: true })} />
      <Route path="platform/companies/:id" element={guard(<PlatformCompanyPage />, undefined, { superAdmin: true })} />
      <Route path="platform/feedback" element={guard(<FeedbackPage />, undefined, { superAdmin: true })} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

const LegacyOrderRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/service-orders/${id}`} replace />;
};

export default App;
