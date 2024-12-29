import { Request, Response } from 'express';

import Category from '../models/Category';

export const getCategories = async (req: Request, res: any) => {
  try {
    const categories = await Category.findAll();
    return res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items', error });
  }
};


