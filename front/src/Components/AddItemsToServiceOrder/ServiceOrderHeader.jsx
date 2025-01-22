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
  canEditOrder
}) => {

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
      handleAddItem(); // Llama la función existente para agregar el ítem
      setSelectedItem(null); // Reinicia el valor del Autocomplete
    }
  };

  return (
    <>
      <Typography variant="h6">Orden de Servicio N°: {serviceOrder.id}</Typography>
      <Typography>Evento: {serviceOrder.Event.eventName}</Typography>
      <Typography>Observaciones: {serviceOrder.observations}</Typography>
      <Typography>Creada por: {serviceOrder.OrderedBy.username}</Typography>
      <Typography>Encargado de Chequearla: {serviceOrder.CheckedBy.username}</Typography>
      <Typography>Encargado de Armarla: {serviceOrder.DeployedBy.username}</Typography>
      <Typography>
        Fecha de ingreso de material: {new Date(serviceOrder.incomeDate).toLocaleDateString()} - {new Date(serviceOrder.incomeDate).toLocaleTimeString()} hs
      </Typography>
      <Typography>
        Fecha de egreso de material: {new Date(serviceOrder.outcomeDate).toLocaleDateString()} - {new Date(serviceOrder.outcomeDate).toLocaleTimeString()} hs
      </Typography>
      <Typography>
        Fecha de armado: {new Date(serviceOrder.assemblyDate).toLocaleDateString()} - {new Date(serviceOrder.assemblyDate).toLocaleTimeString()} hs
      </Typography>
      <Typography>
        Fecha de desarme: {new Date(serviceOrder.disassemblyDate).toLocaleDateString()} - {new Date(serviceOrder.disassemblyDate).toLocaleTimeString()} hs
      </Typography>
      <Typography>Estado de la Orden de Servicio: {status[serviceOrder.status] || 'Estado desconocido'}</Typography>

      {canEditOrder() && (
        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <Autocomplete
            options={allItems}
            getOptionLabel={(option) =>
              `${option.id} - ${option.Category.name} - ${option.Category.description}`
            }
            value={selectedItem}
            onChange={(event, newValue) => setSelectedItem(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Buscar ítem por nombre o descripción"
                variant="outlined"
                fullWidth
              />
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
