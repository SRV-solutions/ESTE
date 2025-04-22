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

const apiUrl = import.meta.env.VITE_API_URL;

const UserTable = () => {
    const [users, setUsers] = useState([]);
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

    const fetchUsers = async () => {
        try {
            const { data } = await axios.get(`${apiUrl}/users`, {
                headers: getAuthHeaders(),
            });
            console.log(data);

            setUsers(data);
        } catch (error) {
            setAlertInfo({
                open: true,
                message: `Error cargando usuarios: ${error.response?.data?.message || error.message}`,
                severity: 'error',
            });
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
        fetchUsers();
    }, []);

    return (
        <div style={{ margin: '3rem' }}>
            <Typography variant="h4" gutterBottom>
                Gestión de Usuarios
            </Typography>

            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell align="center">ID</TableCell>
                        <TableCell align="center">Nombre</TableCell>
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
                                <IconButton disabled onClick={() => console.log('Editar usuario', user)}>
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
        </div>
    );
};

export default UserTable;
