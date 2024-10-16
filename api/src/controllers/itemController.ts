import { Request } from 'express';
import Category from '../models/Category';
import Item from '../models/Item';

export const getItems = async (_req: Request, res: any)=>{
    try {
      const items = await Item.findAll({
        include:[{
            model: Category
        }]
      });
      if (!items) {
        return res.status(404).json({ message: 'Role not found' });
      }
      return res.json(items);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching role', error });
    }
}

