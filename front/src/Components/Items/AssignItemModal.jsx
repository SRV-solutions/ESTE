import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    List,
    ListItem,
    ListItemText,
    IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

const apiUrl = import.meta.env.VITE_API_URL;

const AssignItemModal = ({ open, onClose, selectedItem, fetchItems,fetchAvalibleStoreItems, items, onAssign }) => {
    const [selectedItems, setSelectedItems] = useState([]);        
    useEffect(() => {
        if (!open) {
            setSelectedItems([]);
        }
    }, [open]);


    useEffect(() => {
        fetchItems();
        fetchAvalibleStoreItems()
    }, []);

    const handleSelectItem = (event, newValue) => {
        
        if (newValue && !selectedItems.some(i => i.id === newValue.id)) {            
            setSelectedItems([...selectedItems, newValue]);
        }
    };

    const handleRemoveItem = (id) => {
        setSelectedItems(selectedItems.filter(i => i.id !== id));
    };

    const handleConfirm = () => {
        fetchItems();
        fetchAvalibleStoreItems()
        onAssign(selectedItems);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Asignar Ítems a {selectedItem?.code}</DialogTitle>
            <DialogContent>
                <Typography variant="body1">
                    Selecciona los ítems almacenables para asignar a este contenedor:
                </Typography>

                <Autocomplete
                    options={items.filter(item => item.Category.isStorable)}
                    getOptionLabel={(item) => `${item.code} - ${item.Category.name}`}
                    onChange={handleSelectItem}
                    renderInput={(params) => <TextField {...params} label="Seleccionar Ítem" />}
                    fullWidth
                    sx={{ mt: 2 }}
                />

                {selectedItems.length > 0 && (
                    <List>
                        {selectedItems.map((item) => (
                            <ListItem
                                key={item.id}
                                secondaryAction={
                                    <IconButton edge="end" onClick={() => handleRemoveItem(item.id)}>
                                        <DeleteIcon />
                                    </IconButton>
                                }
                            >
                                <ListItemText primary={`${item.code} - ${item.Category.name}`} />
                            </ListItem>
                        ))}
                    </List>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="secondary">
                    Cancelar
                </Button>
                <Button onClick={handleConfirm} color="primary" disabled={selectedItems.length === 0}>
                    Asignar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AssignItemModal;
