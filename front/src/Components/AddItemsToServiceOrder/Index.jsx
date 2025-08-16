import React, { useEffect, useState } from 'react';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
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

        if ((userData.email === serviceOrder.OrderedBy.email || userData.email === serviceOrder.CheckedBy.email) && serviceOrder.status === `in_review`) {
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
                showAlert(`No hay suficientes ítems disponibles en esta categoría ${itemChildren[0]?.Category?.name || ''}`, `error`);
                return;
            }

            if (!itemChildren[0].Category.isStorable) {
                showAlert(`El item ${itemChildren[0].Category.name} no es almacenable`, `error`);
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
                {canEditOrder() && <TableCell align="center"><IconButton
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
                </IconButton></TableCell>}
                <TableCell align="center">{item.code}</TableCell>
                <TableCell align="center">{item.Category.name}</TableCell>
                <TableCell align="center">{item.Category.description}</TableCell>
                <TableCell align="center">{item.Category.type}</TableCell>
                <TableCell align="center">{item.Category.isStorable ? `SI` : `NO`}</TableCell>
                <TableCell align="center">{item.Category.isContainer ? `SI` : `NO`}</TableCell>
                {canEditOrder() && (
                    <TableCell align="center">
                        <IconButton
                            disabled={!isTemporalContainer}
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
            showAlert(error.response?.data?.message || `Error al cambiar el estado`, `error`);
        }
    };



    const generatePDF = async (serviceOrder) => {
        const doc = new jsPDF();
        const getImageAsBase64 = (url) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous"; // Por seguridad, pero en local no importa mucho
                img.src = url;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;

                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);
                    const dataURL = canvas.toDataURL("image/png");
                    resolve(dataURL);
                };
                img.onerror = (err) => reject(err);
            });
        };

        const fechaActual = new Date().toLocaleDateString("es-AR");
        // Encabezado
        const logoBase64 = await getImageAsBase64("/logo.png");
        doc.addImage(logoBase64, "PNG", 15, 5, 20, 20); // (x, y, width, height)        doc.setFontSize(10);
        doc.text("4921-1200", 105, 15, { align: "center" });
        doc.text("FAMATINA 4033", 105, 20, { align: "center" });
        doc.setFontSize(12);
        doc.text("ORDEN DE SERVICIO", 105, 25, { align: "center" });
        doc.text(`N° ${serviceOrder.id}`, 200, 15, { align: "right" });
        doc.text(`Fecha: ${fechaActual}`, 200, 20, { align: "right" });

        // Línea separadora
        doc.line(14, 30, 200, 30);

        // Info principal del evento
        const infoY = 35;
        doc.setFontSize(11);
        doc.text(`Evento: ${serviceOrder.Event?.eventName || "-"}`, 14, infoY);
        doc.text(`Empresa: ${serviceOrder.Event?.organizer || "-"}`, 120, infoY);
        doc.text(`Fecha: ${new Date(serviceOrder.Event?.dateEvent).toLocaleDateString()}`, 14, infoY + 7);
        doc.text(`Contacto: ${serviceOrder.Event?.producer || "-"}`, 120, infoY + 7);
        doc.text(`Datos Extra: ${serviceOrder.Event?.finalClient || "-"}`, 14, infoY + 14);

        doc.line(14, infoY + 20, 200, infoY + 20); // línea separadora

        // Más detalles
        const detailsY = infoY + 28;
        const formatDateTime = (date) =>
            date ? new Date(date).toLocaleString("es-AR").replace(",", "") : "-";

        var x = serviceOrder.Event?.Location?.address

        const cortarTextoCadaN = (texto, maxLength = 33) => {
            if (!texto) return [];

            const partes = [];
            for (let i = 0; i < texto.length; i += maxLength) {
                let parte = texto.slice(i, i + maxLength);
                if (parte.length === maxLength && i + maxLength < texto.length) {
                    parte += "-";
                }
                partes.push(parte);
            }

            return partes;
        };


        const direccion = serviceOrder.Event?.Location?.address || "-";
        const direccionPartes = cortarTextoCadaN(direccion);

        direccionPartes.forEach((linea, i) => {
            doc.text(`${i === 0 ? "Dirección: " : ""}${linea}`, 120, detailsY + (i * 7));
        });

        const yOffset = detailsY + (direccionPartes.length * 7);

        doc.text(`País: ${serviceOrder.Event?.Location?.country || "-"}`, 120, yOffset);
        doc.text(`Desarme: ${formatDateTime(serviceOrder.disassemblyDate)}`, 120, yOffset + 7);
        doc.text(`Chequeado por: ${serviceOrder.CheckedBy.username}`, 120, yOffset + 14);



        doc.text(`Lugar: ${serviceOrder.Event?.Location?.locationName || "-"}`, 14, detailsY);
        doc.text(`Ciudad: ${serviceOrder.Event?.Location?.city || "-"}`, 14, detailsY + 7);
        doc.text(`Armado: ${formatDateTime(serviceOrder.assemblyDate)}`, 14, detailsY + 14);
        doc.text(`Preparado por: ${serviceOrder.OrderedBy.username}`, 14, detailsY + 21);
        doc.text(`Armado por: ${serviceOrder.DeployedBy.username}`, 14, detailsY + 28);
        doc.text(`Observaciones: ${serviceOrder.observations || "-"}`, 14, detailsY + 35);

        doc.line(14, detailsY + 40, 200, detailsY + 40); // línea separadora

        // Tabla de ítems
        let startY = detailsY + 48;

        const groupedItems = serviceOrder.ServiceOrderItems.reduce((acc, item) => {
            const catId = item.Item.Category.id;
            if (!acc[catId]) acc[catId] = [];
            acc[catId].push(item);
            return acc;
        }, {});

        const categoryCount = serviceOrder.ServiceOrderItems.reduce((acc, item) => {
            const category = item.Item.Category; // guardamos TODO el objeto Category
            const key = category.code; // usamos code como clave única

            if (!acc[key]) {
                acc[key] = { category, count: 0 };
            }

            acc[key].count++;

            return acc;
        }, {});

        const categoryList = Object.values(categoryCount);

        console.log(categoryList);

        const tableData = categoryList.map((category) => [
            category.category.code,
            category.category.name,
            category.category.description || "-",
            category.count || 1,
        ]);
        console.log(tableData);
        
        autoTable(doc, {
            startY: startY,
            head: [["Código", "Categoría", "Descripción", "Cantidad"]],
            body: tableData,
            theme: "grid",
            styles: { fontSize: 10 },
        });

        startY = doc.lastAutoTable.finalY + 10;


        Object.keys(groupedItems).forEach((categoryId) => {
            const items = groupedItems[categoryId];
            const category = items[0].Item.Category;

            // doc.setFontSize(12);
            // doc.text(`Categoría: ${category.code} - ${category.name}`, 14, startY);
            // startY += 6;
            // console.log(items);

            // const tableData = items.map((item) => [
            //     item.Item.code,
            //     category.name,
            //     category.description || "-",
            //     item.quantity || 1,
            // ]);
            const tableData = [[category.code, category.name, category.description || '', items.length]]
            // console.log(tableData);

            // autoTable(doc, {
            //     startY: startY,
            //     head: [["Código", "Categoría", "Descripción", "Cantidad"]],
            //     body: tableData,
            //     theme: "grid",
            //     styles: { fontSize: 10 },
            // });

            // startY = doc.lastAutoTable.finalY + 10;
        });

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
                onClick={() => generatePDF(serviceOrder)}
                sx={{ mt: 2 }}
            >
                Descargar PDF
            </Button>
        </div>
    );
};

export default AddItemsToServiceOrder;
