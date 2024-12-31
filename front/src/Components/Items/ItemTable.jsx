import React, { useEffect, useState } from 'react';
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

// ✅ Estados iniciales para nuevos ítems
const initialNewItem = {
    name: '',
    description: '',
    type: '',
};

const ItemTable = () => {
    // 📊 Estados
    const [items, setItems] = useState([]);
    const [categories, setCategories] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [newItem, setNewItem] = useState(initialNewItem);

    // 📥 Efecto para cargar los ítems al montar el componente
    useEffect(() => {
        fetchItems();
        fetchCategories();
    }, []);

    // 🔑 Obtener headers de autenticación
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');
        return { Authorization: `Bearer ${token}` };
    };

    // 📤 Fetch de ítems
    const fetchItems = async () => {
        try {
            const { data } = await axios.get('http://localhost:3000/items', {
                headers: getAuthHeaders(),
            });
            setItems(data);
        } catch (error) {
            console.error('Error fetching items:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const { data } = await axios.get('http://localhost:3000/categories', {
                headers: getAuthHeaders(),
            });
            setCategories(data);
        } catch (error) {
            console.error('Error fetching items:', error);
        }
    };

    // 🟢 Abrir el modal
    const handleOpenDialog = () => {
        setOpenDialog(true);
    };

    // 🔴 Cerrar el modal
    const handleCloseDialog = () => {
        setOpenDialog(false);
        setNewItem(initialNewItem);
    };

    // 📝 Crear nuevo ítem
    const handleCreateItem = async () => {
        try {
            await axios.post('http://localhost:3000/items', newItem, {
                headers: getAuthHeaders(),
            });
            fetchItems();
            fetchCategories();
            handleCloseDialog();
        } catch (error) {
            console.error('Error creating item:', error);
        }
    };

    // 🗑️ Eliminar ítem
    const handleDeleteItem = async (selectedItemId) => {
        if (selectedItemId) {
            try {
                await axios.delete(`http://localhost:3000/items/${selectedItemId}`, {
                    headers: getAuthHeaders(),
                });
                fetchItems();
            } catch (error) {
                console.error('Error deleting item:', error);
            }
        }
    };


    return (
        <div style={{
            margin: '3rem'
        }}>
            {/* 📝 Título */}
            <Typography variant="h4" gutterBottom>
                Gestión de Ítems
            </Typography>

            {/* ➕ Botón para crear un nuevo ítem */}
            <Button
                variant="contained"
                color="primary"
                onClick={handleOpenDialog}
            >
                Crear Nuevo Ítem
            </Button>

            {/* 📊 Tabla de ítems */}
            <Table>
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
                    {items.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>{item.id}</TableCell>
                            <TableCell align="center">{item.Category.name}</TableCell>
                            <TableCell align="center">{item.Category.description}</TableCell>
                            <TableCell align="center">{item.Category.type}</TableCell>
                            <TableCell align="center">{item.Category.isStorable ? 'SI' : 'NO'}</TableCell>
                            <TableCell align="center">{item.Category.isContainer ? 'SI' : 'NO'}</TableCell>
                            <TableCell align="center">
                                <IconButton
                                onClick={() => handleDeleteItem(item.id)}
                                >
                                    <DeleteIcon />
                                </IconButton>
                               
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* 📦 Modal */}
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
