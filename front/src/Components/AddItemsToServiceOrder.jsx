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
  const { id } = useParams();
  const [serviceOrder, setServiceOrder] = useState({
    Event: {},
    OrderedBy: { username: '' },
    DeployedBy: { username: '' },
    CheckedBy: { username: '' },
    ServiceOrderItems: [],
  });
  const [allItems, setAllItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedStoreItem, setSelectedStoreItem] = useState(null);
  const [quantityToStore, setQuantityToStore] = useState(1);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchItems();
    fetchServiceOrder();
  }, [id]);

  const fetchItems = async () => {
    try {
      const { data } = await axios.get('http://localhost:3000/items');
      setAllItems(data);
    } catch (error) {
      console.error('Error al cargar los ítems:', error);
    }
  };

  const fetchServiceOrder = async () => {
    try {
      const { data } = await axios.get(`http://localhost:3000/service-orders/${id}`);
      setServiceOrder(data);
    } catch (error) {
      console.error('Error al cargar la orden de servicio:', error);
    }
  };

  const handleAddItem = async () => {
    if (!selectedItem || quantity <= 0) return;

    try {
      const response = await axios.post('http://localhost:3000/service-order-items/bulk', {
        serviceOrderId: Number(id),
        categoryId: selectedItem.Category.id,
        quantity,
      });

      if (response.status === 201) {
        setServiceOrder((prev) => ({
          ...prev,
          ServiceOrderItems: [...prev.ServiceOrderItems, { Item: selectedItem, quantity }],
        }));
        setSelectedItem(null);
        setQuantity(1);
        fetchServiceOrder();
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Error al agregar el ítem');
    }
  };

  const handleDeleteAllItems = async () => {
    try {
      const response = await axios.delete(`http://localhost:3000/service-order-items/${id}`);

      if (response.status === 200) {
        fetchServiceOrder();
      }
    } catch (error) {
      console.log(error);

      alert(error.response?.data?.message || 'Error al agregar el ítem');
    }
  }

  const handleAddItemToStore = () => {
    console.log(quantityToStore, selectedStoreItem);

  }

  const renderTableRows = (item, color) => (
    <TableRow key={item.id} sx={{ backgroundColor: color || '' }}>
      <TableCell component="th" scope="row">{item.id}</TableCell>
      <TableCell align="center">{item.Category.name}</TableCell>
      <TableCell align="center">{item.Category.description}</TableCell>
      <TableCell align="center">{item.Category.type}</TableCell>
      <TableCell align="center">{item.Category.isStorable ? 'SI' : 'NO'}</TableCell>
      <TableCell align="center">{item.Category.isContainer ? 'SI' : 'NO'}</TableCell>
    </TableRow>
  );

  return (
    <>
      <TableContainer component={Paper} sx={{ padding: 2 }}>
        <Typography variant="h6">Orden de Servicio N°: {serviceOrder.id}</Typography>
        <Typography>Evento: {serviceOrder.Event.eventName}</Typography>
        <Typography>Observaciones: {serviceOrder.observations}</Typography>
        <Typography>Creada por: {serviceOrder.OrderedBy.username}</Typography>
        <Typography>Encargado de Chequearla: {serviceOrder.CheckedBy.username}</Typography>
        <Typography>Encargado de Armarla: {serviceOrder.DeployedBy.username}</Typography>
        <Typography>Estatus: {serviceOrder.status}</Typography>

        {/* Barra de búsqueda y campo de cantidad */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <Autocomplete
            options={allItems}
            getOptionLabel={(option) => `${option.id} - ${option.Category.name} - ${option.Category.description}`}
            onChange={(event, newValue) => setSelectedItem(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Buscar ítem por nombre o descripción" variant="outlined" fullWidth />
            )}
            sx={{ flexGrow: 1, marginRight: 1 }}
          />

          <TextField
            label="Cantidad"
            type="number"
            variant="outlined"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(Number(e.target.value), 1))}
            inputProps={{ min: 1 }}
            sx={{ width: 100, marginRight: 1 }}
          />

          <Button
            variant="contained"
            color="primary"
            onClick={handleAddItem}
            disabled={!selectedItem || quantity < 1}
          >
            Agregar Ítem
          </Button>
        </div>

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
              Item.Category.isContainer ? (
                <TableRow key={Item.id}>
                  <TableCell colSpan={6}>
                    <Accordion>
                      <AccordionSummary
                        expandIcon={<ArrowDropDownIcon />}
                        aria-controls={`panel${Item.id}-content`}
                        id={`panel${Item.id}-header`}
                      >
                        <Typography>{Item.id} - {Item.Category.name}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Table sx={{ mt: 2 }}>
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
                          {renderTableRows(Item, '#adadad')}
                          {Item.StoreItemParentItem?.length > 0 && (
                            <TableBody>
                              {Item.StoreItemParentItem.map((containedItem) =>
                                renderTableRows(containedItem.StoreItemChildItem || containedItem)
                              )}

                            </TableBody>
                          )}
                        </Table>
                        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', justifyContent: 'space-between' }}>
                          <Autocomplete
                            options={allItems}
                            getOptionLabel={(option) => `${option.id} - ${option.Category.name} - ${option.Category.description}`}
                            onChange={(event, newValue) => setSelectedStoreItem(newValue)}
                            renderInput={(params) => (
                              <TextField {...params} label="Buscar ítem por nombre o descripción" variant="outlined" fullWidth />
                            )}
                          />
                          <TextField
                            label="Cantidad"
                            type="number"
                            variant="outlined"
                            value={quantityToStore}
                            onChange={(e) => setQuantityToStore(Math.max(Number(e.target.value), 1))}
                            inputProps={{ min: 1 }}
                          />
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleAddItemToStore}
                          >
                            Agregar Ítem
                          </Button>
                        </div>
                      </AccordionDetails>
                    </Accordion>
                  </TableCell>
                </TableRow>
              ) : renderTableRows(Item)
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Button variant="contained" color="error" onClick={() => { handleDeleteAllItems() }}>
        Vaciar Orden
      </Button>
      <Button variant="contained" color="success" onClick={() => { }}>
        Crear Orden
      </Button>
    </>
  );
};

export default AddItemsToServiceOrder;
