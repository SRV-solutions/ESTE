import multer from 'multer';
import path from 'path';
import { HttpError } from '../utils/http';

const MAX_CSV_BYTES = 5 * 1024 * 1024;

/**
 * El CSV se procesa en memoria: no quedan archivos temporales en disco.
 * Se valida por extensión porque Windows suele mandar los .csv como application/vnd.ms-excel.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CSV_BYTES },
  fileFilter: (_req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new HttpError(400, 'Solo se permiten archivos .csv'));
    }
  },
});

export default upload;

/** Imágenes (logo, foto de perfil, captura de un reporte). El tipo real se valida en services/storage. */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

/** Documentos privados: recibos de sueldo y planos (PDF/DWG pesan más). */
export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
});
