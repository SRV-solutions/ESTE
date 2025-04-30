import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
} from '@mui/material';

const UserModal = ({
    open,
    onClose,
    onSave,
    locationData,
    setLocationData,
}) => {
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setLocationData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };    

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{locationData?.id ? 'Editar Ubicacion' : 'Crear Nueva Ubicacion'}</DialogTitle>
            <DialogContent>
                <TextField
                    label="Nombre de la Ubicacion"
                    name="locationName"
                    fullWidth
                    margin="dense"
                    value={locationData.locationName || ''}
                    onChange={handleChange}
                />
                <TextField
                    label="Direccion de la Ubicacion"
                    name="address"
                    fullWidth
                    margin="dense"
                    value={locationData.address || ''}
                    onChange={handleChange}
                />
                <TextField
                    label="Ciudad de la Ubicacion"
                    name="city"
                    fullWidth
                    margin="dense"
                    value={locationData.city || ''}
                    onChange={handleChange}
                />
                <TextField
                    label="Pais de la Ubicacion"
                    name="country"
                    fullWidth
                    margin="dense"
                    value={locationData.country || ''}
                    onChange={handleChange}
                />
 
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
                    {locationData?.id ? 'Guardar Cambios' : 'Crear Ubicacion'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default UserModal;
