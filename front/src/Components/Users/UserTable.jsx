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
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import axios from 'axios';
import SnackbarComponent from '../SnackbarComponent';
import UserModal from './UserModal';

const apiUrl = import.meta.env.VITE_API_URL;

const UserTable = () => {
    const [users, setUsers] = useState([]);
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [userData, setUserData] = useState({});
    const [roles, setRoles] = useState([{}])

    const [alertInfo, setAlertInfo] = useState({
        open: false,
        message: '',
        severity: 'info',
    });

    const handleCloseAlert = () => {
        setAlertInfo((prev) => ({ ...prev, open: false }));
    };

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');
        return { Authorization: `Bearer ${token}` };
    };

    const fetchRoles = async () => {
        try {
            const { data } = await axios.get(`${apiUrl}/roles`, {
                headers: getAuthHeaders(),
            });
            setRoles(data);
        } catch (error) {
            setAlertInfo({
                open: true,
                message: `Error cargando roles: ${error.response?.data?.message || error.message}`,
                severity: 'error',
            });
        }
    }

    const fetchUsers = async () => {
        try {
            const { data } = await axios.get(`${apiUrl}/users`, {
                headers: getAuthHeaders(),
            });
            setUsers(data);
        } catch (error) {
            setAlertInfo({
                open: true,
                message: `Error cargando usuarios: ${error.response?.data?.message || error.message}`,
                severity: 'error',
            });
        }
    };

    const handleOpenModal = () => {
        setUserData({}); // Vacía el formulario
        setUserModalOpen(true);
    };

    const handleEditUser = (user) => {        
        setUserData(user); // Carga los datos del usuario en el modal
        setUserModalOpen(true);
    };

    const handleSaveUser = async () => {
        try {
            const headers = getAuthHeaders();
            if (userData.id) {
                // Editar usuario                
                await axios.patch(`${apiUrl}/users/update/${userData.id}`, userData, { headers });
            } else {
                // Crear usuario
                await axios.post(`${apiUrl}/users`, userData, { headers });
            }
            // Cerrar modal y refrescar datos
            setUserModalOpen(false);
            fetchUsers();
        } catch (error) {
            console.error('Error al guardar el usuario:', error);
            // Podés agregar toast o alerta acá si querés
        }
    };

    const toggleUserStatus = async (id) => {
        try {
            await axios.patch(`${apiUrl}/users/${id}/toggle`, null, {
                headers: getAuthHeaders(),
            });
            setAlertInfo({
                open: true,
                message: 'Estado del usuario actualizado correctamente',
                severity: 'success',
            });
            fetchUsers();
        } catch (error) {
            setAlertInfo({
                open: true,
                message: `Error cambiando estado: ${error.response?.data?.message || error.message}`,
                severity: 'error',
            });
        }
    };

    useEffect(() => {
        fetchRoles()
        fetchUsers();
    }, []);

    return (
        <div style={{ margin: '3rem' }}>
            <Typography variant="h4" gutterBottom>
                Gestión de Usuarios
            </Typography>
            <Button
                variant="contained"
                color="primary"
                onClick={handleOpenModal}
                sx={{ mb: 2 }}
            >
                Crear Usuario
            </Button>

            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell align="center">ID</TableCell>
                        <TableCell align="center">Nombre de Usuario</TableCell>
                        <TableCell align="center">Email</TableCell>
                        <TableCell align="center">Rol</TableCell>
                        <TableCell align="center">Activo</TableCell>
                        <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {users.map((user) => (
                        <TableRow
                            key={user.id}
                            sx={{ backgroundColor: user.isActive ? 'transparent' : '#f0f0f0' }}
                        >
                            <TableCell align="center">{user.id}</TableCell>
                            <TableCell align="center">{user.username}</TableCell>
                            <TableCell align="center">{user.email}</TableCell>
                            <TableCell align="center">{user.Role?.roleName || 'Sin rol'}</TableCell>
                            <TableCell align="center">{/*user.isActive*/true ? 'SI' : 'NO'}</TableCell>
                            <TableCell align="center">
                                <IconButton onClick={() => handleEditUser(user)}>
                                    <EditIcon />
                                </IconButton>
                                {/* <IconButton disabled onClick={() => toggleUserStatus(user.id)}>
                                    {true  ? <ToggleOnIcon color="info" /> : <ToggleOffIcon color="error" />}
                                </IconButton> */}
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
            <UserModal
                open={userModalOpen}
                onClose={setUserModalOpen}
                onSave={handleSaveUser}
                userData={userData}
                setUserData={setUserData}
                roles={roles} // Asegurate de tener esto cargado
            />

        </div>
    );
};

export default UserTable;
