// ServiceOrderForm.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Grid } from '@mui/material';
import axios from 'axios';

const ServiceOrderForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    eventId: '',
    createdDate: '',
    status: 'Created',
    observations: '',
    checkedBy: '',
    orderedBy: '',
    deployedBy: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:3000/service-orders', formData);
      navigate(`/service-orders/${response.data.id}/items`); // Redirigir a la nueva ruta
    } catch (error) {
      console.error('Error al crear la orden de servicio:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Event ID"
            name="eventId"
            value={formData.eventId}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Created Date"
            name="createdDate"
            type="date"
            value={formData.createdDate}
            onChange={handleChange}
            InputLabelProps={{
              shrink: true,
            }}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Observations"
            name="observations"
            value={formData.observations}
            onChange={handleChange}
            multiline
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Checked By"
            name="checkedBy"
            value={formData.checkedBy}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Ordered By"
            name="orderedBy"
            value={formData.orderedBy}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Deployed By"
            name="deployedBy"
            value={formData.deployedBy}
            onChange={handleChange}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <Button type="submit" variant="contained" color="primary">
            Create Service Order
          </Button>
        </Grid>
      </Grid>
    </form>
  );
};

export default ServiceOrderForm;
