import React, { useEffect, useState } from 'react';
import JsBarcode from 'jsbarcode';
import {
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Typography,
    Button,
    IconButton,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import axios from 'axios';
import ItemModal from './ItemModal';
import AssignItemModal from './AssignItemModal'; // Importa el modal
import AssignedItemsDialog from './AssignedItemsDialog'

const apiUrl = import.meta.env.VITE_API_URL;

const ItemTable = () => {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', description: '', type: '', isStorable: false, isContainer: false });
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [assignedItems, setAssignedItems] = useState([]); // Estado para los ítems asignados
    const [openAssignedItemsDialog, setOpenAssignedItemsDialog] = useState(false); // Estado para mostrar el modal de ítems asignados
    const [openAssignModal, setOpenAssignModal] = useState(false);
    const [avalibleStoreItems, setAvalibleStoreItems] = useState([]);

    const initialNewItem = {
        name: '',
        description: '',
        type: '',
        isStorable: false,
        isContainer: false
    };
    useEffect(() => {
        fetchItems();
        fetchCategories();
    }, []);

    useEffect(() => {
        items.forEach((item) => {
            if (item.code) {
                JsBarcode(`#barcode-${item.id}`, item.code, {
                    format: 'CODE128',
                    displayValue: false,
                    height: 40,
                    width: 1.5
                });
            }
        });
    }, [items]);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');
        return { Authorization: `Bearer ${token}` };
    };

    const fetchItems = async () => {
        try {
            const { data } = await axios.get(`${apiUrl}/items`, {
                headers: getAuthHeaders(),
            });
            setItems(data);
        } catch (error) {
            console.error('Error fetching items:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data } = await axios.get(`${apiUrl}/categories`, {
                headers: getAuthHeaders(),
            });
            setCategories(data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleMenuOpen = (event, item) => {
        setMenuAnchor(event.currentTarget);
        setSelectedItem(item);
    };


    const handleCreateItem = async () => {
        try {
            await axios.post(`${apiUrl}/items`, newItem, {
                headers: getAuthHeaders(),
            });
            fetchItems();
            fetchCategories();
            setOpenDialog(false);
        } catch (error) {
            console.error('Error creating item:', error);
        }
    };
    const handleMenuClose = () => {
        setMenuAnchor(null);
        //setSelectedItem(null);
    };

    const handleDeleteItem = async () => {
        if (selectedItem?.id) {
            // Mostrar el mensaje de confirmación
            const confirmDelete = window.confirm("¿Estás seguro de que deseas eliminar este ítem?");
            if (!confirmDelete) return; // Si el usuario cancela, no se hace nada

            try {
                await axios.delete(`${apiUrl}/items/${selectedItem.id}`, {
                    headers: getAuthHeaders(),
                });
                handleMenuClose();
                fetchItems();
            } catch (error) {
                console.error('Error deleting item:', error);
            }
        }
    };

    const fetchAvalibleStoreItems = async () => {
        try {
            const { data } = await axios.get(`${apiUrl}/items/avalible/store`, {
                headers: getAuthHeaders(),
            });
            setAvalibleStoreItems(data);
        } catch (error) {
            console.error('Error al obtener los ítems:', error);
        }
    };

    const handleAssignedItemsContainer = async () => {
        if (!selectedItem) return;

        setAssignedItems(selectedItem.StoreItemParent || []); // Guardar los ítems asignados en el estado
        setOpenAssignedItemsDialog(true); // Abrir el modal con la lista de ítems
        handleMenuClose();
    };

    const handleAssignItemsToContainer = () => {
        setOpenAssignModal(true);
        handleMenuClose()
    };

    const handleAssignConfirm = async (assignedItems) => {
        try {
            await axios.post(`${apiUrl}/store-items`, {
                itemIdParent: selectedItem.id,
                itemIdsChild: assignedItems.map(item => item.id),
            }, { headers: getAuthHeaders() });
            fetchAvalibleStoreItems()
            fetchItems(); // Actualiza la lista de ítems después de asignar
        } catch (error) {
            console.error('Error assigning items:', error);
        }
    };
    return (
        <div style={{ margin: '3rem' }}>
            <Typography variant="h4" gutterBottom>
                Gestión de Ítems
            </Typography>

            <Button variant="contained" color="primary" onClick={() => setOpenDialog(true)}>
                Crear Nuevo Ítem
            </Button>

            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell align="center">Código de barras</TableCell>
                        <TableCell align="center">Código</TableCell>
                        <TableCell align="center">Nombre</TableCell>
                        <TableCell align="center">Descripción</TableCell>
                        <TableCell align="center">Tipo</TableCell>
                        <TableCell align="center">E.A</TableCell>
                        <TableCell align="center">E.C</TableCell>
                        <TableCell align="center">Cantidad de items almacenados</TableCell>
                        <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell align="center">
                                <svg id={`barcode-${item.id}`}></svg>
                            </TableCell>
                            <TableCell align="center">{item.code}</TableCell>
                            <TableCell align="center">{item.Category.name}</TableCell>
                            <TableCell align="center">{item.Category.description}</TableCell>
                            <TableCell align="center">{item.Category.type}</TableCell>
                            <TableCell align="center">{item.Category.isStorable ? 'SI' : 'NO'}</TableCell>
                            <TableCell align="center">{item.Category.isContainer ? 'SI' : 'NO'}</TableCell>
                            <TableCell align="center">{item.Category.isContainer && item.StoreItemParent ? item.StoreItemParent.length : !item.Category.isContainer ? 'No Aplica' : 0}</TableCell>
                            <TableCell align="center">
                                <IconButton onClick={(event) => handleMenuOpen(event, item)}>
                                    <MoreVertIcon />
                                </IconButton>
                                {selectedItem?.id === item.id && (
                                    <Menu
                                        anchorEl={menuAnchor}
                                        open={Boolean(menuAnchor)}
                                        onClose={handleMenuClose}
                                    >
                                        <MenuItem onClick={handleDeleteItem}>Eliminar</MenuItem>
                                        {item.Category.isContainer && (
                                            <MenuItem onClick={handleAssignedItemsContainer}>
                                                Ver Ítems asignados
                                            </MenuItem>
                                        )}
                                        {item.Category.isContainer && (
                                            <MenuItem onClick={handleAssignItemsToContainer}>
                                                Asignar Ítems al contenedor
                                            </MenuItem>

                                        )}
                                    </Menu>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <AssignItemModal
                open={openAssignModal}
                onClose={() => setOpenAssignModal(false)}
                selectedItem={selectedItem}
                onAssign={handleAssignConfirm}
                getAuthHeaders={getAuthHeaders}
                fetchAvalibleStoreItems={fetchAvalibleStoreItems}
                fetchItems={fetchItems}
                items={avalibleStoreItems}
            />
            <ItemModal
                open={openDialog}
                onClose={setOpenDialog}
                onSave={handleCreateItem}
                itemData={newItem}
                setItemData={setNewItem}
                categories={categories}
            />
            <AssignedItemsDialog
                open={openAssignedItemsDialog}
                onClose={() => setOpenAssignedItemsDialog(false)}
                assignedItems={assignedItems}
                selectedItem={selectedItem}
                getAuthHeaders={getAuthHeaders}
                fetchAvalibleStoreItems={fetchAvalibleStoreItems}
                fetchItems={fetchItems}

            />;
        </div>
    );
};

export default ItemTable;
