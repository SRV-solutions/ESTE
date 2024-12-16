import React from 'react';
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Button,
  Autocomplete,
} from '@mui/material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

const ServiceOrderTable = ({
  serviceOrder,
  allItems,
  setSelectedStoreItem,
  selectedStoreItem,
  setQuantityToStore,
  quantityToStore,
  handleAddItemToStore,
  renderTableRows,
}) => {

  const handleAddItemAndReset = (itemId) => {
    handleAddItemToStore(itemId); // Llama la función existente para agregar el ítem
    setSelectedStoreItem(null); // Reinicia el valor del Autocomplete

  };
  return (
    <Table sx={{ minWidth: 650 }} aria-label="simple table">
      <TableHead>
        <TableRow>
          <TableCell>ID</TableCell>
          <TableCell align="center">NOMBRE</TableCell>
          <TableCell align="center">DESCRIPCIÓN</TableCell>
          <TableCell align="center">TIPO</TableCell>
          <TableCell align="center">ES ALMACENABLE</TableCell>
          <TableCell align="center">ES CONTENEDOR</TableCell>
          <TableCell align="center">ACCIONES</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {serviceOrder.ServiceOrderItems.map(({ Item }) =>
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
                          <TableCell align="center">DESCRIPCIÓN</TableCell>
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
                        value={selectedStoreItem} // Vincula el estado actual
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
                        onClick={() => handleAddItemAndReset(Item.id)}
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
        )}
      </TableBody>
    </Table>
  );
};

export default ServiceOrderTable;
