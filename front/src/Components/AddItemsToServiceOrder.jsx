// AddItemsToServiceOrder.jsx
import React, { useEffect, useState } from 'react';
import { Container, Typography, Checkbox, FormControlLabel, Grid, Paper } from '@mui/material';
import ServiceOrderComponent from './ServiceOrderComponent'; // Asegúrate de que la ruta sea correcta
import { useParams } from 'react-router-dom';
import axios from 'axios';

const AddItemsToServiceOrder = () => {
  const { id } = useParams(); // Obtener el ID de la orden de servicio
  const [serviceOrder, setServiceOrder] = useState({ items: [] }); // Asegúrate de que 'items' sea un array
  const [allItems, setAllItems] = useState([]);
  
  // Lógica para cargar los ítems disponibles (puedes ajustar el endpoint)
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await axios.get('http://localhost:3000/items');
        setAllItems(response.data);
      } catch (error) {
        console.error('Error al cargar los ítems:', error);
      }
    };

    const fetchServiceOrder = async () => {
      try {
        const response = await axios.get(`http://localhost:3000/service-orders/${id}`);
        setServiceOrder(prevState => ({
          ...prevState,
          items: response.data.items || [], // Asegúrate de que items sea un array
        }));
      } catch (error) {
        console.error('Error al cargar la orden de servicio:', error);
      }
    };

    fetchItems();
    fetchServiceOrder();
  }, [id]);

  const handleCheckboxChange = (itemId) => {
    const updatedItems = serviceOrder.items.includes(itemId)
      ? serviceOrder.items.filter(item => item !== itemId)
      : [...serviceOrder.items, itemId];

    setServiceOrder(prevState => ({
      ...prevState,
      items: updatedItems,
    }));
  };

  return (
    <Container maxWidth="md" style={{ textAlign: 'center', marginTop: '20px' }}>
      <Paper elevation={3} style={{ padding: '20px' }}>
        <Typography variant="h4">Orden de Servicio ID: {id}</Typography>
        <ServiceOrderComponent serviceOrder={serviceOrder} />
        <Typography variant="h5" style={{ marginTop: '20px' }}>Ítems Disponibles</Typography>
        <Grid container spacing={2} justifyContent="center">
          {allItems.map(item => (
            <Grid item xs={12} sm={6} key={item.id}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={serviceOrder.items.includes(item)}
                    onChange={() => handleCheckboxChange(item)}
                  />
                }
                label={`${item.id} - ${item.Category.name}`}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>
    </Container>
  );
};

export default AddItemsToServiceOrder;
