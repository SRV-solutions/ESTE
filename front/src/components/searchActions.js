import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import AddCircleOutline from '@mui/icons-material/AddCircleOutline';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import CategoryOutlined from '@mui/icons-material/CategoryOutlined';
import PlaceOutlined from '@mui/icons-material/PlaceOutlined';
import EventOutlined from '@mui/icons-material/EventOutlined';
import ArchitectureOutlined from '@mui/icons-material/ArchitectureOutlined';
import WhereToVoteOutlined from '@mui/icons-material/WhereToVoteOutlined';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';
import ReceiptLongOutlined from '@mui/icons-material/ReceiptLongOutlined';
import GroupOutlined from '@mui/icons-material/GroupOutlined';
import PersonAddAltOutlined from '@mui/icons-material/PersonAddAltOutlined';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import StorefrontOutlined from '@mui/icons-material/StorefrontOutlined';
import WorkspacePremiumOutlined from '@mui/icons-material/WorkspacePremiumOutlined';
import ManageSearchOutlined from '@mui/icons-material/ManageSearchOutlined';
import PersonOutline from '@mui/icons-material/PersonOutline';
import LockOutlined from '@mui/icons-material/LockOutlined';
import BugReportOutlined from '@mui/icons-material/BugReportOutlined';
import PhoneIphoneOutlined from '@mui/icons-material/PhoneIphoneOutlined';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import Logout from '@mui/icons-material/Logout';
import { SearchIndex } from '../lib/searchEngine';

/**
 * Todo lo que se puede "ir a" o "hacer" desde el buscador, con las palabras con que la gente lo pide.
 * Cada entrada respeta los mismos permisos que el menú. `command`: acción de la barra superior.
 */
const ACTIONS = [
  { title: 'Inicio', subtitle: 'Resumen del día', path: '/', icon: DashboardOutlined, kw: 'inicio home resumen tablero dashboard principal' },
  { title: 'Órdenes de servicio', subtitle: 'Todas las órdenes y su estado', path: '/service-orders', icon: AssignmentOutlined, perm: ['serviceOrders', 'read'], kw: 'orden ordenes pedido pedidos os remito servicio material lista estado' },
  { title: 'Nueva orden de servicio', subtitle: 'Pedir material para un evento', path: '/service-orders/new', icon: AddCircleOutline, perm: ['serviceOrders', 'create'], kw: 'crear nueva nuevo armar pedir pedido orden material evento', boost: 0.05 },
  { title: 'Eventos', subtitle: 'Fechas, lugares y clientes', path: '/events', icon: EventOutlined, perm: ['events', 'read'], kw: 'evento eventos fiesta show casamiento fecha calendario agenda cliente' },
  { title: 'Nuevo evento', subtitle: 'Cargar un evento', path: '/events?accion=nuevo', icon: AddCircleOutline, perm: ['events', 'create'], kw: 'crear nuevo agregar alta cargar evento fiesta' },
  { title: 'Stock', subtitle: 'Cada unidad del depósito, con su código', path: '/items', icon: Inventory2Outlined, perm: ['items', 'read'], kw: 'stock inventario deposito item items articulo producto equipo material cosas codigo buscar' },
  { title: 'Agregar ítems al stock', subtitle: 'Cargar unidades nuevas', path: '/items?accion=nuevo', icon: AddCircleOutline, perm: ['items', 'create'], kw: 'crear nuevo agregar cargar alta sumar item items articulo producto equipo material stock inventario', boost: 0.05 },
  { title: 'Importar stock desde Excel o CSV', subtitle: 'Cargar mucho stock de una vez', path: '/items?accion=importar', icon: UploadFileOutlined, perm: ['items', 'create'], kw: 'importar excel csv planilla masivo subir cargar archivo lista stock inventario' },
  { title: 'Contenedores: baúles, racks y cajas', subtitle: 'En Stock: lo que llevan adentro', path: '/items', icon: Inventory2Outlined, perm: ['items', 'read'], kw: 'contenedor contenedores baul rack caja case cajon adentro contenido armar llenar vaciar' },
  { title: 'Categorías', subtitle: 'Tipos de ítem del stock', path: '/categories', icon: CategoryOutlined, perm: ['categories', 'read'], kw: 'categoria categorias tipo familia rubro grupo clasificacion' },
  { title: 'Nueva categoría', subtitle: 'Un tipo de ítem nuevo', path: '/categories?accion=nueva', icon: AddCircleOutline, perm: ['categories', 'create'], kw: 'crear nueva nuevo agregar alta categoria tipo familia' },
  { title: 'Lugares', subtitle: 'Salones, estadios y predios', path: '/locations', icon: PlaceOutlined, perm: ['locations', 'read'], kw: 'lugar lugares salon venue locacion estadio predio direccion mapa ubicacion coordenadas' },
  { title: 'Nuevo lugar', subtitle: 'Cargar un salón o predio', path: '/locations?accion=nuevo', icon: AddCircleOutline, perm: ['locations', 'create'], kw: 'crear nuevo agregar alta lugar salon venue' },
  { title: 'Planos', subtitle: 'Planos de cada salón y evento', path: '/blueprints', icon: ArchitectureOutlined, perm: ['blueprints', 'read'], feature: 'blueprints', kw: 'plano planos layout dibujo autocad dwg pdf croquis diagrama distribucion mesas' },
  { title: 'Subir un plano', subtitle: 'PDF, imagen o DWG', path: '/blueprints?accion=subir', icon: UploadFileOutlined, perm: ['blueprints', 'create'], feature: 'blueprints', kw: 'subir cargar nuevo agregar plano layout pdf imagen dwg' },
  { title: 'Check-in / out', subtitle: 'Llegada y retiro del material en el evento', path: '/checkin', icon: WhereToVoteOutlined, perm: ['checkin', 'read'], feature: 'checkin', kw: 'checkin check in out llegada llegue ingreso salida retiro fichar gps ubicacion presente' },
  { title: 'Reportes', subtitle: 'Qué se usa y qué está parado', path: '/reports', icon: InsightsOutlined, perm: ['reports', 'read'], feature: 'reports', kw: 'reporte reportes estadistica informe metricas grafico uso analisis numeros' },
  { title: 'Mis recibos de sueldo', subtitle: 'Ver y firmar tus recibos', path: '/my-payslips', icon: ReceiptLongOutlined, employee: true, feature: 'payroll', kw: 'mis recibos recibo sueldo salario firmar pago haberes cobro' },
  { title: 'Equipo', subtitle: 'Las personas de la empresa y su acceso', path: '/team', icon: GroupOutlined, perm: ['users', 'read'], kw: 'equipo personal empleados gente usuario usuarios persona staff acceso temporal ultimo ingreso' },
  { title: 'Agregar una persona', subtitle: 'Dar acceso a alguien nuevo', path: '/team?accion=nueva', icon: PersonAddAltOutlined, perm: ['users', 'create'], kw: 'crear nuevo nueva agregar alta usuario empleado persona invitar acceso temporal' },
  { title: 'Roles y permisos', subtitle: 'Qué puede hacer cada rol', path: '/team?accion=roles', icon: AdminPanelSettingsOutlined, perm: ['users', 'read'], kw: 'rol roles permiso permisos acceso seguridad puede perfil' },
  { title: 'Sueldos', subtitle: 'Recibos del mes y firmas', path: '/payroll', icon: BadgeOutlined, perm: ['payroll', 'read'], feature: 'payroll', kw: 'sueldo sueldos recibo recibos salario nomina liquidacion pago haberes firma' },
  { title: 'Cargar un recibo de sueldo', subtitle: 'Subir el PDF para que lo firmen', path: '/payroll?accion=cargar', icon: UploadFileOutlined, perm: ['payroll', 'create'], feature: 'payroll', kw: 'cargar subir nuevo recibo sueldo pdf liquidacion' },
  { title: 'Mi empresa', subtitle: 'Abono, datos y logo', path: '/billing', icon: StorefrontOutlined, admin: true, kw: 'empresa abono pago pagar factura cuit datos logo cuenta suscripcion vencimiento' },
  { title: 'Planes', subtitle: 'Comparar y cambiar de plan', path: '/billing#planes', icon: WorkspacePremiumOutlined, admin: true, kw: 'plan planes precio cambiar mejorar usuarios limite basico profesional empresa' },
  { title: 'Auditoría', subtitle: 'Quién entró, desde dónde y qué hizo', path: '/audit', icon: ManageSearchOutlined, superAdmin: true, kw: 'auditoria logs registros seguridad ingresos ip historial quien actividad accesos' },
  { title: 'Mi perfil', subtitle: 'Nombre, email, foto y DNI', path: '/profile', icon: PersonOutline, kw: 'perfil cuenta nombre foto avatar email mail dni datos' },
  { title: 'Cambiar mi contraseña', subtitle: 'En Mi perfil', path: '/profile?accion=contrasena', icon: LockOutlined, kw: 'contrasena clave password cambiar olvide seguridad' },
  { title: 'Reportar un problema', subtitle: 'Avisarle a SRV de un error o una idea', command: 'feedback', icon: BugReportOutlined, kw: 'reportar error problema bug falla ayuda soporte sugerencia consulta reclamo idea' },
  { title: 'Llevar Event Box al celular', subtitle: 'Código QR para entrar desde el teléfono', command: 'install', icon: PhoneIphoneOutlined, kw: 'celular telefono movil app qr instalar iphone android llevar' },
  { title: 'Cambiar a modo claro u oscuro', subtitle: 'Tema de la pantalla', command: 'theme', icon: DarkModeOutlined, kw: 'tema oscuro claro modo noche dia color' },
  { title: 'Cerrar sesión', subtitle: 'Salir de Event Box', command: 'logout', icon: Logout, kw: 'salir cerrar sesion logout' },
  { title: 'Panel SRV', subtitle: 'Empresas, pagos y reportes', path: '/platform', icon: AdminPanelSettingsOutlined, superAdmin: true, kw: 'srv panel empresas plataforma pagos superadmin' },
];

/** Lo que esta persona puede abrir (mismas reglas que el menú). */
const allowed = (a, { can, isAdmin, isSuperAdmin, hasAccess, hasFeature, user }) => {
  if (a.superAdmin) return isSuperAdmin;
  if (a.admin) return isAdmin;
  if (a.command || a.path === '/' || a.path?.startsWith('/profile')) return true;
  if (!hasAccess) return false;
  if (a.feature && !hasFeature(a.feature)) return false;
  if (a.employee) return !!user?.company;
  return !a.perm || can(...a.perm);
};

/** Índice de acciones para una persona: se arma una vez por sesión. */
export const buildActionIndex = (auth) => {
  const index = new SearchIndex();
  ACTIONS.filter((a) => allowed(a, auth)).forEach((a, i) => index.add({ ...a, kind: 'action', key: `a${i}` }, [[a.title, 1], [a.kw, 0.85], [a.subtitle, 0.5]]));
  return index;
};

/** Sugerencias con el buscador vacío. */
export const SUGGESTED = ['Nueva orden de servicio', 'Agregar ítems al stock', 'Stock', 'Eventos', 'Equipo', 'Cambiar mi contraseña'];
export const suggestedActions = (index) => SUGGESTED.map((t) => index.docs.find((d) => d.title === t)).filter(Boolean);
