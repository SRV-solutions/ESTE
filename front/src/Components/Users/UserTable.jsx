import { useEffect, useState } from 'react';
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
import UserModal from './UserModal';

const apiUrl = import.meta.env.VITE_API_URL;

const UserTable = () => {
    const [users, setUsers] = useState([]);
    const [user, setUser] = useState([]);
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

    const fetchUserProfile = async () => {
        try {
            const { data } = await axios.get(`${apiUrl}/users/profile`, {
                headers: getAuthHeaders(),
            });
            setUser(data);
        } catch (error) {
        }
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
            // Podés agregar toast o alerta acá si querés
        }
    };

    // const toggleUserStatus = async (id) => {
    //     try {
    //         await axios.patch(`${apiUrl}/users/${id}/toggle`, null, {
    //             headers: getAuthHeaders(),
    //         });
    //         setAlertInfo({
    //             open: true,
    //             message: 'Estado del usuario actualizado correctamente',
    //             severity: 'success',
    //         });
    //         fetchUsers();
    //     } catch (error) {
    //         setAlertInfo({
    //             open: true,
    //             message: `Error cambiando estado: ${error.response?.data?.message || error.message}`,
    //             severity: 'error',
    //         });
    //     }
    // };

    useEffect(() => {
        fetchRoles()
        fetchUsers();
        fetchUserProfile()
    }, []);

    const createUserRole = user?.role?.Permissions?.some((permission) => (permission.entity === 'users' && permission.action === 'create'))
    const updateUserRole = user?.role?.Permissions?.some((permission) => (permission.entity === 'users' && permission.action === 'update'))

    return (
        <div style={{ margin: '3rem' }}>
            <Typography variant="h4" gutterBottom>
                Gestión de Usuarios
            </Typography>
            <Button
                variant="contained"
                color="primary"
                onClick={handleOpenModal}
                sx={{ mb: 2, display: createUserRole ? '' : 'none' }}
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
                        {updateUserRole ? <TableCell align="center">Acciones</TableCell> : <></>}
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
                            {updateUserRole ? <TableCell align="center">
                                <IconButton onClick={() => handleEditUser(user)}>
                                    <EditIcon />
                                </IconButton>
                                {/* <IconButton disabled onClick={() => toggleUserStatus(user.id)}>
                                    {true  ? <ToggleOnIcon color="info" /> : <ToggleOffIcon color="error" />}
                                </IconButton> */}
                            </TableCell> : <></>}
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
