import { useState } from "react";
import { Button, Typography, Stack, Box, List, ListItem, ListItemText } from "@mui/material";
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
} from "@mui/material";

import SnackbarComponent from "./SnackbarComponent";
import LoadingComponent from "./LoadingComponent";
const apiUrl = import.meta.env.VITE_API_URL;

const requiredFields = [
    { name: "nombre", description: "Nombre del ítem (Obligatorio)" },
    { name: "descripcion", description: "Descripción del ítem (Obligatorio)" },
    { name: "codigo", description: "Código único del ítem (Obligatorio)" },
    { name: "tipo", description: "Tipo o categoría del ítem (Obligatorio)" },
    { name: "unidad", description: "Unidad de medida (Ej: mts, unidades) (Obligatorio)" },
    { name: "valor", description: "Valor monetario del ítem (Obligatorio)" },
    { name: "peso", description: "Peso del ítem en kg (Obligatorio)" },
    { name: "es_almacenable", description: "Si el ítem se puede almacenar: 'si' o 'no' (Obligatorio)" },
    { name: "es_contenedor", description: "Si el ítem es contenedor: 'si' o 'no' (Obligatorio)" },
    { name: "cantidad", description: "Cantidad de ítems a crear (Obligatorio)" },
    { name: "usos", description: "Número de usos del ítem (Opcional)" },
];

const exampleCSVContent =
    `nombre,descripcion,codigo,tipo,unidad,valor,peso,es_almacenable,es_contenedor,cantidad,usos
Cable HDMI,Cable HDMI de alta calidad,HDMI-001,Cable,mts,15.5,0.2,si,no,10,0
Zapatilla Cambre,Zapatilla para conexiones eléctricas,ZAP-123,Adaptador,unidad,5.0,0.1,si,no,5,3
`;

const UploadCSVComponent = ({
    fetchItems,
    fetchCategories,
    fetchAvalibleStoreItems
}) => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "info",
    });

    const handleFileChange = (event) => {
        if (event.target.files.length > 0) {
            setFile(event.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setSnackbar({ open: true, message: "Por favor selecciona un archivo CSV.", severity: "warning" });
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        setLoading(true);

        try {
            const response = await fetch(`${apiUrl}/items/upload-csv`, {
                method: "POST",
                body: formData,
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                }
            });

            if (!response.ok) {
                const jsonData = await response.json();
                setSnackbar({ open: true, message: jsonData.message || "❌ Hubo un error al procesar el archivo.", severity: "error" });
                return;
            }

            fetchItems();
            fetchAvalibleStoreItems();
            fetchCategories();
            setSnackbar({ open: true, message: "✅ Archivo procesado correctamente.", severity: "success" });
        } catch (error) {
            setSnackbar({ open: true, message: error.message || "❌ Hubo un error al procesar el archivo.", severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    const downloadExampleCSV = () => {
        const blob = new Blob([exampleCSVContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "ejemplo_items.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <Stack spacing={2} alignItems="center" sx={{ width: "100%", maxWidth: 600, margin: "auto" }}>
            <Typography variant="h6">Subir Archivo CSV</Typography>

            {/* Botones alineados lado a lado */}
            <Box sx={{ display: "flex", gap: 2 }}>
                <label htmlFor="upload-csv">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                        id="upload-csv"
                    />
                    <Button variant="contained" component="span" color="primary">
                        Seleccionar Archivo
                    </Button>
                </label>

                <Button variant="outlined" color="secondary" onClick={downloadExampleCSV}>
                    Descargar Ejemplo CSV
                </Button>
            </Box>

            {file && <Typography variant="body1" sx={{ mt: 1 }}>{file.name}</Typography>}

            <Button
                variant="contained"
                color="secondary"
                onClick={handleUpload}
                disabled={loading}
                sx={{ mt: 1 }}
            >
                Subir CSV
            </Button>
            {/* Campos obligatorios con descripción */}
            <Box>
                <Typography variant="subtitle1" gutterBottom>
                    Campos obligatorios (SI o SI):
                </Typography>

                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                {requiredFields.map(({ name, description }) => (
                                    <TableCell>{name}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <TableRow>
                                {requiredFields.map(({ name, description }) => (
                                    <TableCell>{description}</TableCell>
                                ))}
                            </TableRow>
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>


            {/* Loading Spinner */}
            <LoadingComponent open={loading} message="Procesando archivo..." />

            {/* Snackbar de Notificación */}
            <SnackbarComponent
                open={snackbar.open}
                message={snackbar.message}
                severity={snackbar.severity}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            />
        </Stack>
    );
};

export default UploadCSVComponent;
