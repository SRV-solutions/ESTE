import { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { ForeignKeyConstraintError, UniqueConstraintError, ValidationError } from 'sequelize';
import { HttpError } from '../utils/http';

const FIELD_LABELS: Record<string, string> = {
  code: 'código',
  username: 'nombre de usuario',
  email: 'email',
  cuit: 'CUIT',
};

export const notFound =(_req: Request, res: Response) => {
  res.status(404).json({ message: 'Ruta no encontrada.' });
};

/** Único lugar donde se traducen errores a respuestas: nunca se filtra SQL ni stack al cliente. */
export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, ...(err.details ? { errors: err.details } : {}) });
  }
  if (err instanceof MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo supera el tamaño máximo (5 MB).'
        : err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Se esperaba un solo archivo en el campo "file".'
          : err.message;
    return res.status(400).json({ message });
  }
  if (err instanceof UniqueConstraintError) {
    const field = err.errors[0]?.path || Object.keys(err.fields || {})[0];
    const label = field ? FIELD_LABELS[field] || field : null;
    return res.status(409).json({ message: label ? `Ya existe un registro con ese ${label}.` : 'El registro ya existe.' });
  }
  if (err instanceof ForeignKeyConstraintError) {
    return res.status(409).json({ message: 'No se puede completar: el registro está en uso o referencia algo inexistente.' });
  }
  if (err instanceof ValidationError) {
    return res.status(400).json({ message: err.errors.map((e) => e.message).join('. ') });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ message: 'El cuerpo de la petición no es JSON válido.' });
  }

  console.error('[eventbox] Error no controlado:', err);
  return res.status(500).json({ message: 'Error interno del servidor.' });
};
