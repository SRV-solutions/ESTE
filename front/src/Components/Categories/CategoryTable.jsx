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
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';
import CategoryModal from './CatgoryModal';
import SnackbarComponent from '../SnackbarComponent';
const apiUrl = import.meta.env.VITE_API_URL;

const CategoryTable = () => {
    // 📊 Estados
    const [categories, setCategories] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState({});
    const [alertInfo, setAlertInfo] = useState({
        open: false,
        message: ``,
        severity: `info`,
    });
    const handleCloseAlert = () => {
        setAlertInfo((prev) => ({ ...prev, open: false }));
    };
    // 📥 Cargar categorías al montar el componente
    useEffect(() => {
        fetchCategories();
    }, []);

    // 🔑 Obtener headers de autenticación
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');
        return { Authorization: `Bearer ${token}` };
    };

    // 📤 Fetch de categorías
    const fetchCategories = async () => {
        try {
            const { data } = await axios.get(`${apiUrl}/categories`, {
                headers: getAuthHeaders(),
            });
            setCategories(data);
        } catch (error) {
            showAlert('Error al querer cargar las categorias', `error`);
            console.error('Error fetching categories:', error);
        }
    };

    const showAlert = (message, severity = `info`) => {
        setAlertInfo({ open: true, message, severity });
    };

    const handleSaveCategory = async () => {
        try {
            if (selectedCategory.id) {
                await axios.patch(`${apiUrl}/categories/${selectedCategory.id}`, selectedCategory, {
                    headers: getAuthHeaders(),
                });
            } else {
                await axios.post(`${apiUrl}/categories`, selectedCategory, {
                    headers: getAuthHeaders(),
                });
            }
            showAlert(selectedCategory.id ? `Categoria editada correctamente` : 'Categoria Creada Correctamente', `success`);
            fetchCategories();
            setOpenDialog(false);
            setSelectedCategory({});
        } catch (error) {            
            showAlert(selectedCategory.id ? `Error al modificar la categoria: ${selectedCategory.code}, Error: ${error.message}` : `Error al crear una categoria: ${error.message}`, `error`);
            console.error('Error saving category:', error);
        }
    };

    // 🗑️ Eliminar categoría
    const handleDeleteCategory = async (id) => {
        try {
            await axios.delete(`${apiUrl}/categories/${id}`, {
                headers: getAuthHeaders(),
            });
            fetchCategories();
            showAlert(`Categoria Eliminada con Exito`, `success`);
        } catch (error) {
            showAlert(`Error al querer eliminar una categoria: ${error.response.data.message ? error.response.data.message : error.message}`, `error`);
            console.error('Error deleting category:', error);
        }
    };

    // 🟢 Abrir Modal para crear/editar
    const handleOpenDialog = (category = {}) => {
        setSelectedCategory(category);
        setOpenDialog(true);
    };

    return (
        <div style={{ margin: '3rem' }}>
            {/* 📝 Título */}
            <Typography variant="h4" gutterBottom>
                Gestión de Categorías
            </Typography>

            {/* ➕ Botón para crear una nueva categoría */}
            <Button
                variant="contained"
                color="primary"
                onClick={() => handleOpenDialog()}
            >
                Crear Nueva Categoría
            </Button>

            {/* 📊 Tabla de categorías */}
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell align="center">Codigo</TableCell>
                        <TableCell align="center">NOMBRE</TableCell>
                        <TableCell align="center">DESCRIPCIÓN</TableCell>
                        <TableCell align="center">TIPO</TableCell>
                        <TableCell align="center">E.A</TableCell>
                        <TableCell align="center">E.C</TableCell>
                        <TableCell align="center">ACCIONES</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {categories.map((category) => (
                        <TableRow key={category.id}>
                            <TableCell align="center">{category.code}</TableCell>
                            <TableCell align="center">{category.name}</TableCell>
                            <TableCell align="center">{category.description}</TableCell>
                            <TableCell align="center">{category.type}</TableCell>
                            <TableCell align="center">{category.isStorable ? 'SI' : 'NO'}</TableCell>
                            <TableCell align="center">{category.isContainer ? 'SI' : 'NO'}</TableCell>
                            <TableCell align="center">

                                <IconButton onClick={() => handleOpenDialog(category)}>
                                    <EditIcon />
                                </IconButton>
                                <IconButton onClick={() => handleDeleteCategory(category.id)}>
                                    <DeleteIcon />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <SnackbarComponent
                open={alertInfo.open}
                message={alertInfo.message}
                severity={alertInfo.severity}
                onClose={handleCloseAlert}
            />
            {/* 📦 Modal */}
            <CategoryModal
                open={openDialog}
                onClose={setOpenDialog}
                onSave={handleSaveCategory}
                itemData={selectedCategory}
                setItemData={setSelectedCategory}
                categories={categories}
            />
        </div>
    );
};

export default CategoryTable;
