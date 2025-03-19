import { Request } from 'express';
import Event from '../models/Event';
import Location from '../models/Location';

export const getEvents = async (req: Request, res: any) => {
  try {
    const searchedEvents = await Event.findAll({
      include: [Location]
    })

    return res.json(searchedEvents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching items', error });
  }
};

export const createEvent = async (req: Request, res: any) => {
  try {
    const { eventName, dateEvent, locationId, organizer, producer, finalClient } = req.body;

    if (!eventName || !dateEvent || !locationId) {
      return res.status(400).json({ message: "Faltan datos obligatorios." });
    }

    const formattedDate = new Date(dateEvent);
    if (isNaN(formattedDate.getTime())) {
      return res.status(400).json({ message: "Formato de fecha inválido." });
    }

    const newEvent = await Event.create({
      eventName,
      dateEvent: formattedDate,
      locationId,
      organizer,
      producer,
      finalClient
    });
    const searchedEvent = await Event.findByPk(newEvent.id, {
      include: [Location]
    })
    return res.status(201).json(searchedEvent);
  } catch (error) {
    console.error("Error al crear el evento:", error);
    res.status(500).json({ message: "Error al crear el evento.", error });
  }
};

export const updateEvent = async (req: Request, res: any) => {
  try {
    const { id } = req.params;
    const { eventName, dateEvent, locationId, organizer, producer, finalClient } = req.body;

    // Verificar si el evento existe
    const existingEvent = await Event.findByPk(id);
    if (!existingEvent) {
      return res.status(404).json({ message: "Evento no encontrado." });
    }

    // Validar la fecha si es proporcionada
    let formattedDate = existingEvent.dateEvent;
    if (dateEvent) {
      formattedDate = new Date(dateEvent);
      if (isNaN(formattedDate.getTime())) {
        return res.status(400).json({ message: "Formato de fecha inválido." });
      }
    }

    // Actualizar el evento
    await existingEvent.update({
      eventName: eventName ?? existingEvent.eventName,
      dateEvent: formattedDate,
      locationId: locationId ?? existingEvent.locationId,
      organizer: organizer ?? existingEvent.organizer,
      producer: producer ?? existingEvent.producer,
      finalClient: finalClient ?? existingEvent.finalClient,
    });

    return res.status(200).json(existingEvent);
  } catch (error) {
    console.error("Error al actualizar el evento:", error);
    res.status(500).json({ message: "Error al actualizar el evento.", error });
  }
};