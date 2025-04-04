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
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import axios from 'axios';
import ItemModal from './ItemModal';
import AssignItemModal from './AssignItemModal'; // Importa el modal
import AssignedItemsDialog from './AssignedItemsDialog'
import SnackbarComponent from '../SnackbarComponent';
import UploadCSVComponent from '../UploadCSVComponent';
const apiUrl = import.meta.env.VITE_API_URL;

const ItemTable = () => {
    const [items, setItems] = useState([]);
    const [page, setPage] = useState(1);
    const [limit, _setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [totalPages, setTotalPages] = useState(1);
    const [categories, setCategories] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [newItem, setNewItem] = useState({ name: '', description: '', type: '', isStorable: false, isContainer: false });
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [assignedItems, setAssignedItems] = useState([]); // Estado para los ítems asignados
    const [openAssignedItemsDialog, setOpenAssignedItemsDialog] = useState(false); // Estado para mostrar el modal de ítems asignados
    const [openAssignModal, setOpenAssignModal] = useState(false);
    const [avalibleStoreItems, setAvalibleStoreItems] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [alertInfo, setAlertInfo] = useState({
        open: false,
        message: ``,
        severity: `info`,
    });
    const [isLoading, setIsLoading] = useState(false); // 🕒 Estado para el loading


    const handleCloseAlert = () => {
        setAlertInfo((prev) => ({ ...prev, open: false }));
    };
    const showAlert = (message, severity = `info`) => {
        setAlertInfo({ open: true, message, severity });
    };
    useEffect(() => {
        fetchItems();
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchItems();
    }, [page, limit, search, selectedCategory]); // ← Ahora también escucha cambios en `search`

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
            const params = { page, limit, search };

            if (selectedCategory) {
                params.category = selectedCategory;  // Agrega el filtro por categoría
            }
            const { data } = await axios.get(`${apiUrl}/items`, {
                headers: getAuthHeaders(),
                params,
            });
            setItems(data.items);
            setTotalPages(data.totalPages);
        } catch (error) {
            showAlert(`Error al cargar los items ${error}`, `error`);

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
            showAlert(`Error al cargar las categorias ${error}`, `error`);

            console.error('Error fetching categories:', error);
        }
    };

    const handleMenuOpen = (event, item) => {
        setMenuAnchor(event.currentTarget);
        setSelectedItem(item);
    };

    const handleCreateItem = async () => {
        try {
            setIsLoading(true); // ⏳ Activa el loader

            await axios.post(`${apiUrl}/items`, newItem, {
                headers: getAuthHeaders(),
            });
            setIsLoading(false); // ✅ Desactiva el loader

            fetchItems();
            fetchCategories();
            fetchAvalibleStoreItems()
            setOpenDialog(false);
            showAlert(`Items creados con exito`, `success`);

        } catch (error) {
            showAlert(`Error al crear los items ${error}`, `error`);
            console.error('Error creating item:', error);
        }
    };

    const handleMenuClose = () => {
        setMenuAnchor(null);
    };

    const handleToggleItemStatus = async () => {
        if (!selectedItem?.id) {
            showAlert("El ítem no está seleccionado o no existe.", "error");
            return;
        }
    
        try {
            const itemToToggle = selectedItem;
    
            // Si el ítem está activo, mostrar confirmación antes de desactivarlo
            if (itemToToggle.isActive) {
                const confirmDeactivate = window.confirm("¿Estás seguro de que deseas desactivar este ítem?");
                if (!confirmDeactivate) return;
    
                // Desactivar el ítem (actualizando el estado)
                await axios.patch(`${apiUrl}/items/${itemToToggle.id}`, 
                    { isActive: false }, // Aquí desactivamos el ítem
                    { headers: getAuthHeaders() }
                );
                showAlert("Ítem desactivado con éxito", "success");
            } else {
                // Si el ítem está desactivado, activarlo sin confirmación
                await axios.patch(`${apiUrl}/items/${itemToToggle.id}`, 
                    { isActive: true }, // Aquí activamos el ítem
                    { headers: getAuthHeaders() }
                );
                showAlert("Ítem activado con éxito", "success");
            }
    
            // Actualizar la lista de ítems
            fetchItems();
        } catch (error) {
            showAlert(`Error al cambiar el estado del ítem: ${error.response?.data?.message || error.message}`, "error");
            console.error("Error toggling item status:", error);
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
            <UploadCSVComponent
                fetchItems={fetchItems}
                fetchCategories={fetchCategories}
                fetchAvalibleStoreItems={fetchAvalibleStoreItems}
            />
            <SnackbarComponent
                open={alertInfo.open}
                message={alertInfo.message}
                severity={alertInfo.severity}
                onClose={handleCloseAlert}
            />
            <Typography variant="h4" gutterBottom>
                Gestión de Ítems
            </Typography>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>

                    <input

                        type="text"
                        placeholder="Buscar ítem..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            padding: '10px',
                            borderRadius: '5px',
                            border: '1px solid #ccc',
                            width: '300px',
                            margin: '0 2rem 0 0'
                        }}
                    />

                    {/* Filtro por categoría */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        style={{
                            padding: '10px',
                            borderRadius: '5px',
                            border: '1px solid #ccc',
                            width: '200px',
                        }}
                    >
                        <option value="">Seleccionar Categoría</option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>

                <Button variant="contained" color="primary" onClick={() => setOpenDialog(true)}>
                    Crear Nuevo Ítem
                </Button>
            </div>



            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell align="center">Código de barras</TableCell>
                        <TableCell align="center">Código</TableCell>
                        <TableCell align="center">Nombre</TableCell>
                        <TableCell align="center">Descripción</TableCell>
                        <TableCell align="center">Esta Activado</TableCell>
                        <TableCell align="center">Tipo</TableCell>
                        <TableCell align="center">E.A</TableCell>
                        <TableCell align="center">E.C</TableCell>
                        <TableCell align="center">Cantidad de items almacenados</TableCell>
                        <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {items.map((item) => (
                        <TableRow key={item.id} sx={{
                            backgroundColor: item.isActive ? 'transparent' : '#f0f0f0', // Gris claro cuando está desactivada
                        }}>
                            <TableCell align="center">
                                <svg id={`barcode-${item.id}`}></svg>
                            </TableCell>
                            <TableCell align="center">{item.code}</TableCell>
                            <TableCell align="center">{item.Category.name}</TableCell>
                            <TableCell align="center">{item.Category.description}</TableCell>
                            <TableCell align="center">{item.isActive ? 'SI' : 'NO'}</TableCell>
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
                                        <MenuItem onClick={handleToggleItemStatus}>
                                            {item.isActive ? 'Desactivar Item' : 'Activar Item'}
                                        </MenuItem>
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
                isLoading={isLoading}
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
            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                <Button
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                >
                    Anterior
                </Button>

                {/* Mostrar siempre las primeras 5 páginas y la última */}
                <Button onClick={() => setPage(1)} disabled={page === 1}>
                    1
                </Button>

                {/* Si la página actual está más allá de la página 3, mostrar puntos suspensivos */}
                {page > 3 && <Typography variant="body1">...</Typography>}

                {/* Mostrar las 3 páginas cercanas a la actual */}
                {page - 1 > 1 && <Button onClick={() => setPage(page - 1)}>{page - 1}</Button>}
                <Button
                    style={{ backgroundColor: '#3f51b5', color: 'white' }}
                    onClick={() => setPage(page)}
                >
                    {page}
                </Button>
                {page + 1 < totalPages && <Button onClick={() => setPage(page + 1)}>{page + 1}</Button>}

                {/* Mostrar los puntos suspensivos si hay más páginas después */}
                {page < totalPages - 2 && <Typography variant="body1">...</Typography>}

                {/* Mostrar la última página */}
                <Button onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                    {totalPages}
                </Button>

                <Button
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={page >= totalPages}
                >
                    Siguiente
                </Button>
            </div>

        </div>
    );
};

export default ItemTable;
