import { useState } from 'react';
import { Modal, Box, TextField, Button, IconButton, Typography, Snackbar } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close'; // Icono para el botón de cerrar
import axios from 'axios';
const apiUrl = import.meta.env.VITE_API_URL;


const EditProfileModal = ({ user, onUpdate, fetchUserProfile }) => {
    const [open, setOpen] = useState(false);
    const [formData, setFormData] = useState({ newUsername: user.username, newEmail: user.email });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({ newUsername: '', newEmail: '' }); // Estado para los errores
    const [openSnackbar, setOpenSnackbar] = useState(false); // Estado para el Snackbar

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        setLoading(true);
        setErrors({ newUsername: '', newEmail: '' }); // Limpiar errores antes de intentar enviar el formulario
    
        try {
            const { data } = await axios.patch(`${apiUrl}/users/update/${user.id}`, formData, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            fetchUserProfile()
            
            //onUpdate(data); // Actualizar el estado en Profile con los nuevos datos
            setOpen(false);
            setOpenSnackbar(true); // Mostrar el Snackbar de éxito
        } catch (error) {
            if (error.response && error.response.data && error.response.data.errors) {
                const errorData = error.response.data.errors;
    
                // Verifica y asigna errores a cada campo si existe
                setErrors({
                    newUsername: errorData.newUsername || '',
                    newEmail: errorData.newEmail || '',
                });
            } else {
                console.error('Error updating profile:', error);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCloseSnackbar = () => {
        setOpenSnackbar(false); // Cerrar el Snackbar cuando el usuario haga clic en "cerrar"
    };

    const handleCloseModal = () => {
        setOpen(false); // Cerrar la modal cuando se hace clic en el botón de cerrar
    };

    return (
        <>
            <IconButton onClick={() => setOpen(true)}>
                <EditIcon />
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
                    <Typography variant="h6" gutterBottom>Editar Perfil</Typography>
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Nombre"
                        name="newUsername"
                        value={formData.newUsername}
                        onChange={handleChange}
                        error={!!errors.newUsername} // Mostrar error si lo hay
                        helperText={errors.newUsername} // Mostrar el mensaje de error
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Email"
                        name="newEmail"
                        value={formData.newEmail}
                        onChange={handleChange}
                        error={!!errors.newEmail} // Mostrar error si lo hay
                        helperText={errors.newEmail} // Mostrar el mensaje de error
                    />
                    <Button variant="contained" color="primary" onClick={handleSubmit} disabled={loading} fullWidth>
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </Box>
            </Modal>

            {/* Snackbar para mostrar el mensaje de éxito */}
            <Snackbar
                open={openSnackbar}
                autoHideDuration={6000}  // Duración en milisegundos antes de cerrarse automáticamente
                onClose={handleCloseSnackbar}
                message="Usuario actualizado con éxito"
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'center',
                }}
            />
        </>
    );
};

export default EditProfileModal;

