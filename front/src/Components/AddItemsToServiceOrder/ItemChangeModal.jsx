import React, { useEffect, useState } from 'react';
import { Modal, Button, TextField, Box, Typography, Autocomplete } from '@mui/material';
import styles from './style.module.css';
import axios from 'axios'
const apiUrl = import.meta.env.VITE_API_URL;


const ItemChangeModal = ({ open, onClose, selectedItem, allItems, serviceOrder, getAuthHeaders, fetchServiceOrder }) => {
  const [itemName, setItemName] = useState('');
  const [categoryItems, setCategoryItems] = useState([])

  const handleSave = async () => {
    try {
      if (!serviceOrder?.id || !selectedItem?.id) {
        return;
      }

      const searchedItem = categoryItems.find(item => item.code === itemName);
      if (!searchedItem?.id) {
        return;
      }      

      // Verificar si el item seleccionado es un contenedor
      if (selectedItem?.Category?.isContainer && selectedItem?.StoreItemParentItem?.length > 0 && selectedItem?.isTemporalContainer) {
        await axios.put(
          `${apiUrl}/service-order-items/container/${serviceOrder.id}/${selectedItem.id}/${searchedItem.id}`,
          {},
          { headers: getAuthHeaders() }
        );

      } else {
        await axios.put(
          `${apiUrl}/service-order-items/${serviceOrder.id}/${selectedItem.id}/${searchedItem.id}`,
          {},
          { headers: getAuthHeaders() }
        );
      }

      setItemName("");
      await onClose();
      await fetchServiceOrder();
    } catch (error) {
    }
  };




  const fetchItems = async () => {
    const filteredItems = allItems.filter((item) => item.Category.id === selectedItem.Category.id)
    setCategoryItems(filteredItems)
  }

  useEffect(() => {
    fetchItems()
  }, [open])

  return (
    <Modal open={open} onClose={onClose} className={styles.modalOverlay}>
      <Box className={styles.modalContent}>
        {selectedItem && (
          <Box mt={2}>
            <Typography variant="h6">Información del Item Seleccionado:</Typography>
            <Typography variant="body1"><strong>Nombre:</strong> {selectedItem.Category.name}</Typography>
            <Typography variant="body1"><strong>Código:</strong> {selectedItem.code}</Typography>
            {/* Puedes agregar más detalles del item aquí según lo que necesites */}
          </Box>
        )}
        <Typography variant="h6">Busque el nuevo Item a Cargar</Typography>
        <Autocomplete
          value={itemName || "-"}
          onChange={(event, newValue) => setItemName(newValue)}
          inputValue={itemName}
          onInputChange={(event, newInputValue) => setItemName(newInputValue)}
          options={categoryItems?.map((item) => item.code)} // Filtra los nombres o códigos de los items
          renderInput={(params) => <TextField {...params} label="Código o Nombre del item" fullWidth />}
          getOptionLabel={(option) => option} // Muestra los nombres o códigos de los items
        />
        <div className={styles.buttons}>
          <Button style={{
            margin: '1rem'
          }} onClick={handleSave} variant="contained">Guardar</Button>
          <Button style={{
            margin: '1rem'
          }} onClick={onClose} variant="outlined">Cancelar</Button>
        </div>
      </Box>
    </Modal>
  );
};

export default ItemChangeModal;
