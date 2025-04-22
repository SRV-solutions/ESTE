import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  TextField,
  MenuItem,
  CircularProgress,
  Typography,
} from '@mui/material';
const apiUrl = import.meta.env.VITE_API_URL;

const ServiceOrderList = () => {
  const navigate = useNavigate();
  const [serviceOrders, setServiceOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [filterType, setFilterType] = useState('myOrderServices');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const FILTER_TYPES = [
    { value: '', label: 'Todos' },
    { value: 'checkedBy', label: 'Chequeadas por mí' },
    { value: 'deployedBy', label: 'Armadas por mí' },
    { value: 'orderedBy', label: 'Creadas por mí' },
    { value: 'myOrderServices', label: 'Mis Órdenes de Servicio' },
  ];

  const status = {
    created: 'Creada',
    in_review: 'En Revisión',
    approved: 'Aprobada',
    rejected: 'Rechazada',
    in_process: 'En Proceso',
    ready: 'Lista',
    dispatched: 'Despachada',
    delivered: 'En Viaje de ida',
    returning: 'En Viaje de regreso',
    received: 'Recibido',
    under_review: 'Bajo Revisión',
    disassembled: 'Desarmada',
  };
  

  const STATUS_FILTERS = [
    { value: '', label: 'Todos' },
    { value: 'created', label: 'Creada' },
    { value: 'approved', label: 'Aprobada' },
    { value: 'rejected', label: 'Rechazada' },
  ];

  useEffect(() => {
    const fetchServiceOrders = async () => {
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const userData = JSON.parse(localStorage.getItem('userData'));
        setCurrentUserId(userData?.id);
        const response = await axios.get(`${apiUrl}/service-orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });        
        setServiceOrders(response.data);
        setFilteredOrders(response.data);
      } catch (err) {        
        setError(err?.response?.data?.message || 'Error al cargar las órdenes de servicio.');
        console.error('Error fetching service orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchServiceOrders();
  }, []);

  useEffect(() => {
    const filtered = serviceOrders.filter((order) => {
      const matchesType =
        !filterType ||
        (filterType === 'checkedBy' && order.CheckedBy?.id === currentUserId) ||
        (filterType === 'deployedBy' && order.DeployedBy?.id === currentUserId) ||
        (filterType === 'orderedBy' && order.OrderedBy?.id === currentUserId) ||
        (filterType === 'myOrderServices' &&
          [order.OrderedBy?.id, order.CheckedBy?.id, order.DeployedBy?.id].includes(currentUserId));
      const matchesStatus = !statusFilter || order.status === statusFilter;
      return matchesType && matchesStatus;
    });
    setFilteredOrders(filtered);
  }, [filterType, statusFilter, serviceOrders, currentUserId]);

  const handleViewDetails = (id) => navigate(`/service-orders/${id}/items`);

  const isCurrentUser = (user) => user?.id === currentUserId;

  const getCellStyle = (user) => ({
    color: isCurrentUser(user) ? 'red' : '',
    fontWeight: isCurrentUser(user) ? 'bold' : '',
  });

  const availableFilters = FILTER_TYPES

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ margin: '20px' }}>
      <Box sx={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <TextField
          select
          label="Filtrar por tipo"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          fullWidth
        >
          {availableFilters.map(({ value, label }) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Filtrar por estado"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          fullWidth
        >
          {STATUS_FILTERS.map(({ value, label }) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell align='center'>Identificador</TableCell>
              <TableCell align='center'>Evento</TableCell>
              <TableCell align='center'>Fecha</TableCell>
              <TableCell align='center'>Estado</TableCell>
              <TableCell align='center'>Creada por</TableCell>
              <TableCell align='center'>Chequeada por</TableCell>
              <TableCell align='center'>Armada por</TableCell>
              <TableCell align='center'>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell align='center'>{order.id}</TableCell>
                  <TableCell align='center' >{order.Event.Location.locationName} - {order.Event.organizer} - {order.Event.producer} - {order.Event.finalClient}</TableCell>
                  <TableCell align='center'>
                    {order.Event?.dateEvent
                      ? new Date(order.Event.dateEvent).toLocaleDateString()
                      : 'Desconocido'}
                  </TableCell>
                  <TableCell align='center'>{status[order.status] || 'Desconocido'}</TableCell>
                  <TableCell align='center' style={getCellStyle(order.OrderedBy)}>
                    {order.OrderedBy?.username || 'Desconocido'}
                  </TableCell>
                  <TableCell align='center' style={getCellStyle(order.CheckedBy)}>
                    {order.CheckedBy?.username || 'Desconocido'}
                  </TableCell>
                  <TableCell align='center' style={getCellStyle(order.DeployedBy)}>
                    {order.DeployedBy?.username || 'Desconocido'}
                  </TableCell>
                  <TableCell align='center'>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      onClick={() => handleViewDetails(order.id)}
                      aria-label={`Ver detalles de la orden ${order.id}`}
                    >
                      Ver Detalles
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No se encontraron órdenes de servicio.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ServiceOrderList;
