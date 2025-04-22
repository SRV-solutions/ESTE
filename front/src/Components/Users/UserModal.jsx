import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    FormControlLabel,
    Checkbox,
    Select,
    MenuItem,
    InputLabel,
    InputAdornment,
    IconButton
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

const UserModal = ({
    open,
    onClose,
    onSave,
    userData,
    setUserData,
    roles = [] // roles disponibles
}) => {
    const [showPassword, setShowPassword] = useState(false);

    const toggleShowPassword = () => {
        setShowPassword((prev) => !prev);
    };
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setUserData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{userData?.id ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</DialogTitle>
            <DialogContent>
                <TextField
                    label="Nombre de Usuario"
                    name="username"
                    fullWidth
                    margin="dense"
                    value={userData.username || ''}
                    onChange={handleChange}
                />
                <TextField
                    label="Email"
                    name="email"
                    type="email"
                    fullWidth
                    margin="dense"
                    value={userData.email || ''}
                    onChange={handleChange}
                />
                <TextField
                    label="Contraseña"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    fullWidth
                    margin="dense"
                    value={userData.password || ''}
                    onChange={handleChange}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton onClick={toggleShowPassword} edge="end">
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                />
                <InputLabel id="role-label">Rol</InputLabel>
                <Select
                    labelId="role-label"
                    name="roleId"
                    fullWidth
                    value={userData.roleId || ''}
                    onChange={handleChange}
                    margin="dense"
                >
                    {roles.map((role) => (
                        <MenuItem key={role.id} value={role.id}>
                            {role.id} - {role.roleName}
                        </MenuItem>
                    ))}
                </Select>
            </DialogContent>

            <DialogActions>
                <Button onClick={() => onClose(false)} color="secondary">
                    Cancelar
                </Button>
                <Button
                    onClick={onSave}
                    color="primary"
                    variant="contained"
                >
                    {userData?.id ? 'Guardar Cambios' : 'Crear Usuario'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UserModal;
