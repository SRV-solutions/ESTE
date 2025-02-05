import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Avatar, Box, CircularProgress, Button, Snackbar } from '@mui/material';
import EditProfileModal from './EditProfileModal';
import ChangePassword from './ChangePassword';
import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null); // Estado para manejar errores

    // 🔑 Obtener headers de autenticación
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');
        return { Authorization: `Bearer ${token}` };
    };

    // 📥 Fetch Perfil del Usuario
    const fetchUserProfile = async () => {
        setLoading(true); // Aseguramos que siempre se empieza con el estado de carga en true
        setError(null); // Limpiar errores previos
        try {
            const { data } = await axios.get(`${apiUrl}/users/profile`, {
                headers: getAuthHeaders(),
            });
            setUser(data);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            setError('Hubo un error al cargar el perfil del usuario.'); // Mensaje de error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserProfile();
    }, []);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Typography variant="h6" color="error" align="center">
                {error}
            </Typography>
        );
    }

    const handleProfileUpdate = (updatedUser) => {
        setUser(updatedUser);
    };

    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            <Card sx={{ maxWidth: 400, textAlign: 'center', padding: 2 }}>
                <div style={{ "display": "flex", "justifyContent": "right" }}>
                    <EditProfileModal user={user} onUpdate={handleProfileUpdate} fetchUserProfile={fetchUserProfile} />
                </div>
                <Avatar
                    src={user.avatarUrl || 'https://via.placeholder.com/150'}
                    alt={user.username}
                    sx={{ width: 100, height: 100, margin: 'auto' }}
                />
                <CardContent>
                    <Typography variant="h5" gutterBottom>
                        {user.username}
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                        📧 {user.email}
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                        🛡️ Rol: {user.role}
                    </Typography>
                    <ChangePassword user={user} fetchUserProfile={fetchUserProfile}/>
                </CardContent>
            </Card>
        </Box>
    );
};

export default Profile;
