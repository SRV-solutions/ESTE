import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import PersonOutline from '@mui/icons-material/PersonOutline';
import Logout from '@mui/icons-material/Logout';
import BugReportOutlined from '@mui/icons-material/BugReportOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import PhoneIphoneOutlined from '@mui/icons-material/PhoneIphoneOutlined';
import { useAuth } from '../context/AuthContext';
import { useColorMode } from '../context/ColorModeContext';
import { userName } from '../lib/format';
import { BySrv, CompanyLogo, EventBoxLogo } from './Brand';
import { ErrorBoundary } from './ErrorBoundary';
import FeedbackDialog from './FeedbackDialog';
import GlobalSearch from './GlobalSearch';
import InstallDialog from './InstallDialog';
import { NAV, visibleNav } from './nav';
import SubscriptionBanner from './SubscriptionBanner';
import UserAvatar from './UserAvatar';

const DRAWER_WIDTH = 248;

/** Arriba a la izquierda: la empresa (su logo y nombre). El equipo de SRV sin empresa ve la marca. */
const SidebarHeader = ({ company, isAdmin, onNavigate }) => {
  if (!company) {
    return (
      <Box sx={{ px: 1, py: 1.5, mb: 1 }}>
        <EventBoxLogo size={30} fontSize={20} />
      </Box>
    );
  }
  const content = (
    <>
      <CompanyLogo company={company} size={40} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 900, fontSize: 15, lineHeight: 1.2, letterSpacing: '-0.01em' }} noWrap title={company.name}>
          {company.name}
        </Typography>
        {isAdmin && !company.logoUrl && (
          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 700 }}>
            Subir logo
          </Typography>
        )}
      </Box>
    </>
  );
  const sx = { display: 'flex', alignItems: 'center', gap: 1.25, px: 1, py: 1.25, mb: 1, borderRadius: 2, color: 'inherit', textDecoration: 'none' };
  // El admin toca su logo para cambiarlo.
  return isAdmin ? (
    <Box component={NavLink} to="/billing" onClick={onNavigate} sx={{ ...sx, '&:hover': { bgcolor: 'action.hover' } }}>
      {content}
    </Box>
  ) : (
    <Box sx={sx}>{content}</Box>
  );
};

const SidebarContent = ({ onNavigate, onInstall }) => {
  const auth = useAuth();
  const items = visibleNav(auth);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1.5 }}>
      <SidebarHeader company={auth.company} isAdmin={auth.isAdmin} onNavigate={onNavigate} />
      <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {items.map(({ to, label, icon: Icon, end, section, locked, soon }, i) => (
          <Box key={to}>
            {section && items[i - 1]?.section !== section && (
              <Typography variant="overline" color="text.disabled" component="div" sx={{ px: 1.5, pt: 2, pb: 0.5, lineHeight: 1.5 }}>
                {section}
              </Typography>
            )}
            <ListItemButton component={NavLink} to={to} end={end} onClick={onNavigate} sx={locked ? { color: 'text.disabled' } : undefined}>
              <ListItemIcon sx={{ minWidth: 38, color: locked ? 'text.disabled' : undefined }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={label} primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }} />
              {locked && <LockOutlined sx={{ fontSize: 15 }} titleAccess="No incluido en tu plan" />}
              {soon && <Chip label="Pronto" size="small" color="secondary" sx={{ height: 18, fontSize: 10 }} />}
            </ListItemButton>
          </Box>
        ))}
      </List>
      <Box sx={{ mt: 'auto', px: 1, pt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <ListItemButton onClick={onInstall} sx={{ borderRadius: 2, py: 0.75 }}>
          <ListItemIcon sx={{ minWidth: 34 }}>
            <PhoneIphoneOutlined fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Llevar al celular" primaryTypographyProps={{ fontSize: 13, fontWeight: 700 }} />
        </ListItemButton>
        {auth.company && <EventBoxLogo size={20} fontSize={14} />}
        <BySrv />
      </Box>
    </Box>
  );
};

/** Layout de la app: barra lateral fija en desktop, cajón deslizable en el celular. */
const AppShell = () => {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [installing, setInstalling] = useState(false);
  const { user, logout } = useAuth();
  const { mode, toggle } = useColorMode();
  const navigate = useNavigate();
  const location = useLocation();

  const current = [...NAV].reverse().find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));

  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isDesktop ? 'permanent' : 'temporary'}
          open={isDesktop || mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{ sx: { width: DRAWER_WIDTH, borderRight: 1, borderColor: 'divider', bgcolor: 'background.paper' } }}
        >
          <SidebarContent onNavigate={() => setMobileOpen(false)} onInstall={() => { setMobileOpen(false); setInstalling(true); }} />
        </Drawer>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(0,0,0,0.85)' : 'rgba(245,246,248,0.88)'),
            backdropFilter: 'blur(12px)',
          }}
        >
          <Toolbar sx={{ gap: 1, minHeight: { xs: 56 } }}>
            {!isDesktop && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
                <MenuIcon />
              </IconButton>
            )}
            <Typography sx={{ fontWeight: 900, fontSize: 17, flex: 1, minWidth: 0 }} noWrap>
              {current?.short || current?.label || ''}
            </Typography>
            <GlobalSearch
              onCommand={(cmd) => {
                if (cmd === 'feedback') setReporting(true);
                if (cmd === 'install') setInstalling(true);
                if (cmd === 'theme') toggle();
                if (cmd === 'logout') logout();
              }}
            />
            <Tooltip title="Reportar un problema">
              <IconButton onClick={() => setReporting(true)} aria-label="Reportar un problema">
                <BugReportOutlined />
              </IconButton>
            </Tooltip>
            <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
              <IconButton onClick={toggle} aria-label="Cambiar tema">
                {mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
              </IconButton>
            </Tooltip>
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Mi cuenta" sx={{ p: 0.5 }}>
              <UserAvatar user={user} />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={!!menuAnchor}
              onClose={() => setMenuAnchor(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography sx={{ fontWeight: 800 }}>{userName(user)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.roleName}
                </Typography>
              </Box>
              <Divider />
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  navigate('/profile');
                }}
              >
                <ListItemIcon>
                  <PersonOutline fontSize="small" />
                </ListItemIcon>
                Mi perfil
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  setReporting(true);
                }}
              >
                <ListItemIcon>
                  <BugReportOutlined fontSize="small" />
                </ListItemIcon>
                Reportar un problema
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setMenuAnchor(null);
                  logout();
                }}
              >
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Cerrar sesión
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ width: '100%', maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>
          <SubscriptionBanner />
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </Box>
      </Box>
      <FeedbackDialog open={reporting} onClose={() => setReporting(false)} />
      <InstallDialog open={installing} onClose={() => setInstalling(false)} />
    </Box>
  );
};

export default AppShell;
