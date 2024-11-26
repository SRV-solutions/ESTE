import { Request } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Role from '../models/Role';
import User from '../models/User';

// Clave secreta para JWT (colócala en un archivo .env)
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export const getAllUsers = async (req: Request, res: any) => {
  try {
    const users = await User.findAll({
      include: [Role],
      attributes: [
        'id',
        'username',
        'email',
        'roleId'
      ]
    });
    if (!users.length) {
      return res.status(404).json({ message: 'No hay usuarios disponibles' });
    }
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los usuarios', error });
  }
};

export const getUser = async (req: Request, res: any) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id, {
      include: [Role],
      attributes: [
        'id',
        'username',
        'email',
        'roleId'
      ]

    });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el usuario', error });
  }
};

export const createUser = async (req: Request, res: any) => {
  const { username, email, password, roleId } = req.body;
  try {
    // Validar si el rol existe
    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(404).json({ message: 'Rol no encontrado' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      roleId,
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear el usuario', error });
  }
};

export const register = async (req: Request, res: any) => {
  const { username, email, password, roleId } = req.body;
  try {
    // Validar si el email ya está registrado
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado' });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      roleId,
    });

    res.status(201).json({ message: 'Usuario registrado correctamente', user });
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar el usuario', error });
  }
};

export const login = async (req: Request, res: any) => {
  const { email, password } = req.body;
  try {
    // Verificar si el usuario existe
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Comparar contraseñas
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Contraseña incorrecta' });
    }

    // Generar un token JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, roleId: user.roleId },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(200).json({ message: 'Login exitoso', token });
  } catch (error) {
    res.status(500).json({ message: 'Error al iniciar sesión', error });
  }
};
