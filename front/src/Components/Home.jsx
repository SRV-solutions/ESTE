import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Typography, Card, CardContent, Button, IconButton } from '@mui/material';
import AccountCircle from '@mui/icons-material/AccountCircle';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import DescriptionIcon from '@mui/icons-material/Description'; // Icono para la card de órdenes de servicio
import { useNavigate } from 'react-router-dom';

const apiUrl = import.meta.env.VITE_API_URL;

const Home = () => {
  const [user, setUser] = useState({
    username: "",
    role: "",
    OrderedBy: [],
    CheckedBy: [],
    DeployedBy: []
  });

  const navigate = useNavigate();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token found');
    return { Authorization: `Bearer ${token}` };
  };

  // 📥 Fetch Perfil del Usuario
  const fetchUserProfile = async () => {
    try {
      const { data } = await axios.get(`${apiUrl}/users/profile`, {
        headers: getAuthHeaders(),
      });
      setUser(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };


  useEffect(() => {
    fetchUserProfile();
  }, []);

  console.log(user);


  return (
    <Box
      sx={{
        maxWidth: '80%', // Establece el ancho al 80% del contenedor
        margin: '50px auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)', // Tres columnas para las tres cards
        gap: 3,
        padding: 2,
        width: '100%',
        minWidth: 1000, // Para asegurar que no se haga demasiado pequeño en pantallas pequeñas
        height: '60vh', // Establece la altura al 80% de la altura de la ventana
      }}
    >
      {/* Card de Usuario a la izquierda */}
      <Card
        sx={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          boxShadow: 3,
          height: '100%', // Ocupa todo el espacio vertical disponible
          backgroundColor: "#d9d9d9"
        }}
      >
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AccountCircle sx={{ fontSize: 60 }} /> {/* Icono de usuario */}
          <Box>
            <Typography variant="h3">{user.username}</Typography>
            <Typography variant="h6">{user.email}</Typography>
          </Box>
        </CardContent>

        {/* Sub-card con el rol y botón "Ver en Organigrama" */}
        <Card sx={{ margin: 2, padding: 4, display: 'flex', flexDirection: 'column', backgroundColor: '#777777', borderRadius: '15px' }}>

          <Typography variant="h3">Ficha Tecnica</Typography>
          <Typography variant="body1">Mi Rol: {user.role}</Typography>
          <Button
            disabled
            variant="outlined"
            sx={{ marginTop: 1, color: 'black', backgroundColor: "#a6a6a6", borderColor: '#a6a6a6' }}
            onClick={() => navigate('/organigrama')}
          >
            Ver en Organigrama
          </Button>
        </Card>

        {/* Botón fuera de la sub-card */}
        {(user.role === 'Admin') && <Button
          variant="contained"
          sx={{ margin: 2, backgroundColor: "#777777", borderColor: '#777777' }}
          color="primary"
          onClick={() => navigate('/users')}
        >
          Panel de Admin
        </Button>}
      </Card>

      {/* Card de Ordenes de Servicio en el centro */}
      <Card
        sx={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          boxShadow: 3,
          height: '100%', // Ocupa todo el espacio vertical disponible
          placeContent: 'center',
        }}
      >
        <CardContent sx={{ textAlign: 'center' }}>
          <IconButton sx={{ fontSize: 60, color: 'primary.main' }}>
            <DescriptionIcon sx={{ fontSize: 160, color: 'black' }} onClick={() => navigate('/service-orders')} />
          </IconButton>
          <Typography variant="h6" sx={{ marginTop: 1 }}>
            Órdenes de Servicio
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestiona y organiza tus órdenes de servicio de manera eficiente.
          </Typography>

          {/* Círculos con números debajo */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-around',
              marginTop: 3,
            }}
          >
            {/* Circulo de "Creadas" */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="body2">Creadas</Typography>
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  backgroundColor: '#777777',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 20,
                }}
              >
                {user.OrderedBy.length} {/* Número dinámico */}
              </Box>
            </Box>

            {/* Circulo de "A Chequear" */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="body2">A Chequear</Typography>
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  backgroundColor: '#777777',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 20,
                }}
              >
                {user.CheckedBy.length} {/* Número dinámico */}
                </Box>
            </Box>

            {/* Circulo de "A Armar" */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="body2">A Armar</Typography>
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  backgroundColor: '#777777',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: 20,
                }}
              >
                {user.DeployedBy.length} {/* Número dinámico */}
                </Box>
            </Box>
          </Box>
          <Button
              sx={{ margin: 2, color: 'white', backgroundColor: 'black' }}
              variant="outlined"
              color="primary"
              onClick={() => navigate('/service-orders/new')}
            >
              Agregar Orden de Servicio
            </Button>
        </CardContent>
      </Card>

      {/* Card de Gestión de Ítems a la derecha */}
      <Card
        sx={{
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          boxShadow: 3,
          height: '100%', // Ocupa todo el espacio vertical disponible
          placeContent: 'center'
        }}
      >
        <CardContent sx={{ textAlign: 'center' }}>
          <IconButton sx={{ fontSize: 60, color: 'primary.main' }}>
            <WarehouseIcon sx={{ fontSize: 160, color: 'black' }} />
          </IconButton>
          <Typography variant="h6">Gestión de Ítems</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 2 }}>
            Agrega y administra ítems en tus órdenes de servicio fácilmente.
          </Typography>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <Button
              variant="contained"
              sx={{ margin: 2, color: 'white', backgroundColor: 'black' }}
              color="primary"
              onClick={() => navigate('/items')}
            >
              Agregar Ítem
            </Button>
            <Button
              sx={{ margin: 2, color: 'white', backgroundColor: 'black' }}
              variant="outlined"
              color="primary"
              onClick={() => navigate('/categories')}
            >
              Agregar Categoría
            </Button>
          </div>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Home;
