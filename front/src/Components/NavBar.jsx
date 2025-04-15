import React, { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import AccountCircle from '@mui/icons-material/AccountCircle';
import { Link, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';

const NavBar = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
    handleClose();
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    navigate('/profile');
    handleClose();
  };

  return (
    <AppBar position="static">
      <Toolbar
        sx={{
          backgroundColor: 'black',
          height: '160px',
          minHeight: '140px !important',
          paddingY: 0,
        }}
      >
        <Box
          component={Link}
          to="/"
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            height: '100%',
            paddingLeft: '3rem'
          }}
        >
          <img
            src="https://imagenes-landing.s3.us-east-1.amazonaws.com/este/logo-mas-este.png"
            alt="E.S.T.E. Logo"
            style={{
              height: '100%',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* <Button color="inherit" component={Link} to="/service-orders/new">
            Nueva Orden
          </Button>
          <Button color="inherit" component={Link} to="/service-orders">
            Ver Ordenes de Servicio
          </Button>
          <Button color="inherit" component={Link} to="/items">
            Items
          </Button>
          <Button color="inherit" component={Link} to="/categories">
            Categorías
          </Button> */}

          {/* Ícono de usuario con dropdown */}
          <IconButton
            size="large"
            edge="end"
            color="inherit"
            onClick={handleMenu}
          >
            <AccountCircle style={{ fontSize: 80, paddingRight: '3rem' }} />  {/* Aumenta el tamaño del ícono aquí */}
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem onClick={handleProfile}>Mi Perfil</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
