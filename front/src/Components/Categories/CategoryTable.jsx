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
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
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

    const handleToggleCategoryStatus = async (id) => {
        try {
            const categoryToToggle = categories.find(category => category.id === id);
    
            if (!categoryToToggle) {
                showAlert("La categoría no existe o ya fue eliminada.", "error");
                return;
            }
    
            // Si la categoría está activa y tiene ítems relacionados, mostrar confirmación antes de desactivarla
            if (categoryToToggle.isActive) {
                const message = categoryToToggle.Items?.length
                    ? `Esta categoría contiene ${categoryToToggle.Items.length} ítems. ¿Estás seguro de que deseas desactivarla?`
                    : "¿Estás seguro de que deseas desactivar esta categoría?";
    
                const warning = "Este botón solamente desactiva la categoría, no la elimina. Para eliminar una categoría completamente contacte con el administrador. \n\r";
    
                const confirmDeactivate = window.confirm(warning + message);
                if (!confirmDeactivate) return;
    
                // Desactivar la categoría (actualizando el estado)
                await axios.delete(`${apiUrl}/categories/${id}`, {
                    headers: getAuthHeaders(),
                });
                showAlert("Categoría desactivada con éxito", "success");
            } else {
                // Si está desactivada, activarla sin confirmación
                await axios.delete(`${apiUrl}/categories/${id}`, {
                    headers: getAuthHeaders(),
                });
                showAlert("Categoría activada con éxito", "success");
            }
    
            fetchCategories(); // Actualizar la lista de categorías
        } catch (error) {
            showAlert(`Error al cambiar el estado de la categoría: ${error.response?.data?.message || error.message}`, "error");
            console.error("Error toggling category status:", error);
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
                        <TableCell align="center">CANTIDAD DE ITEMS</TableCell>
                        <TableCell align="center">ESTA ACTIVADA</TableCell>
                        <TableCell align="center">TIPO</TableCell>
                        <TableCell align="center">E.A</TableCell>
                        <TableCell align="center">E.C</TableCell>
                        <TableCell align="center">ACCIONES</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {categories.map((category) => (
                       <TableRow
                       key={category.id}
                       sx={{
                         backgroundColor: category.isActive ? 'transparent' : '#f0f0f0', // Gris claro cuando está desactivada
                       }}
                     >
                       <TableCell align="center">{category.code}</TableCell>
                       <TableCell align="center">{category.name}</TableCell>
                       <TableCell align="center">{category.description}</TableCell>
                       <TableCell align="center">{category.Items?.length}</TableCell>
                       <TableCell align="center">{category.isActive ? 'SI' : 'NO'}</TableCell>
                       <TableCell align="center">{category.type}</TableCell>
                       <TableCell align="center">{category.isStorable ? 'SI' : 'NO'}</TableCell>
                       <TableCell align="center">{category.isContainer ? 'SI' : 'NO'}</TableCell>
                       <TableCell align="center">
                         <IconButton onClick={() => handleOpenDialog(category)}>
                           <EditIcon />
                         </IconButton>
                         <IconButton onClick={() => handleToggleCategoryStatus(category.id)}>
                           {category.isActive ? <ToggleOnIcon color='info'/> : <ToggleOffIcon color='error'/>}
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
