import React, { useState } from 'react';
import { Typography, Autocomplete, TextField, Button, MenuItem, Select, FormControl, InputLabel } from '@mui/material';

const ServiceOrderHeader = ({
  serviceOrder,
  allItems,
  setSelectedItem,
  selectedItem,
  setQuantity,
  quantity,
  handleAddItem,
  canEditOrder
}) => {
  const [selectedCategory, setSelectedCategory] = useState('');

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

  const categories = [...new Set(allItems.map(item => item.Category.name))];
  const filteredItems = selectedCategory
    ? allItems.filter(item => item.Category.name === selectedCategory)
    : allItems;

  return (
    <>
      <Typography variant="h6">Orden de Servicio N°: {serviceOrder.id}</Typography>
      <Typography>Evento: {serviceOrder?.Event?.Location?.locationName} - {serviceOrder.Event.organizer} - {serviceOrder.Event.producer} - {serviceOrder.Event.finalClient}</Typography>
      <Typography>Observaciones: {serviceOrder.observations}</Typography>
      <Typography>Creada por: {serviceOrder.OrderedBy.username}</Typography>
      <Typography>Encargado de Chequearla: {serviceOrder.CheckedBy.username}</Typography>
      <Typography>Encargado de Armarla: {serviceOrder.DeployedBy.username}</Typography>
      <Typography>Fecha de ingreso de material: {serviceOrder.incomeDate ? new Date(serviceOrder.incomeDate).toLocaleDateString() : 'Sin Fecha'} - {serviceOrder.incomeDate ? `${new Date(serviceOrder.incomeDate).toLocaleTimeString()} hs` : 'Sin Hora'}</Typography>
      <Typography>Fecha de armado: {serviceOrder.assemblyDate ? new Date(serviceOrder.assemblyDate).toLocaleDateString() : 'Sin Fecha'} - {serviceOrder.assemblyDate ? `${new Date(serviceOrder.assemblyDate).toLocaleTimeString()} hs` : 'Sin Hora'}</Typography>
      <Typography>Fecha de desarme: {serviceOrder.disassemblyDate ? new Date(serviceOrder.disassemblyDate).toLocaleDateString() : 'Sin Fecha'} - {serviceOrder.disassemblyDate ? `${new Date(serviceOrder.disassemblyDate).toLocaleTimeString()} hs` : 'Sin Hora'}</Typography>
      <Typography>Fecha de egreso de material: {serviceOrder.outcomeDate ? new Date(serviceOrder.outcomeDate).toLocaleDateString() : 'Sin Fecha'} - {serviceOrder.outcomeDate ? `${new Date(serviceOrder.outcomeDate).toLocaleTimeString()} hs` : 'Sin Hora'}</Typography>
      <Typography>Estado de la Orden de Servicio: {status[serviceOrder.status] || 'Estado desconocido'}</Typography>

      {canEditOrder() && (
        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Categoría</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <MenuItem value="">Todas</MenuItem>
              {categories.map(category => (
                <MenuItem key={category} value={category}>{category}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Autocomplete
            options={filteredItems}
            getOptionLabel={(option) => `${option.code} - ${option.Category.name} - ${option.Category.description}`}
            value={selectedItem}
            onChange={(event, newValue) => setSelectedItem(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="Buscar ítem" variant="outlined" fullWidth />
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
