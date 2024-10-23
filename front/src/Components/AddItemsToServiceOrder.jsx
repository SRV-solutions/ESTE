import React, { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Autocomplete,
  Button,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const AddItemsToServiceOrder = () => {
  const { id } = useParams(); // Obtener el ID de la orden de servicio
  const [serviceOrder, setServiceOrder] = useState({
    Event: {},
    OrderedBy: { username: '' },
    DeployedBy: { username: '' },
    CheckedBy: { username: '' },
    ServiceOrderItems: [],
  });
  const [allItems, setAllItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

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
        setServiceOrder(response.data);
      } catch (error) {
        console.error('Error al cargar la orden de servicio:', error);
      }
    };

    fetchItems();
    fetchServiceOrder();
  }, [id]);

  const handleAddItem = () => {
    if (selectedItem) {
      setServiceOrder(prevOrder => ({
        ...prevOrder,
        ServiceOrderItems: [...prevOrder.ServiceOrderItems, { Item: selectedItem }],
      }));
      setSelectedItem(null);
    }
  };

  return (
    <TableContainer component={Paper} style={{ padding: '2%' }}>
      <Typography variant="h6">Orden de Servicio N°: {serviceOrder.id}</Typography>
      <Typography>Evento: {serviceOrder.Event.eventName}</Typography>
      <Typography>Observaciones: {serviceOrder.observations}</Typography>
      <Typography>Creada por: {serviceOrder.OrderedBy.username}</Typography>
      <Typography>Encargado de Chequearla: {serviceOrder.CheckedBy.username}</Typography>
      <Typography>Encargado de Armarla: {serviceOrder.DeployedBy.username}</Typography>
      <Typography>Estatus: {serviceOrder.status}</Typography>

      {/* Barra de búsqueda */}
      <Autocomplete
        options={allItems}
        getOptionLabel={(option) => `${option.id} - ${option.Category.name} - ${option.Category.description}`}
        onChange={(event, newValue) => setSelectedItem(newValue)}
        renderInput={(params) => (
          <TextField {...params} label="Buscar ítem por nombre o descripción" variant="outlined" fullWidth />
        )}
        style={{ margin: '20px 0' }}
      />
      <Button variant="contained" color="primary" onClick={handleAddItem} disabled={!selectedItem}>
        Agregar Ítem a la Orden
      </Button>

      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell align="center">NOMBRE</TableCell>
            <TableCell align="center">DESCRIPCION</TableCell>
            <TableCell align="center">TIPO</TableCell>
            <TableCell align="center">ES ALMACENABLE</TableCell>
            <TableCell align="center">ES CONTENEDOR</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {serviceOrder.ServiceOrderItems.map(({ Item }) => (
            <React.Fragment key={Item.id}>
              {Item.Category.isContainer ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Accordion>
                      <AccordionSummary expandIcon={<ArrowDropDownIcon />} aria-controls={`panel${Item.id}-content`} id={`panel${Item.id}-header`}>
                        <Typography>{Item.id} - {Item.Category.name}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography>
                          ID: {Item.id} <br />
                          Descripción: {Item.Category.description} <br />
                          Tipo: {Item.Category.type} <br />
                          Almacenable: {Item.Category.isStorable ? 'SI' : 'NO'} <br />
                          Es Contenedor: {Item.Category.isContainer ? 'SI' : 'NO'}
                        </Typography>
                        {Item.StoreItemParentItem && Item.StoreItemParentItem.length > 0 && (
                          <Table sx={{ marginTop: 2 }}>
                            <TableHead>
                              <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell align="center">NOMBRE</TableCell>
                                <TableCell align="center">DESCRIPCION</TableCell>
                                <TableCell align="center">TIPO</TableCell>
                                <TableCell align="center">ES ALMACENABLE</TableCell>
                                <TableCell align="center">ES CONTENEDOR</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {Item.StoreItemParentItem.map((containedItem) => {
                                const item = containedItem.StoreItemChildItem || containedItem;
                                return (
                                  <TableRow key={item.id}>
                                    <TableCell component="th" scope="row">{item.id}</TableCell>
                                    <TableCell align="center">{item.Category.name}</TableCell>
                                    <TableCell align="center">{item.Category.description}</TableCell>
                                    <TableCell align="center">{item.Category.type}</TableCell>
                                    <TableCell align="center">{item.Category.isStorable ? 'SI' : 'NO'}</TableCell>
                                    <TableCell align="center">{item.Category.isContainer ? 'SI' : 'NO'}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell component="th" scope="row">{Item.id}</TableCell>
                  <TableCell align="center">{Item.Category.name}</TableCell>
                  <TableCell align="center">{Item.Category.description}</TableCell>
                  <TableCell align="center">{Item.Category.type}</TableCell>
                  <TableCell align="center">{Item.Category.isStorable ? 'SI' : 'NO'}</TableCell>
                  <TableCell align="center">{Item.Category.isContainer ? 'SI' : 'NO'}</TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default AddItemsToServiceOrder;
