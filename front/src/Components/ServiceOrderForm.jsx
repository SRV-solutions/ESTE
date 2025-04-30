import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TextField, Button, Grid, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import axios from 'axios';
import SnackbarComponent from './SnackbarComponent';

const apiUrl = import.meta.env.VITE_API_URL;

const ServiceOrderForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    eventId: '',
    createdDate: new Date().toISOString().split('T')[0],
    incomeDate: '',
    outcomeDate: '',
    assemblyDate: '',
    disassemblyDate: '',
    status: 'created',
    observations: '',
    checkedBy: '',
    orderedBy: '',
    deployedBy: '',
  });
  const [errors, setErrors] = useState({
    incomeDate: "",
    assemblyDate: "",
    disassemblyDate: "",
    outcomeDate: "",
  });
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [openEventModal, setOpenEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    locationId: '',
    organizer: '',
    producer: '',
    finalClient: '',
  });
  const [alertInfo, setAlertInfo] = useState({
    open: false,
    message: ``,
    severity: `info`,
  });
  const validateDates = (name, value) => {
    const newErrors = { ...errors };

    // Convertir a objeto Date para comparar
    const incomeDate = formData.incomeDate ? new Date(formData.incomeDate) : null;
    const assemblyDate = formData.assemblyDate ? new Date(formData.assemblyDate) : null;
    const disassemblyDate = formData.disassemblyDate ? new Date(formData.disassemblyDate) : null;
    const outcomeDate = formData.outcomeDate ? new Date(formData.outcomeDate) : null;
    const newDate = new Date(value);

    // Verificaciones según la fecha modificada
    if (name === "incomeDate") {
      if (assemblyDate && newDate >= assemblyDate) {
        newErrors.incomeDate = "Debe ser menor que la fecha de armado";
      } else {
        newErrors.incomeDate = "";
      }
    }

    if (name === "assemblyDate") {
      if (incomeDate && newDate <= incomeDate) {
        newErrors.assemblyDate = "Debe ser mayor que la fecha de ingreso";
      } else if (disassemblyDate && newDate >= disassemblyDate) {
        newErrors.assemblyDate = "Debe ser menor que la fecha de desarme";
      } else {
        newErrors.assemblyDate = "";
      }
    }

    if (name === "disassemblyDate") {
      if (assemblyDate && newDate <= assemblyDate) {
        newErrors.disassemblyDate = "Debe ser mayor que la fecha de armado";
      } else if (outcomeDate && newDate >= outcomeDate) {
        newErrors.disassemblyDate = "Debe ser menor que la fecha de egreso";
      } else {
        newErrors.disassemblyDate = "";
      }
    }

    if (name === "outcomeDate") {
      if (disassemblyDate && newDate <= disassemblyDate) {
        newErrors.outcomeDate = "Debe ser mayor que la fecha de desarme";
      } else {
        newErrors.outcomeDate = "";
      }
    }

    setErrors(newErrors);
  };

  const handleCloseAlert = () => {
    setAlertInfo((prev) => ({ ...prev, open: false }));
  };
  const showAlert = (message, severity = `info`) => {
    setAlertInfo({ open: true, message, severity });
  };
  const fetchData = async () => {
    try {
      const headers = getAuthHeaders();
      const [usersResponse, eventsResponse, locationsResponse] = await Promise.all([
        axios.get(`${apiUrl}/users`, { headers }),
        axios.get(`${apiUrl}/events`, { headers }),
        axios.get(`${apiUrl}/locations`, { headers }),
      ]);

      setUsers(usersResponse.data);
      setEvents(eventsResponse.data);
      setLocations(locationsResponse.data);

      const userData = JSON.parse(localStorage.getItem('userData'));
      if (userData) {
        setCurrentUser(userData);

      }
    } catch (error) {
      showAlert(`Error al obtener datos: ${error.response.data.message || error.message}`, `error`);

    }
  };
  useEffect(() => {

    fetchData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token found');
    return { Authorization: `Bearer ${token}` };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    validateDates(name, value)
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'eventId' && value === 'new') {
      setOpenEventModal(true);
    }
    fetchData()
  };

  const handleEventChange = (e) => {
    const { name, value } = e.target;
    setNewEvent((prev) => ({ ...prev, [name]: value }));
    fetchData()
  };

  const handleCreateEvent = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await axios.post(`${apiUrl}/events`, newEvent, { headers });
      const createdEvent = response.data;

      setEvents((prevEvents) => [...prevEvents, createdEvent]);
      setFormData((prev) => ({ ...prev, eventId: createdEvent.id }));
      setOpenEventModal(false);
      setNewEvent({ dateEvent: '', locationId: 0, organizer: '', producer: '', finalClient: '' });
      fetchData()
    } catch (error) {
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `${apiUrl}/service-orders`,
        formData,
        { headers: getAuthHeaders() }
      );
      navigate(`/service-orders/${response.data.id}/items`);
    } catch (error) {
      showAlert(`Error al crear la orden de servicio. Error: ${error.response.data.message || error.message}`, `error`);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ margin: '3%' }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={12}>
          <TextField
            select
            fullWidth
            label="Evento"
            name="eventId"
            value={formData.eventId}
            onChange={handleChange}
            required
          >
            {events.map((event) => (
              <MenuItem key={event.id} value={event.id}>
                {event.Location.locationName} - {event.organizer} - {event.producer} - {event.finalClient}
              </MenuItem>
            ))}
            <MenuItem value="new">+ Crear nuevo evento</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Fecha de creación"
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
        <Grid item xs={12} sm={2}>
          <TextField
            fullWidth
            label="Fecha de ingreso de material"
            name="incomeDate"
            type="datetime-local"
            value={formData.incomeDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            error={!!errors.incomeDate}
            helperText={errors.incomeDate}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <TextField
            fullWidth
            label="Fecha de armado"
            name="assemblyDate"
            type="datetime-local"
            value={formData.assemblyDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            error={!!errors.assemblyDate}
            helperText={errors.assemblyDate}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <TextField
            fullWidth
            label="Fecha de desarme"
            name="disassemblyDate"
            type="datetime-local"
            value={formData.disassemblyDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            error={!!errors.disassemblyDate}
            helperText={errors.disassemblyDate}
          />
        </Grid>
        <Grid item xs={12} sm={2}>
          <TextField
            fullWidth
            label="Fecha de egreso de material"
            name="outcomeDate"
            type="datetime-local"
            value={formData.outcomeDate}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            error={!!errors.outcomeDate}
            helperText={errors.outcomeDate}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Observaciones"
            name="observations"
            value={formData.observations}
            onChange={handleChange}
            multiline
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            fullWidth
            label="Creada Por"
            name="orderedBy"
            value={formData.orderedBy}
            onChange={handleChange}
            required
          >
            {users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.id} - {user.username}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        {['checkedBy', 'deployedBy'].map((field) => (
          <Grid item xs={12} sm={4} key={field}>
            <TextField
              select
              fullWidth
              label={field === 'checkedBy' ? 'Chequeado por' : 'Armada por'}
              name={field}
              value={formData[field]}
              onChange={handleChange}
              required
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  {user.id} - {user.username}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        ))}
        <Grid item xs={12}>
          <Button type="submit" variant="contained" color="primary">
            Crear Orden de Servicio
          </Button>
        </Grid>
      </Grid>
      <Dialog open={openEventModal} onClose={() => setOpenEventModal(false)}>
        <DialogTitle>Crear Nuevo Evento</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Nombre del lugar"
            name="locationId"
            value={newEvent.locationId}
            onChange={handleEventChange}
            required
            margin="dense"
          >
            {locations.map((location) => (
              <MenuItem key={location.id} value={location.id}>
                {location.locationName} - {location.address} - {location.city} - {location.country}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Fecha del evento"
            name="dateEvent"
            type="datetime-local"
            value={newEvent.dateEvent}
            onChange={handleEventChange}
            InputLabelProps={{
              shrink: true,
            }}
            required
            margin="dense"
          />
          <TextField fullWidth label="Nombre del evento" name="eventName" value={newEvent.eventName} onChange={handleEventChange} margin="dense" required />
          <TextField fullWidth label="Organizador" name="organizer" value={newEvent.organizer} onChange={handleEventChange} margin="dense" required />
          <TextField fullWidth label="Productor" name="producer" value={newEvent.producer} onChange={handleEventChange} margin="dense" required />
          <TextField fullWidth label="Cliente Final" name="finalClient" value={newEvent.finalClient} onChange={handleEventChange} margin="dense" required />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEventModal(false)} color="secondary">Cancelar</Button>
          <Button onClick={handleCreateEvent} color="primary">Crear Evento</Button>
        </DialogActions>
      </Dialog>
      <SnackbarComponent
        open={alertInfo.open}
        message={alertInfo.message}
        severity={alertInfo.severity}
        onClose={handleCloseAlert}
      />
    </form>
  );
};

export default ServiceOrderForm;
