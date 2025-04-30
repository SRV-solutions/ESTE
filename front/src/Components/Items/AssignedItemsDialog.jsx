import React from "react";
import axios from 'axios'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";
const apiUrl = import.meta.env.VITE_API_URL;

const AssignedItemsDialog = ({
    open,
    onClose,
    assignedItems,
    selectedItem,
    getAuthHeaders,
    fetchItems,
    fetchAvalibleStoreItems,
    deleteItemRole
}) => {
    const onDelete = async (item) => {
        try {
            await axios.delete(`${apiUrl}/store-items/${selectedItem.id}/${item.StoreItemChild.id}`, {
                headers: getAuthHeaders(),
            });
            onClose()
            fetchItems()
            fetchAvalibleStoreItems()
        } catch (error) {
            console.error("Error en la eliminación:", error);
        }
    };
    return (
        <Dialog open={open} onClose={onClose}>
            <DialogTitle>Ítems asignados a {selectedItem?.code}</DialogTitle>
            <DialogContent>
                {assignedItems.length > 0 ? (
                    assignedItems.map((item) => (
                        <Typography key={item.StoreItemChild.code} style={{ display: 'flex', justifyContent: deleteItemRole ? 'space-around' : 'center', alignItems: 'center' }}>
                            {item.StoreItemChild.code} - {item.StoreItemChild.Category.name}
                            {deleteItemRole && <Button onClick={() => onDelete(item)} sx={{ backgroundColor: 'red', color: 'black', margin: '0.1rem', fontWeight: 'bold' }}>
                                Eliminar
                            </Button>}
                        </Typography>
                    ))
                ) : (
                    <Typography>No hay ítems asignados.</Typography>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default AssignedItemsDialog;
