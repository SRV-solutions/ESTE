import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined';
import ManageSearchOutlined from '@mui/icons-material/ManageSearchOutlined';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import ArchitectureOutlined from '@mui/icons-material/ArchitectureOutlined';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import WhereToVoteOutlined from '@mui/icons-material/WhereToVoteOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';

/**
 * Navegación principal.
 * - `perm`: [entidad, acción] necesaria (dentro de la empresa).
 * - `feature`: módulo del plan. Si la empresa no lo tiene, se muestra con candado.
 * - `admin` / `superAdmin`: solo el administrador de la empresa / el equipo de SRV.
 * - `employee`: cualquier persona de la empresa (ve sus recibos).
 */
export const NAV = [
  { to: '/', label: 'Inicio', icon: DashboardOutlined, end: true },
  { to: '/service-orders', label: 'Órdenes de servicio', short: 'Órdenes', icon: AssignmentOutlined, perm: ['serviceOrders', 'read'] },
  { to: '/events', label: 'Eventos', icon: EventOutlined, perm: ['events', 'read'] },
  { to: '/items', label: 'Stock', icon: Inventory2Outlined, perm: ['items', 'read'] },
  { to: '/categories', label: 'Categorías', icon: CategoryOutlined, perm: ['categories', 'read'] },
  { to: '/locations', label: 'Lugares', icon: PlaceOutlined, perm: ['locations', 'read'] },
  { to: '/blueprints', label: 'Planos', icon: ArchitectureOutlined, perm: ['blueprints', 'read'], feature: 'blueprints' },
  { to: '/checkin', label: 'Check-in / out', icon: WhereToVoteOutlined, perm: ['checkin', 'read'], feature: 'checkin' },
  { to: '/reports', label: 'Reportes', icon: InsightsOutlined, perm: ['reports', 'read'], feature: 'reports' },
  { to: '/my-payslips', label: 'Mis recibos', icon: ReceiptLongOutlined, employee: true, feature: 'payroll' },
  { to: '/team', label: 'Equipo', icon: GroupOutlined, perm: ['users', 'read'], section: 'Equipo' },
  { to: '/payroll', label: 'Sueldos', icon: BadgeOutlined, perm: ['payroll', 'read'], feature: 'payroll', section: 'Equipo' },
  { to: '/billing', label: 'Mi empresa', icon: StorefrontOutlined, admin: true, section: 'Administración' },
  { to: '/platform', label: 'Panel SRV', icon: AdminPanelSettingsOutlined, superAdmin: true, section: 'SRV' },
  { to: '/audit', label: 'Auditoría', icon: ManageSearchOutlined, superAdmin: true, section: 'SRV' },
];

/**
 * Qué entradas ve cada usuario y en qué estado:
 * - `locked`: el plan no incluye el módulo (se muestra con candado, para que sepan que existe).
 * - `soon`: el módulo está contratado pero en desarrollo.
 */
export const visibleNav = ({ can, isAdmin, isSuperAdmin, hasAccess, hasFeature, inDevelopment, user }) =>
  NAV.filter((n) => {
    if (n.superAdmin) return isSuperAdmin;
    if (n.admin) return isAdmin;
    if (!hasAccess) return false;
    // Todo usuario de la empresa es parte del personal: ve sus recibos si el plan tiene sueldos.
    if (n.employee) return !!user?.company && hasFeature(n.feature);
    return !n.perm || can(...n.perm);
  }).map((n) => ({
    ...n,
    locked: !!n.feature && !hasFeature(n.feature),
    soon: !!n.feature && hasFeature(n.feature) && inDevelopment(n.feature),
  }));
