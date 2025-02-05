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
  canEditOrder
}) => {

  const handleAddItemAndReset = (itemId) => {
    handleAddItemToStore(itemId); // Llama la función existente para agregar el ítem
    setSelectedStoreItem(null); // Reinicia el valor del Autocomplete
  };
  let categorizedItems = {};

  serviceOrder.ServiceOrderItems.forEach(({ Item }) => {
    if (!Item.Category.isContainer) {
      const categoryName = Item.Category.name;

      if (!categorizedItems[categoryName]) {
        categorizedItems[categoryName] = [];
      }

      categorizedItems[categoryName].push(Item);
    }
  });

  let categorizedArray = Object.entries(categorizedItems).map(([category, items]) => ({
    category,
    items
  }));

  return (
    <Table sx={{ minWidth: 650 }} aria-label="simple table">
      <TableBody>
        {categorizedArray.map(({ category, items }) => (
          <TableRow key={category}>
            <TableCell colSpan={9}>
              <Accordion>
                <AccordionSummary expandIcon={<ArrowDropDownIcon />} id={`panel-${category}`}>
                  <Typography>Cantidad: {items.length} - {items[0]?.Category?.code} - {category}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Table sx={{ mt: 2 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell align="center">Cambiar</TableCell>
                        <TableCell align="center">Codigo</TableCell>
                        <TableCell align="center">NOMBRE</TableCell>
                        <TableCell align="center">DESCRIPCIÓN</TableCell>
                        <TableCell align="center">TIPO</TableCell>
                        <TableCell align="center">E.A</TableCell>
                        <TableCell align="center">E.C</TableCell>
                        {canEditOrder() && <TableCell align="center">ACCIONES</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item) => renderTableRows(item, 'white'))}
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>
            </TableCell>
          </TableRow>
        ))}
        {serviceOrder.ServiceOrderItems.map(({ Item }) =>
          Item.Category.isContainer && (
            <TableRow key={Item.id}>
              <TableCell colSpan={9}>
                <Accordion>
                  <AccordionSummary
                    expandIcon={<ArrowDropDownIcon />}
                    aria-controls={`panel${Item.id}-content`}
                    id={`panel${Item.id}-header`}
                  >
                    <Typography>Items guardados: {Item?.StoreItemParentItem?.length} - {Item.Category.name}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Table sx={{ mt: 2 }}>
                      <TableHead>
                        <TableRow>
                          <TableCell align="center">NOMBRE</TableCell>
                          <TableCell align="center">DESCRIPCIÓN</TableCell>
                          <TableCell align="center">TIPO</TableCell>
                          <TableCell align="center">E.A</TableCell>
                          <TableCell align="center">E.C</TableCell>
                          {canEditOrder() && <TableCell align="center">ACCIONES</TableCell>}
                        </TableRow>
                      </TableHead>
                      {renderTableRows(Item, '#add')}
                      {Item.StoreItemParentItem?.length > 0 && (
                        <TableBody>
                          {Item.StoreItemParentItem.map((containedItem) =>
                            renderTableRows(containedItem.StoreItemChildItem || containedItem, 'white', Item, Item.isTemporalContainer)
                          )}
                        </TableBody>
                      )}
                    </Table>
                    <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', justifyContent: 'space-between' }}>
                      {canEditOrder() && (
                        <>
                          <Autocomplete
                            style={{ width: '50vh' }}
                            options={allItems}
                            getOptionLabel={(option) => `${option.code} - ${option.Category.name}`}
                            value={selectedStoreItem}
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
                        </>
                      )}
                    </div>
                  </AccordionDetails>
                </Accordion>
              </TableCell>
            </TableRow>
          )
        )}
      </TableBody>
    </Table>
  );
};

export default ServiceOrderTable;
