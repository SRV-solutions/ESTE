import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
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
import { useAuth } from '../context/AuthContext';
import { useColorMode } from '../context/ColorModeContext';
import { userName } from '../lib/format';
import { BySrv, SortexLogo } from './Brand';
import { NAV, visibleNav } from './nav';
import SubscriptionBanner from './SubscriptionBanner';

const DRAWER_WIDTH = 248;

const initials = (user) => (userName(user) || '?').slice(0, 2).toUpperCase();

const SidebarContent = ({ onNavigate }) => {
  const auth = useAuth();
  const items = visibleNav(auth);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 1.5 }}>
      <Box sx={{ px: 1, py: 1.5, mb: 1 }}>
        <SortexLogo size={30} fontSize={20} />
        {auth.company && (
          <Typography variant="caption" color="text.secondary" noWrap component="div" sx={{ mt: 0.75, fontWeight: 700 }}>
            {auth.company.name}
          </Typography>
        )}
      </Box>
      <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {items.map(({ to, label, icon: Icon, end, section }, i) => (
          <Box key={to}>
            {section && items[i - 1]?.section !== section && (
              <Typography variant="overline" color="text.disabled" component="div" sx={{ px: 1.5, pt: 2, pb: 0.5, lineHeight: 1.5 }}>
                {section}
              </Typography>
            )}
            <ListItemButton component={NavLink} to={to} end={end} onClick={onNavigate}>
              <ListItemIcon sx={{ minWidth: 38 }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary={label} primaryTypographyProps={{ fontWeight: 600, fontSize: 14 }} />
            </ListItemButton>
          </Box>
        ))}
      </List>
      <Box sx={{ mt: 'auto', px: 1, pt: 2 }}>
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
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
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
            <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
              <IconButton onClick={toggle} aria-label="Cambiar tema">
                {mode === 'dark' ? <LightModeOutlined /> : <DarkModeOutlined />}
              </IconButton>
            </Tooltip>
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label="Mi cuenta" sx={{ p: 0.5 }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: 13, fontWeight: 800, bgcolor: 'primary.main' }}>
                {initials(user)}
              </Avatar>
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
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AppShell;
