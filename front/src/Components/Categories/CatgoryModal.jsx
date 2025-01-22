import React, { useState } from 'react';
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


const CategoryModal = ({ 
    open, 
    onClose, 
    onSave, 
    itemData, 
    setItemData 
}) => {
    // 🛠️ Manejar cambios en los campos
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setItemData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            {/* 📝 Título del Modal */}
            <DialogTitle>
                {itemData?.name ? 'Editar Ítem' : 'Crear Nuevo Ítem'}
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
                <TextField
                    label="Tipo"
                    name="type"
                    fullWidth
                    margin="dense"
                    value={itemData.type || ''}
                    onChange={handleChange}
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
                <Button onClick={onClose} color="secondary">
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
