import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Avatar, Box, CircularProgress } from '@mui/material';
import EditProfileModal from './EditProfileModal';
import ChangePassword from './ChangePassword';
import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;

const Profile = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token found');
        return { Authorization: `Bearer ${token}` };
    };

    const fetchUserProfile = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data } = await axios.get(`${apiUrl}/users/profile`, {
                headers: getAuthHeaders(),
            });
            setUser(data);
        } catch (error) {
            setError('Hubo un error al cargar el perfil del usuario.');
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
    
    const fullName = `${user.firstname || ''} ${user.lastname || ''}`.trim();

    return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
            <Card sx={{ maxWidth: 400, width: '90%', textAlign: 'center', p: 3, boxShadow: 3 }}>
                <Box display="flex" justifyContent="flex-end">
                    <EditProfileModal user={user} onUpdate={handleProfileUpdate} fetchUserProfile={fetchUserProfile} />
                </Box>

                <Avatar
                    src={user.avatarUrl || 'https://via.placeholder.com/150'}
                    alt={user.username}
                    sx={{ width: 100, height: 100, margin: '16px auto' }}
                />

                <CardContent>
                    {/* Mostrar nombre completo si está disponible */}
                    {fullName ? (
                        <Typography variant="h5" gutterBottom>
                            {fullName}
                        </Typography>
                    ) : null}

                    <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                        @{user.username}
                    </Typography>

                    <Typography variant="body1" color="textSecondary">
                        📧 {user.email}
                    </Typography>

                    <Typography variant="body1" color="textSecondary">
                        🛡️ Rol: {user?.role?.roleName}
                    </Typography>

                    <Box mt={2}>
                        <ChangePassword user={user} fetchUserProfile={fetchUserProfile} />
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};

export default Profile;
