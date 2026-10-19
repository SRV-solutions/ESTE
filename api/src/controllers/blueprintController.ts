import { Request, Response } from 'express';
import { tenant } from '../middlewares/auth';
import { Blueprint, Event, User } from '../models';
import { deletePrivateFile, savePrivateFile, sendPrivateFile } from '../services/storage';
import { HttpError, parseId } from '../utils/http';

/** Planos de la empresa (los ve todo el equipo con acceso a eventos). */
export const listBlueprints = async (req: Request, res: Response) => {
  const eventId = Number(req.query.event) || undefined;
  res.json(
    await Blueprint.findAll({
      where: { companyId: tenant(req), ...(eventId ? { eventId } : {}) },
      attributes: { exclude: ['fileKey'] },
      include: [
        { model: Event, attributes: ['id', 'eventName', 'dateEvent'] },
        { model: User, as: 'Uploader', attributes: ['id', 'username', 'firstname', 'lastname'] },
      ],
      order: [['createdAt', 'DESC']],
    }),
  );
};

export const uploadBlueprint = async (req: Request, res: Response) => {
  if (!req.file) throw new HttpError(400, 'Elegí el archivo del plano.');
  const companyId = tenant(req);
  const title = String(req.body.title || '').trim() || req.file.originalname.replace(/\.[^.]+$/, '');
  if (title.length > 160) throw new HttpError(400, 'El título es demasiado largo.');

  let eventId: number | null = null;
  if (req.body.eventId) {
    const event = await Event.findOne({ where: { id: parseId(req.body.eventId, 'evento'), companyId } });
    if (!event) throw new HttpError(404, 'El evento no existe.');
    eventId = event.id;
  }

  const { key, mime } = await savePrivateFile(req.file.buffer, `empresas/${companyId}/planos`, 'plano');
  const blueprint = await Blueprint.create({
    companyId,
    eventId,
    title,
    description: String(req.body.description || '').trim() || null,
    fileKey: key,
    fileName: req.file.originalname.slice(0, 200),
    mimeType: mime,
    size: req.file.size,
    uploadedBy: req.user!.id,
  });
  res.status(201).json({ message: 'Plano subido.', id: blueprint.id });
};

const findBlueprint = async (req: Request) => {
  const blueprint = await Blueprint.findOne({ where: { id: parseId(req.params.id), companyId: tenant(req) } });
  if (!blueprint) throw new HttpError(404, 'Plano no encontrado.');
  return blueprint;
};

/** Descarga (o vista en el navegador, para PDF e imágenes). */
export const downloadBlueprint = async (req: Request, res: Response) => {
  const blueprint = await findBlueprint(req);
  await sendPrivateFile(res, blueprint.fileKey, {
    contentType: blueprint.mimeType,
    fileName: blueprint.fileName,
    inline: req.query.view === '1' && blueprint.mimeType !== 'image/vnd.dwg',
  });
};

export const deleteBlueprint = async (req: Request, res: Response) => {
  const blueprint = await findBlueprint(req);
  await blueprint.destroy();
  await deletePrivateFile(blueprint.fileKey);
  res.json({ message: 'Plano eliminado.' });
};
