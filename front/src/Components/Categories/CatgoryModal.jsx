import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Checkbox,
    FormControlLabel
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';

const CategoryModal = ({
    open,
    onClose,
    onSave,
    itemData,
    setItemData,
    categories
}) => {
    const types = [...new Set(categories.map(category => category.type))];

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setItemData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };


    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
            {/* 📝 Título del Modal */}
            <DialogTitle>
                {itemData?.name ? 'Editar Categoria' : 'Crear Nueva Categoria'}
            </DialogTitle>

            {/* 📋 Campos del formulario */}
            <DialogContent>
                <TextField
                    label="Nombre"
                    name="name"
                    fullWidth
                    margin="dense"
                    value={itemData.name || ''}
                    onChange={handleChange}
                />
                <TextField
                    label="Codigo"
                    name="code"
                    fullWidth
                    margin="dense"
                    value={itemData.code}
                    onChange={handleChange}
                    required
                />
                <TextField
                    label="Descripción"
                    name="description"
                    fullWidth
                    margin="dense"
                    value={itemData.description || ''}
                    onChange={handleChange}
                />
                <Autocomplete
                    freeSolo
                    options={types}
                    getOptionLabel={(type) => `${type}`}
                    onChange={(_, newValue) => {
                        if (newValue) {
                            setItemData((prev) => ({
                                ...prev,
                                type: newValue,
                            }));
                        }
                    }}
                    onInputChange={(_, newInputValue) => {
                        setItemData((prev) => ({
                            ...prev,
                            type: newInputValue,
                        }));
                    }}
                    renderInput={(params) => <TextField {...params} label="Tipo" />}
                    fullWidth
                    sx={{ mt: 2 }}
                />

                <TextField
                    label="Unidad"
                    name="unity"
                    fullWidth
                    margin="dense"
                    value={itemData.unity || ''}
                    onChange={handleChange}
                />
                <TextField
                    label="Valor"
                    name="value"
                    fullWidth
                    margin="dense"
                    type="number"
                    value={itemData.value || ''}
                    onChange={handleChange}
                />
                <TextField
                    label="Peso"
                    name="weight"
                    fullWidth
                    margin="dense"
                    type="number"
                    value={itemData.weight || ''}
                    onChange={handleChange}
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            name="isStorable"
                            checked={itemData.isStorable || false}
                            onChange={handleChange}
                        />
                    }
                    label="¿Es Almacenable?"
                />
                <FormControlLabel
                    control={
                        <Checkbox
                            name="isContainer"
                            checked={itemData.isContainer || false}
                            onChange={handleChange}
                        />
                    }
                    label="¿Es Contenedor?"
                />
            </DialogContent>

            {/* ⚙️ Acciones */}
            <DialogActions>
                <Button onClick={() => onClose(false)} color="secondary">
                    Cancelar
                </Button>
                <Button
                    onClick={onSave}
                    color="primary"
                    variant="contained"
                >
                    {itemData?.name ? 'Guardar Cambios' : 'Crear'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CategoryModal;
