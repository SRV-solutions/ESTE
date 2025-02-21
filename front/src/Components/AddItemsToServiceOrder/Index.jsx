import React, { useEffect, useState } from 'react';
import { jsPDF } from "jspdf";
import "jspdf-autotable"; // Para crear tablas automáticamente en el PDF
import {
    TableCell,
    TableContainer,
    TableRow,
    Paper,
    Button,
    IconButton,
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
import CachedIcon from '@mui/icons-material/Cached';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import ServiceOrderHeader from './ServiceOrderHeader';
import ServiceOrderTable from './ServiceOrderTable';
import ItemChangeModal from './ItemChangeModal'
import SnackbarComponent from '../SnackbarComponent';
const apiUrl = import.meta.env.VITE_API_URL;

const AddItemsToServiceOrder = () => {
    const { id } = useParams();

    const [serviceOrder, setServiceOrder] = useState({
        Event: {},
        OrderedBy: { username: `` },
        DeployedBy: { username: `` },
        CheckedBy: { username: `` },
        ServiceOrderItems: [],
    });

    const [alertInfo, setAlertInfo] = useState({
        open: false,
        message: ``,
        severity: `info`,
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [allItems, setAllItems] = useState([]);
    const [changeItem, setChangeItem] = useState(null);
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

    const userData = JSON.parse(localStorage.getItem(`userData`));

    const canEditOrder = () => {
        // El creador puede editar si el estado es `created`
        if (userData.isAdmin) {
            return true
        }
        if (
            userData.email === serviceOrder.OrderedBy.email &&
            serviceOrder.status === `created`
        ) {
            return true;
        }
        if (userData.email === serviceOrder.OrderedBy.email && serviceOrder.status === `rejected`) {
            return true
        }
        // El encargado del armado puede editar si el estado es `approved` o `in_process`
        if (
            userData.email === serviceOrder.DeployedBy.email &&
            (serviceOrder.status === `approved` || serviceOrder.status === `in_process`)
        ) {
            return true;
        }

        // El chequeador nunca puede editar
        if (userData.email === serviceOrder.CheckedBy.email && serviceOrder.status === `in_review`) {
            return false;
        }
        if (userData.email === serviceOrder.CheckedBy.email) {
            return false;
        }

        // Por defecto, no puede editar
        return false;
    };

    const canEditStatus = () => {
        if (userData.isAdmin) {
            return true;
        }
        if (userData.email === serviceOrder.CheckedBy.email && serviceOrder.status === `in_review`) {
            return true;
        }
        const editableStatuses = [
            `ready`,
            `dispatched`,
            `delivered`,
            `returning`,
            `received`,
            `under_review`,
        ];

        return (
            userData.email === serviceOrder.OrderedBy.email &&
            editableStatuses.includes(serviceOrder.status)
        );
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
        const token = localStorage.getItem(`token`);
        if (!token) throw new Error(`No token found`);
        return { Authorization: `Bearer ${token}` };
    };

    const showAlert = (message, severity = `info`) => {
        setAlertInfo({ open: true, message, severity });
    };

    const fetchItems = async () => {
        try {
            const { data } = await axios.get(`${apiUrl}/items/avalible`, {
                headers: getAuthHeaders(),
            });
            setAllItems(data);
        } catch (error) {
            console.error(`Error al cargar los ítems:`, error);
        }
    };

    const fetchServiceOrder = async () => {
        try {
            const { data } = await axios.get(`${apiUrl}/service-orders/${id}`, {
                headers: getAuthHeaders(),
            });
            fetchItems()

            setServiceOrder(data);
        } catch (error) {
            console.error(`Error al cargar la orden de servicio:`, error);
        }
    };

    const handleAddItem = async () => {
        if (!selectedItem || quantity <= 0) return;

        try {
            const response = await axios.post(
                `${apiUrl}/service-order-items/bulk`,
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
                showAlert(`Ítem agregado correctamente`, `success`);
            }
        } catch (error) {
            showAlert(error.response?.data?.message || `Error al agregar el ítem`, `error`);
        }
    };

    const handleDeleteItem = async (itemId, itemIdParent) => {
        try {
            if (itemIdParent) {
                const response = await axios.delete(
                    `${apiUrl}/service-order-store-items/${id}/${itemIdParent}/${itemId}`,
                    { headers: getAuthHeaders() }
                );

                if (response.status === 200) {
                    fetchServiceOrder();
                    showAlert(`Ítem eliminado correctamente`, `success`);
                }
                return;
            }

            const response = await axios.delete(
                `${apiUrl}/service-order-items/${id}/${itemId}`,
                { headers: getAuthHeaders() }
            );

            if (response.status === 200) {
                fetchServiceOrder();
            }
        } catch (error) {
            console.error(`Error al eliminar el ítem:`, error);
            showAlert(error.response?.data?.message || `Error al eliminar el ítem`, `error`);
        }
    };

    const handleDeleteAllItems = async () => {
        try {
            const response = await axios.delete(`${apiUrl}/service-order-items/${id}`, {
                headers: getAuthHeaders(),
            });

            if (response.status === 200) {
                fetchServiceOrder();
                showAlert(`Todos los ítems fueron eliminados correctamente`, `success`);
            }
        } catch (error) {
            console.error(`Error al eliminar todos los ítems:`, error);
            showAlert(error.response?.data?.message || `Error al eliminar ítems`, `error`);
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
                showAlert(`No hay suficientes ítems disponibles en esta categoría`, `error`);
                return;
            }

            const storeItemData = {
                serviceOrderId: Number(id),
                itemIdParent,
                categoryId: selectedStoreItem.Category.id,
                quantity: quantityToStore,
            };

            const response = await axios.post(
                `${apiUrl}/service-order-store-items/bulk`,
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
                showAlert(`Ítem agregado correctamente al almacén`, `success`);

                setSelectedStoreItem(null);
                setQuantityToStore(1);
                fetchServiceOrder();
            }
        } catch (error) {
            showAlert(error.response?.data?.message || `Error al agregar el ítem al almacén`, `error`);
        }
    };

    const handleOpenModal = (item) => {
        setIsModalOpen(true);
        setChangeItem(item)
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const renderTableRows = (item, color, itemParent = NaN, isTemporalContainer = true) => {
        return (
            <TableRow key={item.id} sx={{ backgroundColor: color || `` }}>
                <ItemChangeModal
                    open={isModalOpen}
                    onClose={handleCloseModal}
                    selectedItem={changeItem}
                    allItems={allItems}
                    serviceOrder={serviceOrder}
                    getAuthHeaders={getAuthHeaders}
                    fetchServiceOrder={fetchServiceOrder}
                />
                <TableCell align="center"><IconButton
                    disabled={!isTemporalContainer}
                    onClick={() => handleOpenModal(item)}
                    sx={{
                        color: '#757575',
                        '&:hover': {
                            color: 'blue',
                            cursor: 'pointer',
                        },
                    }}
                >
                    <CachedIcon />
                </IconButton></TableCell>
                <TableCell align="center">{item.code}</TableCell>
                <TableCell align="center">{item.Category.name}</TableCell>
                <TableCell align="center">{item.Category.description}</TableCell>
                <TableCell align="center">{item.Category.type}</TableCell>
                <TableCell align="center">{item.Category.isStorable ? `SI` : `NO`}</TableCell>
                <TableCell align="center">{item.Category.isContainer ? `SI` : `NO`}</TableCell>
                {canEditOrder() && (
                    <TableCell align="center">
                        <IconButton
                            onClick={() => handleDeleteItem(item.id, itemParent.id)}
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
        )
    };

    const status = {
        created: `Creada`,
        in_review: `En Revisión`,
        approved: `Aprobada`,
        rejected: `Rechazada`,
        in_process: `En Proceso`,
        ready: `Lista`,
        dispatched: `Despachada`,
        delivered: `En Viaje de ida`,
        returning: `En Viaje de regreso`,
        received: `Recibido`,
        under_review: `Bajo Revisión`,
        disassembled: `Desarmada`,
    };

    const canChangeToStatus = (currentStatus, newStatus) => {
        const statusFlow = [
            `created`,
            `in_review`,
            `approved`,
            `rejected`,
            `in_process`,
            `ready`,
            `dispatched`,
            `delivered`,
            `returning`,
            `received`,
            `under_review`,
            `disassembled`,
        ];

        // Verifica si es admin: puede cambiar a cualquier estado.
        if (userData.isAdmin) {
            return true;
        }

        // Caso especial: Si está en `rejected`, solo puede cambiar a `in_review`.
        if (currentStatus === `rejected`) {
            return newStatus === `in_review`;
        }
        if (currentStatus === `approved`) {
            return newStatus === `in_process`;
        }
        // Permitir cambios a `approved` y `rejected` solo desde `in_review`.
        if (
            currentStatus === `in_review` &&
            (newStatus === `approved` || newStatus === `rejected`)
        ) {
            return true;
        }

        // Flujo general: Cambiar solo al siguiente estado en el flujo.
        const currentIndex = statusFlow.indexOf(currentStatus);
        const nextIndex = statusFlow.indexOf(newStatus);

        return nextIndex === currentIndex + 1;
    };

    const handleChangeStatus = async (newStatus) => {
        // Verifica si el cambio de estado está permitido
        if (!canChangeToStatus(serviceOrder.status, newStatus)) {
            showAlert(
                `No tienes permiso para cambiar a este estado o el cambio no sigue el flujo permitido.`,
                `error`
            );
            return;
        }

        // Mensajes específicos para cambios críticos
        if (newStatus === `approved` || newStatus === `rejected`) {
            const confirmation = window.confirm(
                `¿Estás seguro de que quieres cambiar el estado a "${status[newStatus]}"?`
            );
            if (!confirmation) {
                return;
            }
        }

        try {
            // Actualiza el estado en el backend
            const response = await axios.patch(
                `${apiUrl}/service-orders/${id}`,
                { status: newStatus },
                { headers: getAuthHeaders() }
            );

            if (response.status === 200) {
                // Actualiza el estado localmente
                setServiceOrder((prev) => ({
                    ...prev,
                    status: newStatus,
                }));
                setSelectedStatus(newStatus);
                showAlert(`Estado de la orden cambiado correctamente`, `success`);
            }
        } catch (error) {
            // Manejo de errores
            console.error(`Error al cambiar el estado de la orden:`, error);
            showAlert(error.response?.data?.message || `Error al cambiar el estado`, `error`);
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();

        // Agregar el título
        doc.setFontSize(18);
        doc.text("Orden de Servicio", 14, 20);

        // Agregar detalles de la orden de servicio
        doc.setFontSize(12);
        doc.text(`ID de la Orden: ${serviceOrder.id}`, 14, 30);
        doc.text(`Estado: ${status[serviceOrder.status]}`, 14, 35);
        doc.text(`Pedido por: ${serviceOrder.OrderedBy.username}`, 14, 40);
        doc.text(`Desplegado por: ${serviceOrder.DeployedBy.username}`, 14, 45);
        doc.text(`Verificado por: ${serviceOrder.CheckedBy.username}`, 14, 50);
        doc.text(`Cliente: ${serviceOrder?.Event?.Location?.locationName} - ${serviceOrder?.Event?.organizer} - ${serviceOrder?.Event?.producer} - ${serviceOrder?.Event?.finalClient}`, 14, 55);

        let startY = 60 + 10; // posición inicial para las tablas de ítems

        // Agrupar los ítems por categoría
        const groupedItems = serviceOrder.ServiceOrderItems.reduce((acc, item) => {
            const categoryId = item.Item.categoryId;

            // Verificar si la categoría ya existe en el acumulador
            if (!acc[categoryId]) {
                acc[categoryId] = { items: [], totalLength: 0 };  // Crear un array y una propiedad totalLength
            }

            // Agregar el item al array correspondiente a su categoría
            acc[categoryId].items.push(item);
            acc[categoryId].totalLength = acc[categoryId].items.length;  // Sumar la cantidad de ítems

            return acc;  // Retornar el acumulador para la siguiente iteración
        }, {});

        // Recorrer las categorías agrupadas y agregar tablas por categoría
        Object.keys(groupedItems).forEach(categoryId => {
            const categoryGroup = groupedItems[categoryId];
            const categoryItems = categoryGroup.items;
            // Obtener el nombre y el código de la categoría
            const categoryCode = categoryItems[0].Item.Category.code;
            const categoryName = categoryItems[0].Item.Category.name;
            const isContainer = categoryItems[0].Item.Category.isContainer;

            // Título de la categoría
            doc.setFontSize(14);
            doc.text(`Categoría: ${categoryCode} - ${categoryName}`, 14, startY);

            // Agregar la cantidad total de ítems para esta categoría
            doc.setFontSize(14);
            doc.text(`Total de ítems: ${categoryGroup.totalLength}`, 14, startY + 10);

            startY += 20; // Ajustar posición Y para los ítems

            // Si la categoría tiene ítems que son contenedores, procesarlos
            // if (isContainer) {
            //     categoryItems.forEach(item => {
            //         const storeItems = item.Item.StoreItemParentItem;

            //         // Título del contenedor
            //         doc.setFontSize(14);
            //         doc.text(`Codigo del contenedor: ${item.Item.code} - ${item.Item.Category.name}`, 14, startY);
            //         startY += 2; // Ajustar la posición para los ítems dentro del contenedor
            //         if (storeItems && storeItems.length > 0) {

            //             const documentData = storeItems.map(subItem => [
            //                 subItem.code,
            //                 subItem.Category.name,
            //                 subItem.Category.description,
            //             ]);
            //             doc.autoTable({
            //                 head: [["Código", "Categoría", "Descripción"]],
            //                 body: documentData,
            //                 startY: startY,
            //                 styles: { fontSize: 10 },
            //             });
            //             startY = doc.lastAutoTable.finalY + 15;
            //         } else {
            //             // Si no tiene ítems dentro, mostrar un mensaje
            //             doc.setFontSize(10);
            //             doc.text("No hay ítems dentro de este contenedor.", 14, startY);
            //             startY += 15;
            //         }
            //     });
            // } else {
            //     // Si no es contenedor, agregar los ítems directamente
            //     doc.text(`Items`, 14, startY);
            //     startY+=2
            //     const itemsData = categoryItems.map(item => [
            //         item.Item.code,
            //         item.Item.Category.name,
            //         item.Item.Category.description,
            //     ]);

            //     doc.autoTable({
            //         head: [["Código", "Categoría", "Descripción"]],
            //         body: itemsData,
            //         startY: startY,
            //         styles: { fontSize: 10 },
            //     });

            //     // Actualizar la posición Y después de la tabla
            //     startY = doc.lastAutoTable.finalY + 15;
            // }
        });

        // Guardar el PDF
        doc.save(`orden_de_servicio_${serviceOrder.id}.pdf`);
    };


    return (
        <div style={{ margin: `3%` }}>


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
                <div
                    style={{
                        display: `flex`,
                        alignItems: `center`,
                        gap: `16px`,
                        marginTop: `16px`,
                    }}
                >
                    {canEditOrder() && (
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={handleConfirmDeleteAllItems}
                            sx={{
                                mt: 2,
                                width: `250px`,
                                height: `56px`,
                            }}
                        >
                            Eliminar todos los ítems
                        </Button>
                    )}

                    {(canEditOrder() || canEditStatus()) && (
                        <FormControl sx={{ minWidth: 200, width: `200px`, mt: 2 }}>
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
                                        title={
                                            !canChangeToStatus(serviceOrder.status, key)
                                                ? `No puedes cambiar a ${label} desde ${status[serviceOrder.status]}`
                                                : ``
                                        }
                                    >
                                        {label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </div>

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

            <SnackbarComponent
                open={alertInfo.open}
                message={alertInfo.message}
                severity={alertInfo.severity}
                onClose={handleCloseAlert}
            />

            <Button
                variant="contained"
                color="primary"
                onClick={generatePDF}
                sx={{ mt: 2 }}
            >
                Descargar PDF
            </Button>
        </div>
    );
};

export default AddItemsToServiceOrder;
