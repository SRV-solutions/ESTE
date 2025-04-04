import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ruta absoluta del directorio de uploads
const uploadDir = path.join(__dirname, '..', 'uploads');

// Crear la carpeta si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento de multer
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb) => {
    cb(null, uploadDir); // Usar ruta absoluta segura
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

// Filtrar los archivos para asegurarse de que sea un archivo CSV
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype === 'text/csv') {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos CSV'), false);
  }
};

const upload = multer({ storage, fileFilter });

export default upload;
