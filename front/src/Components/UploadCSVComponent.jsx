import { useState } from "react";
import { Button, Typography, Stack } from "@mui/material";
import SnackbarComponent from "./SnackbarComponent";
import LoadingComponent from "./LoadingComponent";
const apiUrl = import.meta.env.VITE_API_URL;

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
            });

            if (!response.ok) {
                throw new Error("Error en la carga del archivo.");
            }

            const jsonData = await response.json();
            console.log("JSON Recibido:", jsonData);
            fetchItems()
            fetchAvalibleStoreItems()
            fetchCategories()
            setSnackbar({ open: true, message: "✅ Archivo procesado correctamente.", severity: "success" });
        } catch (error) {
            console.error("Error:", error);
            setSnackbar({ open: true, message: "❌ Hubo un error al procesar el archivo.", severity: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack spacing={1} alignItems="center">
            <Typography variant="h6">Subir Archivo CSV</Typography>
            <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                style={{ display: "none" }}
                id="upload-csv"
            />
            <label htmlFor="upload-csv">
                <Button variant="contained" component="span" color="primary">
                    Seleccionar Archivo
                </Button>
            </label>
            {file && <Typography variant="h6">{file.name}</Typography>}
            <Button variant="contained" color="secondary" onClick={handleUpload} disabled={loading}>
                Subir CSV
            </Button>

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
