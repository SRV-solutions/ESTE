import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

interface JwtPayload {
  id: string;
  email: string;
  roleId: string;
}

export const isAdmin = (req: any, res: any, next: NextFunction) => {
    next()
}

export const isAuth = (req: any, res: any, next: NextFunction) => {
  // Obtener el token del encabezado Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato esperado: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'No autorizado. Token no proporcionado.' });
  }

  // Verificar y decodificar el token
  jwt.verify(token, JWT_SECRET, (err:any, user:any) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido o expirado.' });
    }

    // Guardar los datos del usuario en `req` para uso posterior
    req.user = user as JwtPayload;
    next();
  });
};
