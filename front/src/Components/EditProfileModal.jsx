import { useState } from 'react';
import { Modal, Box, TextField, Button, IconButton, Typography, Snackbar } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close'; // Icono para el botón de cerrar
import axios from 'axios';
const apiUrl = import.meta.env.VITE_API_URL;


const EditProfileModal = ({ user, onUpdate, fetchUserProfile }) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState(false);

    const [formData, setFormData] = useState({
        username: user.username,
        email: user.email,
        firstname: user.firstname || '',
        lastname: user.lastname || ''
    });

    const [errors, setErrors] = useState({
        username: '',
        email: '',
        firstname: '',
        lastname: ''
    });


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        setLoading(true);
        setErrors({ username: '', email: '' }); // Limpiar errores antes de intentar enviar el formulario

        try {
            const { data } = await axios.patch(`${apiUrl}/users/update`, formData, {
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
                setErrors({
                    username: errorData.username || errorData.newUsername || '',
                    email: errorData.email || errorData.newEmail || '',
                    firstname: errorData.firstname || '',
                    lastname: errorData.lastname || '',
                });
            } else if (error.response && error.response.data.message?.includes('llave duplicada')) {
                setErrors(prev => ({ ...prev, username: 'Ese nombre de usuario ya está en uso.' }));
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
                        name="firstname"
                        value={formData.firstname}
                        onChange={handleChange}
                        error={!!errors.firstname}
                        helperText={errors.firstname}
                    />

                    <TextField
                        fullWidth
                        margin="normal"
                        label="Apellido"
                        name="lastname"
                        value={formData.lastname}
                        onChange={handleChange}
                        error={!!errors.lastname}
                        helperText={errors.lastname}
                    />

                    <TextField
                        fullWidth
                        margin="normal"
                        label="Nombre de Usuario (debe ser unico)"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        error={!!errors.username} // Mostrar error si lo hay
                        helperText={errors.username} // Mostrar el mensaje de error
                    />
                    <TextField
                        fullWidth
                        margin="normal"
                        label="Email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        error={!!errors.email} // Mostrar error si lo hay
                        helperText={errors.email} // Mostrar el mensaje de error
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

