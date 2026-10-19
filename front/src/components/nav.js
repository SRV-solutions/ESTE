import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';

/**
 * Navegación principal.
 * - `perm`: [entidad, acción] necesaria (dentro de la empresa).
 * - `admin`: solo el administrador de la empresa.
 * - `superAdmin`: solo el equipo de SRV.
 */
export const NAV = [
  { to: '/', label: 'Inicio', icon: DashboardOutlined, end: true, company: true },
  { to: '/service-orders', label: 'Órdenes de servicio', short: 'Órdenes', icon: AssignmentOutlined, perm: ['serviceOrders', 'read'] },
  { to: '/items', label: 'Stock', icon: Inventory2Outlined, perm: ['items', 'read'] },
  { to: '/categories', label: 'Categorías', icon: CategoryOutlined, perm: ['categories', 'read'] },
  { to: '/locations', label: 'Lugares', icon: PlaceOutlined, perm: ['serviceOrders', 'read'] },
  { to: '/users', label: 'Usuarios', icon: GroupOutlined, perm: ['users', 'read'] },
  { to: '/billing', label: 'Mi empresa', icon: StorefrontOutlined, admin: true, section: 'Administración' },
  { to: '/platform', label: 'Panel SRV', icon: AdminPanelSettingsOutlined, superAdmin: true, section: 'SRV' },
];

/** Qué entradas ve cada usuario. */
export const visibleNav = ({ can, isAdmin, isSuperAdmin, hasAccess }) =>
  NAV.filter((n) => {
    if (n.superAdmin) return isSuperAdmin;
    if (n.admin) return isAdmin;
    if (!hasAccess) return false;
    return !n.perm || can(...n.perm);
  });
