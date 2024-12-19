import React, { useEffect, useState } from 'react';
import {
    TableCell,
    TableContainer,
    TableRow,
    Paper,
    Button,
    IconButton,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    MenuItem,
    Select,
    FormControl,
    InputLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ServiceOrderHeader from './ServiceOrderHeader';
import ServiceOrderTable from './ServiceOrderTable';

const AddItemsToServiceOrder = () => {
    const { id } = useParams();

    const [serviceOrder, setServiceOrder] = useState({
        Event: {},
        OrderedBy: { username: '' },
        DeployedBy: { username: '' },
        CheckedBy: { username: '' },
        ServiceOrderItems: [],
    });
    const [alertInfo, setAlertInfo] = useState({
        open: false,
        message: '',
        severity: 'info',
    });
    const [allItems, setAllItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [selectedStoreItem, setSelectedStoreItem] = useState(null);
    const [quantityToStore, setQuantityToStore] = useState(1);
    const [quantity, setQuantity] = useState(1);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(serviceOrder.status);

    useEffect(() => {
        fetchItems();
        fetchServiceOrder();
    }, [id]);

    const userData = JSON.parse(localStorage.getItem('userData'));

    const canEditOrder = () => {
        // El creador puede editar si el estado es 'created'
        if (userData.isAdmin) {
            return true
        }
        if (
            userData.email === serviceOrder.OrderedBy.email &&
            serviceOrder.status === 'created'
        ) {
            return true;
        }

        // El encargado del armado puede editar si el estado es 'approved' o 'in_process'
        if (
            userData.email === serviceOrder.DeployedBy.email &&
            (serviceOrder.status === 'approved' || serviceOrder.status === 'in_process')
        ) {
            return true;
        }

        // El chequeador nunca puede editar
        if (userData.email === serviceOrder.CheckedBy.email && serviceOrder.status === 'in_review') {
            return true;
        }
        if (userData.email === serviceOrder.CheckedBy.email) {
            return false;
        }

        // Por defecto, no puede editar
        return false;
    };


    const handleConfirmDeleteAllItems = () => {
        setConfirmDialogOpen(true);
    };

    const handleCancelDelete = () => {
        setConfirmDialogOpen(false);
    };

    const handleConfirmDelete = () => {
        setConfirmDialogOpen(false);
        handleDeleteAllItems();
    };

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');
        return { Authorization: `Bearer ${token}` };
    };

    const showAlert = (message, severity = 'info') => {
        setAlertInfo({ open: true, message, severity });
    };

    const fetchItems = async () => {
        try {
            const { data } = await axios.get('http://localhost:3000/items', {
                headers: getAuthHeaders(),
            });
            setAllItems(data);
        } catch (error) {
            console.error('Error al cargar los ítems:', error);
        }
    };

    const fetchServiceOrder = async () => {
        try {
            const { data } = await axios.get(`http://localhost:3000/service-orders/${id}`, {
                headers: getAuthHeaders(),
            });

            setServiceOrder(data);
        } catch (error) {
            console.error('Error al cargar la orden de servicio:', error);
        }
    };

    const handleAddItem = async () => {
        if (!selectedItem || quantity <= 0) return;

        try {
            const response = await axios.post(
                'http://localhost:3000/service-order-items/bulk',
                {
                    serviceOrderId: Number(id),
                    categoryId: selectedItem.Category.id,
                    quantity,
                },
                { headers: getAuthHeaders() }
            );

            if (response.status === 201) {
                setServiceOrder((prev) => ({
                    ...prev,
                    ServiceOrderItems: [...prev.ServiceOrderItems, { Item: selectedItem, quantity }],
                }));
                setSelectedItem(null);
                setQuantity(1);
                fetchServiceOrder();
                showAlert('Ítem agregado correctamente', 'success');
            }
        } catch (error) {
            showAlert(error.response?.data?.message || 'Error al agregar el ítem', 'error');
        }
    };

    const handleDeleteItem = async (itemId, itemIdParent) => {
        try {
            if (itemIdParent) {
                const response = await axios.delete(
                    `http://localhost:3000/service-order-store-items/${id}/${itemIdParent}/${itemId}`,
                    { headers: getAuthHeaders() }
                );

                if (response.status === 200) {
                    fetchServiceOrder();
                    showAlert('Ítem eliminado correctamente', 'success');
                }
                return;
            }

            const response = await axios.delete(
                `http://localhost:3000/service-order-items/${id}/${itemId}`,
                { headers: getAuthHeaders() }
            );

            if (response.status === 200) {
                fetchServiceOrder();
            }
        } catch (error) {
            console.error('Error al eliminar el ítem:', error);
            showAlert(error.response?.data?.message || 'Error al eliminar el ítem', 'error');
        }
    };

    const handleDeleteAllItems = async () => {
        try {
            const response = await axios.delete(`http://localhost:3000/service-order-items/${id}`, {
                headers: getAuthHeaders(),
            });

            if (response.status === 200) {
                fetchServiceOrder();
                showAlert('Todos los ítems fueron eliminados correctamente', 'success');
            }
        } catch (error) {
            console.error('Error al eliminar todos los ítems:', error);
            showAlert(error.response?.data?.message || 'Error al eliminar ítems', 'error');
        }
    };

    const handleCloseAlert = () => {
        setAlertInfo((prev) => ({ ...prev, open: false }));
    };

    const handleAddItemToStore = async (storeItemId) => {
        if (!selectedStoreItem || quantityToStore <= 0) return;

        try {
            const itemIdParent = storeItemId;

            const itemChildren = allItems.filter(item => item.Category.id === selectedStoreItem.Category.id);

            if (itemChildren.length < quantityToStore) {
                showAlert('No hay suficientes ítems disponibles en esta categoría', 'error');
                return;
            }

            const storeItemData = {
                serviceOrderId: Number(id),
                itemIdParent,
                categoryId: selectedStoreItem.Category.id,
                quantity: quantityToStore,
            };

            const response = await axios.post(
                'http://localhost:3000/service-order-store-items/bulk',
                storeItemData,
                { headers: getAuthHeaders() }
            );

            if (response.status === 201) {
                setServiceOrder((prev) => ({
                    ...prev,
                    ServiceOrderItems: [
                        ...prev.ServiceOrderItems,
                        { Item: selectedStoreItem, quantity: quantityToStore }
                    ],
                }));
                showAlert('Ítem agregado correctamente al almacén', 'success');

                setSelectedStoreItem(null);
                setQuantityToStore(1);
                fetchServiceOrder();
            }
        } catch (error) {
            showAlert(error.response?.data?.message || 'Error al agregar el ítem al almacén', 'error');
        }
    };

    const renderTableRows = (item, color, itemIdParent = NaN) => (
        <TableRow key={item.id} sx={{ backgroundColor: color || '' }}>
            <TableCell>{item.id}</TableCell>
            <TableCell align="center">{item.Category.name}</TableCell>
            <TableCell align="center">{item.Category.description}</TableCell>
            <TableCell align="center">{item.Category.type}</TableCell>
            <TableCell align="center">{item.Category.isStorable ? 'SI' : 'NO'}</TableCell>
            <TableCell align="center">{item.Category.isContainer ? 'SI' : 'NO'}</TableCell>
            {canEditOrder() && (
                <TableCell align="center">
                    <IconButton
                        onClick={() => handleDeleteItem(item.id, itemIdParent)}
                        sx={{
                            color: '#757575',
                            '&:hover': {
                                color: '#ff0000',
                                cursor: 'pointer',
                            },
                        }}
                    >
                        <DeleteIcon />
                    </IconButton>
                </TableCell>
            )}
        </TableRow>
    );

    const status = {
        created: 'Creada',
        in_review: 'En Revisión',
        approved: 'Aprobada',
        rejected: 'Rechazada',
        in_process: 'En Proceso',
        ready: 'Lista',
        dispatched: 'Despachada',
        delivered: 'En Viaje de ida',
        returning: 'En Viaje de regreso',
        received: 'Recibido',
        under_review: 'Bajo Revisión',
        disassembled: 'Desarmada',
    };
    const canChangeToStatus = (currentStatus, newStatus) => {
        const statusFlow = [
            'created',
            'in_review',
            'approved',
            'rejected',
            'in_process',
            'ready',
            'dispatched',
            'delivered',
            'returning',
            'received',
            'under_review',
            'disassembled',
        ];
        // Verifica si es admin: puede cambiar a cualquier estado.
        if (userData.isAdmin) {
            return true;
        }

        // Si es usuario común, verifica el flujo.
        const currentIndex = statusFlow.indexOf(currentStatus);
        const nextIndex = statusFlow.indexOf(newStatus);

        // Permite cambios solo al siguiente estado o desde 'rejected' a 'created' para reintentar.
        return (
            nextIndex === currentIndex + 1 ||
            (currentStatus === 'rejected' && newStatus === 'created')
        );
    };

    const handleChangeStatus = async (newStatus) => {
        if (!canChangeToStatus(serviceOrder.status, newStatus)) {
            showAlert(
                'No tienes permiso para cambiar a este estado o el cambio no sigue el flujo permitido.',
                'error'
            );
            return;
        }

        try {
            const response = await axios.patch(
                `http://localhost:3000/service-orders/${id}`,
                { status: newStatus },
                { headers: getAuthHeaders() }
            );

            if (response.status === 200) {
                setServiceOrder((prev) => ({
                    ...prev,
                    status: newStatus,
                }));
                setSelectedStatus(newStatus);
                showAlert('Estado de la orden cambiado correctamente', 'success');
            }
        } catch (error) {
            console.error('Error al cambiar el estado de la orden:', error);
            showAlert(error.response?.data?.message || 'Error al cambiar el estado', 'error');
        }
    };

    return (
        <div style={{ margin: '3%' }}>
            <TableContainer component={Paper} sx={{ padding: 2 }}>
                <ServiceOrderHeader
                    serviceOrder={serviceOrder}
                    allItems={allItems}
                    setSelectedItem={setSelectedItem}
                    selectedItem={selectedItem}
                    setQuantity={setQuantity}
                    quantity={quantity}
                    handleAddItem={handleAddItem}
                    canEditOrder={canEditOrder}
                />

                <ServiceOrderTable
                    serviceOrder={serviceOrder}
                    allItems={allItems}
                    setSelectedStoreItem={setSelectedStoreItem}
                    selectedStoreItem={selectedStoreItem}
                    setQuantityToStore={setQuantityToStore}
                    quantityToStore={quantityToStore}
                    handleAddItemToStore={handleAddItemToStore}
                    renderTableRows={renderTableRows}
                    canEditOrder={canEditOrder}
                />
                {canEditOrder() && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={handleConfirmDeleteAllItems}
                            sx={{
                                mt: 2,
                                width: '250px', // Mismo ancho que el FormControl
                                height: '56px', // Mismo alto que el Select
                            }}
                        >
                            Eliminar todos los ítems
                        </Button>
                        <FormControl sx={{ minWidth: 200, width: '200px', mt: 2 }}>
                            <InputLabel id="status-select-label">Estado</InputLabel>
                            <Select
                                labelId="status-select-label"
                                value={selectedStatus}
                                onChange={(e) => handleChangeStatus(e.target.value)}
                            >
                                {Object.entries(status).map(([key, label]) => (
                                    <MenuItem
                                        key={key}
                                        value={key}
                                        disabled={!canChangeToStatus(serviceOrder.status, key)}
                                    >
                                        {label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                    </div>
                )}

                <Dialog open={confirmDialogOpen} onClose={handleCancelDelete}>
                    <DialogTitle>Confirmar eliminación</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            ¿Estás seguro de que deseas eliminar todos los ítems? Esta acción no puede deshacerse.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCancelDelete}>Cancelar</Button>
                        <Button onClick={handleConfirmDelete}>Confirmar</Button>
                    </DialogActions>
                </Dialog>
            </TableContainer>

            <Snackbar
                open={alertInfo.open}
                autoHideDuration={6000}
                onClose={handleCloseAlert}
            >
                <Alert
                    onClose={handleCloseAlert}
                    severity={alertInfo.severity}
                    sx={{ width: '100%' }}
                >
                    {alertInfo.message}
                </Alert>
            </Snackbar>
        </div>
    );
};

export default AddItemsToServiceOrder;
