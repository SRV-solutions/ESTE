import { useState } from "react";

const UploadCSVComponent = () => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState("");

    const handleFileChange = (event) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setMessage("Por favor selecciona un archivo CSV.");
            return;
        }
    
        const formData = new FormData();
        formData.append("file", file);
    
        console.log("FormData contenido:", formData.get("file")); // Verifica que realmente se agregó el archivo
    
        try {
            const response = await fetch("http://localhost:3000/items/upload-csv", {
                method: "POST",
                body: formData,
            });
    
            if (!response.ok) {
                throw new Error("Error en la carga del archivo.");
            }
    
            const jsonData = await response.json();
            console.log("JSON Recibido:", jsonData);
            setMessage("✅ Archivo procesado correctamente.");
        } catch (error) {
            console.error("Error:", error);
            setMessage("❌ Hubo un error al procesar el archivo.");
        }
    };
    
    return (
        <div>
            <input type="file" accept=".csv" onChange={handleFileChange} />
            <button onClick={handleUpload}>Subir CSV</button>
            {message && <p>{message}</p>}
        </div>
    );
};

export default UploadCSVComponent;
