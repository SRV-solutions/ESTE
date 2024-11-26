import { Request } from 'express';
import Event from '../models/Event';


export const getEvents = async (req: Request, res: any) => {
    try {
      const searchedEvents = await Event.findAll()
  
      return res.json(searchedEvents);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching items', error });
    }
  };
  