import { Request, Response } from 'express';
import Location from '../models/Location';

// Obtener todas las ubicaciones
export const getLocations = async (req: Request, res: any) => {
  try {
    const locations = await Location.findAll();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las ubicaciones', error });
  }
};

// Crear una nueva ubicación
export const createLocation = async (req: Request, res: any) => {
  try {
    const { locationName, address, city, country } = req.body;
    if (!locationName || !address || !city || !country) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    const newLocation = await Location.create({ locationName, address, city, country });
    res.status(201).json(newLocation);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear la ubicación', error });
  }
};

// Actualizar una ubicación
export const updateLocation = async (req: Request, res: any) => {
  try {
    const { id } = req.params;

    const location = await Location.findByPk(id);
    if (!location) {
      return res.status(404).json({ message: 'Ubicación no encontrada' });
    }

    // Filtrar solo las propiedades que realmente vinieron en el body
    const fieldsToUpdate: any = {};
    const updatableFields = ['locationName', 'address', 'city', 'country'];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    });

    await location.update(fieldsToUpdate);
    res.json(location);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar la ubicación', error });
  }
};

