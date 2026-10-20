import { Request, Response } from 'express';
import { env } from '../config/env';
import { tenant } from '../middlewares/auth';
import { Employee, Payslip, User } from '../models';
import { hasLogin } from '../models/User';
import { PAYSLIP_KINDS } from '../models/Payslip';
import { button, details, paragraph, sendEmail } from '../services/email';
import { deletePrivateFile, savePrivateFile, sendPrivateFile } from '../services/storage';
import { HttpError, parseId } from '../utils/http';
import { fichaOf, findTeamMember } from '../services/team';

const KIND_LABELS: Record<string, string> = {
  mensual: 'Sueldo mensual',
  aguinaldo: 'Aguinaldo',
  vacaciones: 'Vacaciones',
  liquidacion_final: 'Liquidación final',
  otro: 'Otro',
};
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const periodLabel = (p: string) => `${MONTHS[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}`;

// ---------- Recibos (gestión) ----------

export const listPayslips = async (req: Request, res: Response) => {
  const period = /^\d{4}-\d{2}$/.test(String(req.query.period)) ? String(req.query.period) : undefined;
  const userId = Number(req.query.user) || undefined;
  res.json(
    await Payslip.findAll({
      where: { companyId: tenant(req), ...(period ? { period } : {}) },
      attributes: { exclude: ['fileKey'] },
      include: [
        {
          model: Employee,
          attributes: ['id', 'userId', 'cuil'],
          where: userId ? { userId } : undefined,
          include: [{ model: User, attributes: ['id', 'username', 'firstname', 'lastname'] }],
        },
      ],
      order: [
        ['period', 'DESC'],
        ['createdAt', 'DESC'],
      ],
      limit: 500,
    }),
  );
};

const parseAmount = (value: unknown) => {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(String(value).replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) throw new HttpError(400, 'Los montos tienen que ser números positivos.');
  return n;
};

/** Sube el PDF de un recibo y le avisa por mail a la persona. */
export const uploadPayslip = async (req: Request, res: Response) => {
  if (!req.file) throw new HttpError(400, 'Adjuntá el PDF del recibo.');
  const companyId = tenant(req);
  const user = await findTeamMember(companyId, req.body.userId);
  const employee = await fichaOf(user);
  const period = String(req.body.period || '');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new HttpError(400, 'Período inválido (AAAA-MM).');
  const kind = String(req.body.kind || 'mensual');
  if (!PAYSLIP_KINDS.includes(kind as never)) throw new HttpError(400, 'Tipo de recibo inválido.');

  const existing = await Payslip.findOne({ where: { employeeId: employee.id, period, kind } });
  if (existing && existing.status !== 'pending') {
    throw new HttpError(409, 'Ese recibo ya fue firmado por el empleado: no se puede reemplazar.');
  }

  const { key } = await savePrivateFile(req.file.buffer, `empresas/${companyId}/recibos/${employee.id}`, 'pdf');
  const data = {
    companyId,
    employeeId: employee.id,
    period,
    kind,
    grossAmount: parseAmount(req.body.grossAmount),
    netAmount: parseAmount(req.body.netAmount),
    fileKey: key,
    fileName: req.file.originalname.slice(0, 200),
    uploadedBy: req.user!.id,
  };
  if (existing) {
    const oldKey = existing.fileKey;
    await existing.update(data);
    await deletePrivateFile(oldKey);
  } else {
    await Payslip.create(data);
  }

  // Quien no entra a la app firma en papel: no se le manda el link.
  if (user.email && hasLogin(user)) {
    void sendEmail({
      to: user.email,
      subject: `Tu recibo de ${periodLabel(period)} está disponible`,
      title: 'Nuevo recibo de sueldo',
      body:
        paragraph(`Hola ${user.firstname || user.username}, ya podés ver tu recibo en Event Box.`) +
        details([
          ['Período', periodLabel(period)],
          ['Tipo', KIND_LABELS[kind]],
        ]) +
        button('Ver y firmar mi recibo', `${env.appUrl}/my-payslips`),
    });
  }

  res.status(existing ? 200 : 201).json({ message: existing ? 'Recibo reemplazado.' : 'Recibo cargado.' });
};

export const deletePayslip = async (req: Request, res: Response) => {
  const payslip = await Payslip.findOne({ where: { id: parseId(req.params.id), companyId: tenant(req) } });
  if (!payslip) throw new HttpError(404, 'Recibo no encontrado.');
  if (payslip.status !== 'pending') throw new HttpError(409, 'Un recibo firmado no se puede borrar.');
  await payslip.destroy();
  await deletePrivateFile(payslip.fileKey);
  res.json({ message: 'Recibo eliminado.' });
};

/** Quien no usa la app firma el recibo en papel; el administrador lo deja registrado. */
export const markPayslipSignedOnPaper = async (req: Request, res: Response) => {
  const payslip = await Payslip.findOne({ where: { id: parseId(req.params.id), companyId: tenant(req) } });
  if (!payslip) throw new HttpError(404, 'Recibo no encontrado.');
  if (payslip.status !== 'pending') throw new HttpError(409, 'Este recibo ya fue firmado.');
  await payslip.update({ status: 'signed', signedAt: new Date(), signatureIp: null, employeeComment: 'Firmado en papel' });
  res.json({ message: 'Recibo marcado como firmado en papel.' });
};

// ---------- Recibos (el propio empleado) ----------

const myEmployee = async (req: Request) => {
  const employee = await Employee.findOne({ where: { userId: req.user!.id, companyId: tenant(req) } });
  if (!employee) throw new HttpError(404, 'Todavía no tenés recibos cargados.');
  return employee;
};

export const listMyPayslips = async (req: Request, res: Response) => {
  const employee = await Employee.findOne({ where: { userId: req.user!.id, companyId: tenant(req) } });
  if (!employee) return res.json({ employee: null, payslips: [] });
  const payslips = await Payslip.findAll({
    where: { employeeId: employee.id },
    attributes: { exclude: ['fileKey', 'signatureIp'] },
    order: [
      ['period', 'DESC'],
      ['kind', 'ASC'],
    ],
  });
  res.json({ employee, payslips });
};

/** Firma digital: el empleado deja constancia de conformidad (o disconformidad, con motivo). */
export const signMyPayslip = async (req: Request, res: Response) => {
  const employee = await myEmployee(req);
  const payslip = await Payslip.findOne({ where: { id: parseId(req.params.id), employeeId: employee.id } });
  if (!payslip) throw new HttpError(404, 'Recibo no encontrado.');
  if (payslip.status !== 'pending') throw new HttpError(409, 'Este recibo ya fue firmado.');

  const agree = req.body.agree !== false;
  const comment = String(req.body.comment || '').trim();
  if (!agree && comment.length < 5) throw new HttpError(400, 'Contanos el motivo de la disconformidad.');

  await payslip.update({
    status: agree ? 'signed' : 'disputed',
    signedAt: new Date(),
    signatureIp: String(req.ip || '').slice(0, 64),
    employeeComment: comment || null,
  });
  res.json({ message: agree ? 'Recibo firmado en conformidad.' : 'Recibo firmado en disconformidad. Tu empresa va a ver el motivo.' });
};

/** Descarga: quien gestiona sueldos, o el propio empleado. */
export const downloadPayslip = async (req: Request, res: Response) => {
  const payslip = await Payslip.findOne({ where: { id: parseId(req.params.id), companyId: tenant(req) }, include: [{ model: Employee, include: [User] }] });
  if (!payslip) throw new HttpError(404, 'Recibo no encontrado.');
  const isOwner = payslip.Employee?.userId === req.user!.id;
  const canManage = req.user!.permissions.some((p) => p.entity === 'payroll' && p.action === 'read');
  if (!isOwner && !canManage) throw new HttpError(403, 'No podés ver este recibo.');

  const person = payslip.Employee?.User;
  await sendPrivateFile(res, payslip.fileKey, {
    contentType: 'application/pdf',
    fileName: `recibo_${payslip.period}_${person?.lastname || person?.username || ''}.pdf`,
    inline: req.query.view === '1',
  });
};
