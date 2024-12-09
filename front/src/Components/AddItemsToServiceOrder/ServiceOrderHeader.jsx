import React from 'react';
import { Typography, Autocomplete, TextField, Button } from '@mui/material';

const ServiceOrderHeader = ({
  serviceOrder,
  allItems,
  setSelectedItem,
  selectedItem,
  setQuantity,
  quantity,
  handleAddItem,
}) => {
  return (
    <>
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
    </>
  );
};

export default ServiceOrderHeader;
