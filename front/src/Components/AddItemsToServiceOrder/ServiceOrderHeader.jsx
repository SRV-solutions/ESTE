import React, { useState } from 'react';
import {
  Typography,
  Autocomplete,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const ServiceOrderHeader = ({
  serviceOrder,
  allItems,
  setSelectedItem,
  selectedItem,
  setQuantity,
  quantity,
  handleAddItem,
  canEditOrder,
  onUpdateCheckedBy,
  onUpdateDeployedBy,
  users
}) => {
  const [selectedCategory, setSelectedCategory] = useState('');

  // Estados para edición
  const [editingCheckedBy, setEditingCheckedBy] = useState(false);
  const [editingDeployedBy, setEditingDeployedBy] = useState(false);
  const [tempCheckedBy, setTempCheckedBy] = useState(serviceOrder.CheckedBy?.id || null);
  const [tempDeployedBy, setTempDeployedBy] = useState(serviceOrder.DeployedBy?.id || null);

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

  const handleAddItemAndReset = () => {
    if (selectedItem && quantity > 0) {
      handleAddItem();
      setSelectedItem(null);
    }
  };


  const groupedItems = allItems.reduce((acc, item) => {
    const catName = item.Category.name;
    
    if (!acc[catName]) {
      acc[catName] = {
        Category: item.Category,
        categoryName: catName,
        quantity: 0,
        items: []
      };
    }

    acc[catName].quantity++;
    acc[catName].items.push(item);

    return acc;
  }, {});

  // Convertir a array de objetos
  const filteredItems = Object.values(groupedItems);

  const handleSaveCheckedBy = () => {
    onUpdateCheckedBy(tempCheckedBy);
    setEditingCheckedBy(false);
  };

  const handleCancelCheckedBy = () => {
    setTempCheckedBy(serviceOrder.CheckedBy?.id || null);
    setEditingCheckedBy(false);
  };

  const handleSaveDeployedBy = () => {
    onUpdateDeployedBy(tempDeployedBy);
    setEditingDeployedBy(false);
  };

  const handleCancelDeployedBy = () => {
    setTempDeployedBy(serviceOrder.DeployedBy?.id || null);
    setEditingDeployedBy(false);
  };

  return (
    <>
      <Typography variant="h6">Orden de Servicio N°: {serviceOrder.id}</Typography>
      <Typography>Evento: {serviceOrder?.Event?.Location?.locationName} - {serviceOrder.Event.organizer} - {serviceOrder.Event.producer} - {serviceOrder.Event.finalClient}</Typography>
      <Typography>Observaciones: {serviceOrder.observations}</Typography>
      <Typography>Creada por: {serviceOrder.OrderedBy.username}</Typography>

      {/* Encargado de Chequearla */}
      <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {editingCheckedBy ? (
          <>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={tempCheckedBy || ''}
                onChange={(e) => setTempCheckedBy(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">
                  <em>Sin Asignar</em>
                </MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton onClick={handleSaveCheckedBy} color="success" size="small" title="Guardar">
              <CheckIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={handleCancelCheckedBy} color="error" size="small" title="Cancelar">
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        ) : (
          <>
            <Typography sx={{ mr: 1 }} variant="body1">
              Encargado de Chequearla: <strong>{serviceOrder?.CheckedBy?.username || 'Sin Asignar'}</strong>
            </Typography>
            {canEditOrder() && (
              <IconButton onClick={() => setEditingCheckedBy(true)} size="small" title="Editar">
                <EditIcon fontSize="small" />
              </IconButton>
            )}
          </>
        )}
      </Grid>


      <Grid item xs={12} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {editingDeployedBy ? (
          <>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={tempDeployedBy || ''}
                onChange={(e) => setTempDeployedBy(e.target.value)}
                displayEmpty
                label="Armada por"
              >
                <MenuItem value="">
                  <em>Sin Asignar</em>
                </MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.username}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton onClick={handleSaveDeployedBy} color="success" size="small" title="Guardar">
              <CheckIcon fontSize="small" />
            </IconButton>
            <IconButton onClick={handleCancelDeployedBy} color="error" size="small" title="Cancelar">
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        ) : (
          <>
            <Typography variant="body1" sx={{ mr: 1 }}>
              Encargado de Armarla: <strong>{serviceOrder?.DeployedBy?.username || 'Sin Asignar'}</strong>
            </Typography>
            {canEditOrder() && (
              <IconButton onClick={() => setEditingDeployedBy(true)} size="small" title="Editar">
                <EditIcon fontSize="small" />
              </IconButton>
            )}
          </>
        )}
      </Grid>


      <Typography>Fecha de ingreso de material: {serviceOrder.incomeDate ? new Date(serviceOrder.incomeDate).toLocaleDateString() : 'Sin Fecha'} - {serviceOrder.incomeDate ? `${new Date(serviceOrder.incomeDate).toLocaleTimeString()} hs` : 'Sin Hora'}</Typography>
      <Typography>Fecha de armado: {serviceOrder.assemblyDate ? new Date(serviceOrder.assemblyDate).toLocaleDateString() : 'Sin Fecha'} - {serviceOrder.assemblyDate ? `${new Date(serviceOrder.assemblyDate).toLocaleTimeString()} hs` : 'Sin Hora'}</Typography>
      <Typography>Fecha de desarme: {serviceOrder.disassemblyDate ? new Date(serviceOrder.disassemblyDate).toLocaleDateString() : 'Sin Fecha'} - {serviceOrder.disassemblyDate ? `${new Date(serviceOrder.disassemblyDate).toLocaleTimeString()} hs` : 'Sin Hora'}</Typography>
      <Typography>Fecha de egreso de material: {serviceOrder.outcomeDate ? new Date(serviceOrder.outcomeDate).toLocaleDateString() : 'Sin Fecha'} - {serviceOrder.outcomeDate ? `${new Date(serviceOrder.outcomeDate).toLocaleTimeString()} hs` : 'Sin Hora'}</Typography>
      <Typography>Estado de la Orden de Servicio: {status[serviceOrder.status] || 'Estado desconocido'}</Typography>

      {canEditOrder() && (
        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>

          <Autocomplete
            options={filteredItems}
            getOptionLabel={(option) => `${option.categoryName} - Cantidad Disponible: ${option.quantity}`}
            value={selectedItem}
            onChange={(event, newValue) => setSelectedItem(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Buscar Items" variant="outlined" fullWidth />
            )}
            sx={{ flexGrow: 1 }}
          />
          <TextField
            label="Cantidad"
            type="number"
            variant="outlined"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(Number(e.target.value), 1))}
            inputProps={{ min: 1 }}
            sx={{ width: 100 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleAddItemAndReset}
            disabled={!selectedItem || quantity < 1}
          >
            Agregar Ítem
          </Button>
        </div>
      )}
    </>
  );
};

export default ServiceOrderHeader;
