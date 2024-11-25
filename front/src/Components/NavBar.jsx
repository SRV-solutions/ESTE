import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Link, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';

const NavBar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login');
  };

  return (
    <AppBar position="static">
      <Toolbar>
      <Typography
            variant="h6"
            component={Link}
            to="/" 
            sx={{
              flexGrow: 1,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            E.S.T.E.
          </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button color="inherit" component={Link} to="/service-orders/new">
            Nueva Orden
          </Button>
          <Button color="inherit" component={Link} to="/service-orders">
            Ver Ordenes de Servicio
          </Button>
          <Button color="inherit" component={Link} to="/profile">
            Mi Perfil
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default NavBar;
