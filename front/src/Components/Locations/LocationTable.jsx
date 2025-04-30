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
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';
import SnackbarComponent from '../SnackbarComponent';
import LocationModal from './LocationModal';

const apiUrl = import.meta.env.VITE_API_URL;

const UserTable = () => {
    const [locations, setLocations] = useState([]);
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [LocationData, setLocationData] = useState({});
    const [alertInfo, setAlertInfo] = useState({
        open: false,
        message: '',
        severity: 'info',
    });
    const [user, setUser] = useState({
        username: "",
        role: "",
        OrderedBy: [],
        CheckedBy: [],
        DeployedBy: []
    });
    const handleCloseAlert = () => {
        setAlertInfo((prev) => ({ ...prev, open: false }));
    };

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');
        return { Authorization: `Bearer ${token}` };
    };

    const fetchLocations = async () => {
        try {
            const { data } = await axios.get(`${apiUrl}/locations`, {
                headers: getAuthHeaders(),
            });
            setLocations(data);
        } catch (error) {
            setAlertInfo({
                open: true,
                message: `Error cargando ubicaciones: ${error.response?.data?.message || error.message}`,
                severity: 'error',
            });
        }
    };

    const handleOpenModal = () => {
        setLocationData({}); // Vacía el formulario
        setLocationModalOpen(true);
    };

    const handleEditUser = (user) => {
        setLocationData(user); // Carga los datos del usuario en el modal
        setLocationModalOpen(true);
    };

    const handleSaveLocation = async () => {
        try {
            const headers = getAuthHeaders();
            if (LocationData.id) {
                // Editar usuario                
                await axios.patch(`${apiUrl}/locations/${LocationData.id}`, LocationData, { headers });
            } else {
                // Crear usuario
                await axios.post(`${apiUrl}/locations`, LocationData, { headers });
            }
            // Cerrar modal y refrescar datos
            setLocationModalOpen(false);
            fetchLocations();
        } catch (error) {
            console.error('Error al guardar el usuario:', error);
            // Podés agregar toast o alerta acá si querés
        }
    };


    useEffect(() => {
        fetchLocations();
        fetchUserProfile()
    }, []);

    const fetchUserProfile = async () => {
        try {
            const { data } = await axios.get(`${apiUrl}/users/profile`, {
                headers: getAuthHeaders(),
            });
            setUser(data);
        } catch (error) {
            console.error('Error fetching user profile:', error);
        }
    };

    const updateLocationRole = user?.role?.Permissions?.some((permission) => (permission.entity === 'serviceOrders' && permission.action === 'update'))
    const createLocationRole = user?.role?.Permissions?.some((permission) => (permission.entity === 'serviceOrders' && permission.action === 'create'))
    // const deleteLocationRole = user?.role?.Permissions?.some((permission) => (permission.entity === 'serviceOrders' && permission.action === 'delete'))

    return (
        <div style={{ margin: '3rem' }}>
            <Typography variant="h4" gutterBottom>
                Gestión de Ubicaciones
            </Typography>
            {createLocationRole && <Button
                variant="contained"
                color="primary"
                onClick={handleOpenModal}
                sx={{ mb: 2 }}
            >
                Crear Ubicacion
            </Button>}

            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell align="center">ID</TableCell>
                        <TableCell align="center">Nombre de la Ubicacion</TableCell>
                        <TableCell align="center">Direccion</TableCell>
                        <TableCell align="center">Ciudad</TableCell>
                        <TableCell align="center">Pais</TableCell>
                        {updateLocationRole && <TableCell align="center">Acciones</TableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {locations.map((location) => (
                        <TableRow
                            key={location.id}
                        >
                            <TableCell align="center">{location.id}</TableCell>
                            <TableCell align="center">{location.locationName}</TableCell>
                            <TableCell align="center">{location.address}</TableCell>
                            <TableCell align="center">{location.city}</TableCell>
                            <TableCell align="center">{location.country}</TableCell>
                            {updateLocationRole && <TableCell align="center">
                                <IconButton onClick={() => handleEditUser(location)}>
                                    <EditIcon />
                                </IconButton>
                                {/* <IconButton disabled onClick={() => toggleUserStatus(user.id)}>
                                    {true  ? <ToggleOnIcon color="info" /> : <ToggleOffIcon color="error" />}
                                </IconButton> */}
                            </TableCell>}
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
            <LocationModal
                open={locationModalOpen}
                onClose={setLocationModalOpen}
                onSave={handleSaveLocation}
                locationData={LocationData}
                setLocationData={setLocationData}
            />

        </div>
    );
};

export default UserTable;
