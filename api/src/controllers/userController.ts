import { Request, Response } from 'express';
import { User } from '../models/user';
import { Role } from '../models/role';

// Obtener un usuario por ID
export const getUser = async (req: Request, res: any) => {
  const { id } = req.params;
  try {
    const user = await User.findByPk(id, {
      include: [Role], // Incluye la relación con Role
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error });
  }
};

// Crear un nuevo usuario
export const createUser = async (req: Request, res: any) => {
  const { username, roleId } = req.body;
  try {
    const role = await Role.findByPk(roleId);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    const user = await User.create({ username, roleId });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error });
  }
};

export const getAllUsers = async (req: Request, res: any) => {
    try {
      const users = await User.findAll();
      if (!users) {
        return res.status(404).json({ message: 'Not Users avalible' });
      }
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: 'Error creating users', error });
    }
  };