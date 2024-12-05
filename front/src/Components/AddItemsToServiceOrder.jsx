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
  IconButton,
  Snackbar,
  Alert,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DeleteIcon from '@mui/icons-material/Delete';
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
  const [alertInfo, setAlertInfo] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  useEffect(() => {
    fetchItems();
    fetchServiceOrder();
  }, [id]);

  // Obtener token del localStorage y enviar con las solicitudes
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No token found');
    return { Authorization: `Bearer ${token}` };
  };
  const showAlert = (message, severity = 'info') => {
    setAlertInfo({ open: true, message, severity });
  };
  const fetchItems = async () => {
    try {
      const { data } = await axios.get('http://localhost:3000/items', {
        headers: getAuthHeaders(),
      });
      setAllItems(data);
    } catch (error) {
      console.error('Error al cargar los ítems:', error);
    }
  };

  const fetchServiceOrder = async () => {
    try {
      const { data } = await axios.get(`http://localhost:3000/service-orders/${id}`, {
        headers: getAuthHeaders(),
      });

      setServiceOrder(data);
    } catch (error) {
      console.error('Error al cargar la orden de servicio:', error);
    }
  };

  const handleAddItem = async () => {
    if (!selectedItem || quantity <= 0) return;

    try {
      const response = await axios.post(
        'http://localhost:3000/service-order-items/bulk',
        {
          serviceOrderId: Number(id),
          categoryId: selectedItem.Category.id,
          quantity,
        },
        { headers: getAuthHeaders() }
      );

      if (response.status === 201) {
        setServiceOrder((prev) => ({
          ...prev,
          ServiceOrderItems: [...prev.ServiceOrderItems, { Item: selectedItem, quantity }],
        }));
        setSelectedItem(null);
        setQuantity(1);
        fetchServiceOrder();
        showAlert('Ítem agregado correctamente', 'success');

      }
    } catch (error) {
      showAlert(error.response?.data?.message || 'Error al agregar el ítem', 'error');
    }
  };

  const handleDeleteItem = async (itemId, itemIdParent) => {
    try {
      if (itemIdParent) {
        const response = await axios.delete(
          `http://localhost:3000/service-order-store-items/${id}/${itemIdParent}/${itemId}`,
          { headers: getAuthHeaders() }
        );

        if (response.status === 200) {
          fetchServiceOrder();
          showAlert('Ítem eliminado correctamente', 'success');

        }
        return
      }
      const response = await axios.delete(
        `http://localhost:3000/service-order-items/${id}/${itemId}`,
        { headers: getAuthHeaders() }
      );

      if (response.status === 200) {
        fetchServiceOrder();
      }
    } catch (error) {
      console.error('Error al eliminar el ítem:', error);
      showAlert(error.response?.data?.message || 'Error al eliminar el ítem', 'error');
    }
  };

  const handleDeleteAllItems = async () => {
    try {
      const response = await axios.delete(`http://localhost:3000/service-order-items/${id}`, {
        headers: getAuthHeaders(),
      });

      if (response.status === 200) {
        fetchServiceOrder();
      }
    } catch (error) {
      console.error('Error al eliminar todos los ítems:', error);
      showAlert(error.response?.data?.message || 'Error al eliminar ítems', 'error');

    }
  };

  const handleCloseAlert = () => {
    setAlertInfo((prev) => ({ ...prev, open: false }));
  };

  const handleAddItemToStore = async (storeItemId) => {
    if (!selectedStoreItem || quantityToStore <= 0) return;

    try {
      const itemIdParent = storeItemId

      const itemChildren = allItems.filter(item => item.Category.id === selectedStoreItem.Category.id);

      if (itemChildren.length < quantityToStore) {
        showAlert('No hay suficientes ítems disponibles en esta categoría', 'error');
        return;
      }

      const storeItemData = {
        serviceOrderId: Number(id),
        itemIdParent,
        categoryId: selectedStoreItem.Category.id,
        quantity: quantityToStore,
      };


      const response = await axios.post(
        'http://localhost:3000/service-order-store-items/bulk',
        storeItemData,
        { headers: getAuthHeaders() }
      );

      if (response.status === 201) {
        setServiceOrder((prev) => ({
          ...prev,
          ServiceOrderItems: [
            ...prev.ServiceOrderItems,
            { Item: selectedStoreItem, quantity: quantityToStore }
          ],
        }));
        showAlert('Item agregado correctamente al almacen', 'success');

        setSelectedStoreItem(null);
        setQuantityToStore(1);
        fetchServiceOrder();
      }
    } catch (error) {
      showAlert(error.response?.data?.message || 'Error al agregar el ítem al almacén', 'error');
    }
  };

  const renderTableRows = (item, color, itemIdParent = NaN) => (
    <TableRow key={item.id} sx={{ backgroundColor: color || '' }}>
      <TableCell>{item.id}</TableCell>
      <TableCell align="center">{item.Category.name}</TableCell>
      <TableCell align="center">{item.Category.description}</TableCell>
      <TableCell align="center">{item.Category.type}</TableCell>
      <TableCell align="center">{item.Category.isStorable ? 'SI' : 'NO'}</TableCell>
      <TableCell align="center">{item.Category.isContainer ? 'SI' : 'NO'}</TableCell>
      <TableCell align="center">
        <IconButton
          onClick={() => handleDeleteItem(item.id, itemIdParent)}
          sx={{
            color: '#757575',
            '&:hover': {
              color: '#ff0000',
              cursor: 'pointer',
            },
          }}
        >
          <DeleteIcon />
        </IconButton>
      </TableCell>
    </TableRow>
  );
  return (
    <div style={{ margin: '3%' }}>
      <TableContainer component={Paper} sx={{ padding: 2 }}>
        <Typography variant="h6">Orden de Servicio N°: {serviceOrder.id}</Typography>
        <Typography>Evento: {serviceOrder.Event.eventName}</Typography>
        <Typography>Observaciones: {serviceOrder.observations}</Typography>
        <Typography>Creada por: {serviceOrder.OrderedBy.username}</Typography>
        <Typography>Encargado de Chequearla: {serviceOrder.CheckedBy.username}</Typography>
        <Typography>Encargado de Armarla: {serviceOrder.DeployedBy.username}</Typography>
        <Typography>Estatus: {serviceOrder.status}</Typography>

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
              <TableCell align="center">ACCIONES</TableCell>
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
                              <TableCell align="center">ACCIONES</TableCell>
                            </TableRow>
                          </TableHead>
                          {renderTableRows(Item, '#adadad')}
                          {Item.StoreItemParentItem?.length > 0 && (
                            <TableBody>
                              {Item.StoreItemParentItem.map((containedItem) =>
                                renderTableRows(containedItem.StoreItemChildItem || containedItem, 'white', Item.id)
                              )}
                            </TableBody>
                          )}
                        </Table>
                        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', justifyContent: 'space-between' }}>
                          <Autocomplete
                            style={{ width: '50vh' }}
                            options={allItems}
                            getOptionLabel={(option) => `${option.id} - ${option.Category.name} - ${option.Category.description}`}
                            onChange={(event, newValue) => setSelectedStoreItem(newValue)}
                            renderInput={(params) => (
                              <TextField {...params} label="Buscar ítem del almacén" variant="outlined" fullWidth />
                            )}
                          />
                          <TextField
                            label="Cantidad"
                            type="number"
                            variant="outlined"
                            value={quantityToStore}
                            onChange={(e) => setQuantityToStore(Math.max(Number(e.target.value), 1))}
                            inputProps={{ min: 1 }}
                            sx={{ width: 100, marginRight: 1 }}
                          />
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => handleAddItemToStore(Item.id)}
                            disabled={!selectedStoreItem || quantityToStore < 1}
                          >
                            Agregar ítem al almacén
                          </Button>
                        </div>
                      </AccordionDetails>
                    </Accordion>
                  </TableCell>
                </TableRow>
              ) : (
                renderTableRows(Item)
              )
            ))}
          </TableBody>
        </Table>

        <Button
          variant="outlined"
          color="error"
          onClick={handleDeleteAllItems}
          sx={{ mt: 2 }}
        >
          Eliminar todos los ítems
        </Button>
      </TableContainer>
      <Snackbar
        open={alertInfo.open}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseAlert}
          severity={alertInfo.severity}
          sx={{ width: '100%' }}
        >
          {alertInfo.message}
        </Alert>
      </Snackbar>
    </div>
  );

};

export default AddItemsToServiceOrder;
