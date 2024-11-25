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
} from '@mui/material';

const ServiceOrderList = () => {
  const navigate = useNavigate();
  const [serviceOrders, setServiceOrders] = useState([]);

  useEffect(() => {
    const fetchServiceOrders = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/service-orders', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setServiceOrders(response.data);
      } catch (error) {
        console.error('Error fetching service orders:', error);
      }
    };

    fetchServiceOrders();
  }, []);

  const handleViewDetails = (id) => {
    navigate(`/service-orders/${id}/items`);
  };

  return (
    <Box sx={{ margin: '20px' }}> {/* Margen agregado aquí */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {serviceOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.Event?.eventName || 'No especificado'}</TableCell>
                <TableCell>{new Date(order.Event?.dateEvent).toLocaleDateString()}</TableCell>
                <TableCell>{order.status || 'Desconocido'}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => handleViewDetails(order.id)}
                  >
                    Ver Detalles
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ServiceOrderList;
