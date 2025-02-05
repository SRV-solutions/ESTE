import { useState } from 'react';
import { Modal, Box, TextField, Button, IconButton, Typography, Snackbar } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility'; // Icono para mostrar la contraseña
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import axios from 'axios';
const apiUrl = import.meta.env.VITE_API_URL;


const EditPasswordModal = ({ user, fetchUserProfile }) => {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false); // Estado para mostrar la contraseña actual
    const [showNewPassword, setShowNewPassword] = useState(false); // Estado para mostrar la nueva contraseña
    const [showConfirmPassword, setShowConfirmPassword] = useState(false); // Estado para mostrar la confirmación

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        setLoading(true);
        setErrors({ currentPassword: '', newPassword: '', confirmPassword: '' });

        if (formData.newPassword !== formData.confirmPassword) {
            setErrors({ ...errors, confirmPassword: 'Las contraseñas no coinciden' });
            setLoading(false);
            return;
        }

        try {
            await axios.put(`${apiUrl}/users/${user.id}/change-password`, formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });

            fetchUserProfile(); // Actualizar el perfil después de la actualización
            setSnackbarMessage('Contraseña actualizada con éxito');
            setOpenSnackbar(true);
            setOpen(false);
        } catch (error) {

            if (error.response && error.response.data && error.response.data.errors) {
                const errorData = error.response.data.errors;
                setErrors({
                    currentPassword: errorData.currentPassword || '',
                    newPassword: errorData.newPassword || '',
                    confirmPassword: errorData.confirmPassword || '',
                });
            } else {
                setSnackbarMessage('Error al actualizar la contraseña');
                setOpenSnackbar(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCloseSnackbar = () => {
        setOpenSnackbar(false);
    };

    const handleCloseModal = () => {
        setOpen(false); // Cerrar la modal
    };

    return (
        <>
            <IconButton onClick={() => setOpen(true)}>
                <Button variant="contained" color="primary" fullWidth>
                    Cambiar Contraseña
                </Button>
            </IconButton>
            <Modal open={open} onClose={handleCloseModal}>
                <Box sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 300,
                    bgcolor: 'background.paper',
                    boxShadow: 24,
                    p: 4,
                    borderRadius: 2,
                }}>
                    <IconButton
                        onClick={handleCloseModal}
                        sx={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                        }}
                    >
                        <CloseIcon /> {/* Botón de cruz */}
                    </IconButton>
                    <Typography variant="h6" gutterBottom>Actualizar Contraseña</Typography>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Contraseña Actual"
                        name="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={formData.currentPassword}
                        onChange={handleChange}
                        error={!!errors.currentPassword}
                        helperText={errors.currentPassword}
                        InputProps={{
                            endAdornment: (
                                <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                                    {showCurrentPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                            ),
                        }}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Nueva Contraseña"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={formData.newPassword}
                        onChange={handleChange}
                        error={!!errors.newPassword}
                        helperText={errors.newPassword}
                        InputProps={{
                            endAdornment: (
                                <IconButton onClick={() => setShowNewPassword(!showNewPassword)}>
                                    {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                            ),
                        }}
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Confirmar Nueva Contraseña"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        error={!!errors.confirmPassword}
                        helperText={errors.confirmPassword}
                        InputProps={{
                            endAdornment: (
                                <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                    {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                </IconButton>
                            ),
                        }}
                    />
                    <Button variant="contained" color="primary" onClick={handleSubmit} disabled={loading} fullWidth>
                        {loading ? 'Guardando...' : 'Actualizar Contraseña'}
                    </Button>
                </Box>
            </Modal>

            {/* Snackbar para mostrar el mensaje de éxito */}
            <Snackbar
                open={openSnackbar}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                message={snackbarMessage}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                }}
            />
        </>
    );
};

export default EditPasswordModal;
