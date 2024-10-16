// ServiceOrderComponent.jsx
import React from 'react';
import { Typography, Grid, Paper } from '@mui/material';

const ServiceOrderComponent = ({ serviceOrder }) => {    
  return (
    <Paper elevation={2} style={{ padding: '10px', marginBottom: '20px' }}>
      <Typography variant="h6">Detalles de la Orden de Servicio</Typography>
      <Grid container spacing={2}>
        {serviceOrder.items && serviceOrder.items.map((item, index) => (
          <Grid item xs={12} sm={6} key={item.id || index}>
            <Typography>{item.id} - {item.Category.name}</Typography> {/* Asegúrate de tener 'name' o el campo adecuado */}
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default ServiceOrderComponent;
