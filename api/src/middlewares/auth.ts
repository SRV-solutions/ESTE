import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

interface JwtPayload {
  id: string;
  email: string;
  roleId: string;
  isAdmin: boolean;
}

// Middleware para verificar si el usuario está autenticado
export const isAuth = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No autorizado. Token no proporcionado.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decodedToken: any) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido o expirado.' });
    }

    // Almacena los datos del usuario en req.user
    const user = decodedToken as JwtPayload;
    req.user = {
      id: parseInt(user.id, 10),
      email: user.email,
      roleId: parseInt(user.roleId, 10),
      isAdmin: user.isAdmin,
    };

    next();
  });
};

// Middleware para verificar si el usuario es administrador
export const isAdmin = (req: any, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autorizado.' });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
  }

  next();
};
