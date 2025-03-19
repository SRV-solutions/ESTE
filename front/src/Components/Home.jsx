import React from 'react';
import { Box, Typography, Card, CardContent, CardMedia, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const navigate = useNavigate();

  // Información de las cards
  const cards = [
    {
      title: 'Órdenes de Servicio',
      description: 'Gestiona y organiza tus órdenes de servicio de manera eficiente.',
      image: 'https://via.placeholder.com/800x300?text=Ordenes+de+Servicio',
      route: '/service-orders',
      disabled: false
    },
    {
      title: 'Gestión de Ítems',
      description: 'Agrega y administra ítems en tus órdenes de servicio fácilmente.',
      image: 'https://via.placeholder.com/800x300?text=Gestion+de+Items',
      route: '/items',
      disabled: false
    },
    {
      title: 'Usuarios y Roles',
      description: 'Controla el acceso y las acciones de los usuarios en la aplicación.',
      image: 'https://via.placeholder.com/800x300?text=Usuarios+y+Roles',
      route: '/users',
      disabled: true
    },
  ];

  return (
    <Box
      sx={{
        maxWidth: '1200px',
        margin: '50px auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 3,
        padding: 2,
      }}
    >
      {cards.map((card, index) => (
        <Card
          key={index}
          sx={{
            position: 'relative',
            borderRadius: 2,
            overflow: 'hidden',
            transition: 'transform 0.3s, box-shadow 0.3s',
            cursor: card.disabled ? 'not-allowed' : 'pointer',
            opacity: card.disabled ? 0.5 : 1,
            '&:hover': {
              transform: card.disabled ? 'none' : 'scale(1.05)',
              boxShadow: card.disabled ? 'none' : '0 10px 20px rgba(0, 0, 0, 0.2)',
            },
          }}
          onClick={() => {
            if (!card.disabled) navigate(card.route);
          }}        >
          <CardMedia
            component="img"
            height="150"
            image={card.image}
            alt={card.title}
            sx={{ objectFit: 'cover' }}
          />
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              {card.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {card.description}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              sx={{ marginTop: 2 }}
              disabled = {card.disabled}
              onClick={(e) => {
                e.stopPropagation(); // Evita conflictos con el clic en la card
                if (!card.disabled) navigate(card.route);
              }}
            >
              Ver Más
            </Button>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default Home;
