import { Request, Response } from 'express';
import { env } from '../config/env';
import { Company, Feedback, User } from '../models';
import { FEEDBACK_TYPES } from '../models/Feedback';
import { details, paragraph, sendEmail } from '../services/email';
import { saveImage } from '../services/storage';
import { HttpError, parseId } from '../utils/http';

const TYPE_LABELS: Record<string, string> = { error: 'Error', sugerencia: 'Sugerencia', consulta: 'Consulta' };

/** Un usuario reporta un problema (con captura opcional). Llega al Panel SRV y por mail a soporte. */
export const createFeedback = async (req: Request, res: Response) => {
  const type = String(req.body.type || 'error');
  const message = String(req.body.message || '').trim();
  if (!FEEDBACK_TYPES.includes(type as never)) throw new HttpError(400, 'Tipo de reporte inválido.');
  if (message.length < 10) throw new HttpError(400, 'Contanos un poco más (mínimo 10 caracteres).', { message: 'Mínimo 10 caracteres.' });
  if (message.length > 5000) throw new HttpError(400, 'El mensaje es demasiado largo (máximo 5000 caracteres).');

  const user = await User.findByPk(req.user!.id, { include: [Company] });
  const attachmentUrl = req.file ? await saveImage(req.file.buffer, `feedback/${user?.companyId ?? 'srv'}`, 'captura') : null;

  const feedback = await Feedback.create({
    companyId: user?.companyId ?? null,
    userId: req.user!.id,
    type,
    message,
    pageUrl: String(req.body.pageUrl || '').slice(0, 500) || null,
    userAgent: String(req.headers['user-agent'] || '').slice(0, 300) || null,
    attachmentUrl,
  });

  // El mail sale en segundo plano: si Resend tarda, el usuario no espera.
  void sendEmail({
    to: env.email.supportTo,
    replyTo: user?.email,
    subject: `[Event Box] ${TYPE_LABELS[type]} #${feedback.id} · ${user?.Company?.name ?? 'SRV'}`,
    title: `${TYPE_LABELS[type]} reportado`,
    body:
      details([
        ['Empresa', user?.Company?.name],
        ['Usuario', user ? `${user.username} (${user.email})` : null],
        ['Pantalla', feedback.pageUrl],
        ['Captura', attachmentUrl],
      ]) + paragraph(message),
  });

  res.status(201).json({ message: '¡Gracias! Recibimos tu reporte y lo vamos a revisar.', id: feedback.id });
};

// ---------- Panel SRV ----------

export const listFeedback = async (req: Request, res: Response) => {
  const status = req.query.status === 'resolved' ? 'resolved' : req.query.status === 'all' ? undefined : 'open';
  const rows = await Feedback.findAll({
    where: status ? { status } : {},
    include: [
      { model: Company, attributes: ['id', 'name'] },
      { model: User, attributes: ['id', 'username', 'email', 'firstname', 'lastname'] },
    ],
    order: [['createdAt', 'DESC']],
    limit: 200,
  });
  res.json(rows);
};

export const updateFeedback = async (req: Request, res: Response) => {
  const feedback = await Feedback.findByPk(parseId(req.params.id));
  if (!feedback) throw new HttpError(404, 'Reporte no encontrado.');
  const status = req.body.status === 'resolved' ? 'resolved' : 'open';
  await feedback.update({ status, resolvedAt: status === 'resolved' ? new Date() : null });
  res.json(feedback);
};
