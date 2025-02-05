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
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import ItemModal from './ItemModal';
const apiUrl = import.meta.env.VITE_API_URL;

const initialNewItem = {
    name: '',
    description: '',
    type: '',
    isStorable: false,
    isContainer: false
};

const ItemTable = () => {
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [newItem, setNewItem] = useState(initialNewItem);

    useEffect(() => {
        fetchItems();
        fetchCategories();
    }, []);

    useEffect(() => {
        items.forEach((item) => {
            if (item.code) {
                console.log(item.code);
                
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
            console.error('Error fetching items:', error);
        }
    };

    const handleOpenDialog = () => setOpenDialog(true);
    const handleCloseDialog = () => {
        setOpenDialog(false);
        setNewItem(initialNewItem);
    };

    const handleCreateItem = async () => {
        try {
            await axios.post(`${apiUrl}/items`, newItem, {
                headers: getAuthHeaders(),
            });
            fetchItems();
            fetchCategories();
            handleCloseDialog();
        } catch (error) {
            console.error('Error creating item:', error);
        }
    };

    const handleDeleteItem = async (selectedItemId) => {
        if (selectedItemId) {
            try {
                await axios.delete(`${apiUrl}/items/${selectedItemId}`, {
                    headers: getAuthHeaders(),
                });
                fetchItems();
            } catch (error) {
                console.error('Error deleting item:', error);
            }
        }
    };

    return (
        <div style={{ margin: '3rem' }}>
            <Typography variant="h4" gutterBottom>
                Gestión de Ítems
            </Typography>

            <Button variant="contained" color="primary" onClick={handleOpenDialog}>
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
                        <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell align="center">
                                <svg id={`barcode-${item.id}`}></svg>
                            </TableCell>
                            <TableCell align="center">
                               {item.code}
                            </TableCell>
                            <TableCell align="center">{item.Category.name}</TableCell>
                            <TableCell align="center">{item.Category.description}</TableCell>
                            <TableCell align="center">{item.Category.type}</TableCell>
                            <TableCell align="center">{item.Category.isStorable ? 'SI' : 'NO'}</TableCell>
                            <TableCell align="center">{item.Category.isContainer ? 'SI' : 'NO'}</TableCell>
                            <TableCell align="center">
                                <IconButton onClick={() => handleDeleteItem(item.id)}>
                                    <DeleteIcon />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <ItemModal
                open={openDialog}
                onClose={handleCloseDialog}
                onSave={handleCreateItem}
                itemData={newItem}
                setItemData={setNewItem}
                categories={categories}
            />
        </div>
    );
};

export default ItemTable;
