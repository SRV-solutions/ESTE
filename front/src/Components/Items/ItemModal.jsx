import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Button,
    Checkbox,
    FormControlLabel,
    Select,
    MenuItem,
    InputLabel
} from '@mui/material';

const ItemModal = ({
    open,
    setOpenDialog,
    onSave,
    itemData,
    setItemData,
    categories = [] // Lista de categorías existentes
}) => {
    const [mode, setMode] = useState('new'); // 'new' o 'existing'
    const onClose = () => {
        setOpenDialog(false)
    }
    // 🛠️ Manejar cambios en los campos
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        if (mode === 'existing') {
            setItemData((prev) => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value,
                ownerId: 1,
            }));
        } else {
            setItemData((prev) => ({
                ...prev,
                [name]: type === 'checkbox' ? checked : value,
            }));
        }
    };

    // 🛠️ Manejar cambio de categoría existente
    const handleCategorySelect = (e) => {
        const selectedCategory = categories.find(cat => cat.id === e.target.value);
        if (selectedCategory) {
            setItemData({
                ownerId: 1, // Ajusta esto si es necesario
                categoryId: selectedCategory.id,
                uses: selectedCategory.uses || 0,
                quantity: selectedCategory.quantity || 1,
            });
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            {/* 📝 Título del Modal */}
            <DialogTitle>
                {itemData?.id ? 'Editar Ítem' : 'Crear Nuevo Ítem'}
            </DialogTitle>

            {/* 🔄 Modo de Creación */}
            <DialogContent>
                <InputLabel id="mode-label">Modo de Creación</InputLabel>
                <Select
                    labelId="mode-label"
                    value={mode}
                    fullWidth
                    margin="dense"
                    onChange={(e) => setMode(e.target.value)}
                >
                    <MenuItem value="new">Crear Nueva Categoría</MenuItem>
                    <MenuItem value="existing">Basarse en una Categoría Existente</MenuItem>
                </Select>

                {/* 🗂️ Seleccionar Categoría Existente */}
                {mode === 'existing' && (
                    <>
                        <InputLabel id="category-label">Seleccionar Categoría</InputLabel>
                        <Select
                            labelId="category-label"
                            fullWidth
                            margin="dense"
                            onChange={handleCategorySelect}
                        >
                            {categories.map((category) => (
                                <MenuItem key={category.id} value={category.id}>
                                    {category.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </>
                )}

                {/* 📋 Campos del formulario */}
                {mode === 'new' && (
                    <>
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
                            value={itemData.code || ''}
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
                    </>
                )}

                {/* Campos Comunes */}
                <TextField
                    label="Usos"
                    name="uses"
                    fullWidth
                    margin="dense"
                    type="number"
                    value={itemData.uses || ''}
                    onChange={handleChange}
                />
                <TextField
                    label="Cantidad"
                    name="quantity"
                    fullWidth
                    margin="dense"
                    type="number"
                    value={itemData.quantity || ''}
                    onChange={handleChange}
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
                    {itemData?.id ? 'Guardar Cambios' : 'Crear'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ItemModal;
