import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Grid, MenuItem } from '@mui/material';
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

  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = getAuthHeaders();
        const [usersResponse, eventsResponse] = await Promise.all([
          axios.get('http://localhost:3000/users', { headers }),
          axios.get('http://localhost:3000/events', { headers }),
        ]);
        setUsers(usersResponse.data);
        setEvents(eventsResponse.data);
      } catch (error) {
        console.error('Error al obtener datos:', error);
      }
    };

    fetchData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token found');
    return { Authorization: `Bearer ${token}` };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        'http://localhost:3000/service-orders',
        formData,
        { headers: getAuthHeaders() }
      );
      navigate(`/service-orders/${response.data.id}/items`);
    } catch (error) {
      console.error('Error al crear la orden de servicio:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ margin: '3%' }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            label="Event"
            name="eventId"
            value={formData.eventId}
            onChange={handleChange}
            required
          >
            {events.map((event) => (
              <MenuItem key={event.id} value={event.id}>
                {event.name}
              </MenuItem>
            ))}
          </TextField>
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
        {['checkedBy', 'orderedBy', 'deployedBy'].map((field) => (
          <Grid item xs={12} sm={4} key={field}>
            <TextField
              select
              fullWidth
              label={field.replace(/([A-Z])/g, ' $1').trim()}
              name={field}
              value={formData[field]}
              onChange={handleChange}
              required
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        ))}
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
