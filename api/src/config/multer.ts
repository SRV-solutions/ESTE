import multer from 'multer';
import path from 'path';

// Configuración de almacenamiento de multer
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb) => {
    cb(null, 'uploads/'); // Directorio donde se guardarán los archivos
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
