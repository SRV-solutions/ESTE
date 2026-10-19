import fs from 'fs';
import forge from 'node-forge';
import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../config/database';
import { env } from '../config/env';
import type { TaxCondition } from '../models/Company';

/**
 * Factura electrónica con ARCA (ex AFIP), sin intermediarios:
 * - WSAA: con el certificado se obtiene un ticket de acceso (token + sign) que dura 12 h.
 * - WSFEv1: con el ticket se pide el CAE de cada comprobante.
 * Por ahora emite Factura C (código 11), la que corresponde a un monotributista.
 */

const URLS = {
  wsaa: { homo: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms', prod: 'https://wsaa.afip.gov.ar/ws/services/LoginCms' },
  wsfe: { homo: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx', prod: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx' },
};
const target = () => (env.arca.production ? 'prod' : 'homo');

export class ArcaError extends Error {}

export const isArcaConfigured = () =>
  !!(env.arca.cuit && env.arca.cert && env.arca.key && env.arca.pointOfSale);

/** Acepta el PEM pegado en la variable (con `\n` literales) o la ruta a un archivo. */
const readPem = (value: string) => {
  const v = value.trim();
  if (v.startsWith('-----BEGIN')) return v.replace(/\\n/g, '\n');
  return fs.readFileSync(v, 'utf8');
};

const xmlUnescape = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const tag = (xml: string, name: string) => xml.match(new RegExp(`<(?:\\w+:)?${name}>([\\s\\S]*?)</(?:\\w+:)?${name}>`))?.[1];
const tags = (xml: string, name: string) => [...xml.matchAll(new RegExp(`<(?:\\w+:)?${name}>([\\s\\S]*?)</(?:\\w+:)?${name}>`, 'g'))].map((m) => m[1]);

/** Fecha/hora con huso de Argentina (formato que pide el WSAA). */
const isoAR = (date: Date) => new Date(date.getTime() - 3 * 3600_000).toISOString().replace(/\.\d{3}Z$/, '-03:00');

const soap = async (url: string, action: string, body: string) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: action },
    body,
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  const fault = tag(text, 'faultstring');
  if (fault) throw new ArcaError(`ARCA: ${xmlUnescape(fault)}`);
  if (!res.ok) throw new ArcaError(`ARCA respondió HTTP ${res.status}.`);
  return text;
};

// ---------- WSAA ----------

const signTra = (tra: string) => {
  const cert = forge.pki.certificateFromPem(readPem(env.arca.cert));
  const key = forge.pki.privateKeyFromPem(readPem(env.arca.key));
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(tra, 'utf8');
  p7.addCertificate(cert);
  p7.addSigner({
    key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      // forge acepta Date en signingTime aunque el tipo diga string.
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign();
  return forge.util.encode64(forge.asn1.toDer(p7.toAsn1()).getBytes());
};

interface Ticket {
  token: string;
  sign: string;
}

/** Ticket de acceso al WSFE. Se guarda en la base porque ARCA no da otro mientras el anterior siga vigente. */
const getTicket = async (): Promise<Ticket> => {
  const key = `wsfe:${target()}`;
  const [cached] = await sequelize.query<Ticket>(
    `SELECT token, sign FROM "ArcaTicket" WHERE service = :key AND "expiresAt" > now() + interval '5 minutes'`,
    { replacements: { key }, type: QueryTypes.SELECT },
  );
  if (cached) return cached;

  const now = new Date();
  const tra = `<?xml version="1.0" encoding="UTF-8"?><loginTicketRequest version="1.0"><header><uniqueId>${Math.floor(
    now.getTime() / 1000,
  )}</uniqueId><generationTime>${isoAR(new Date(now.getTime() - 10 * 60_000))}</generationTime><expirationTime>${isoAR(
    new Date(now.getTime() + 10 * 60_000),
  )}</expirationTime></header><service>wsfe</service></loginTicketRequest>`;

  const response = await soap(
    URLS.wsaa[target()],
    '',
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov"><soapenv:Header/><soapenv:Body><wsaa:loginCms><wsaa:in0>${signTra(
      tra,
    )}</wsaa:in0></wsaa:loginCms></soapenv:Body></soapenv:Envelope>`,
  );
  const ticketXml = xmlUnescape(tag(response, 'loginCmsReturn') || '');
  const token = tag(ticketXml, 'token');
  const sign = tag(ticketXml, 'sign');
  const expiresAt = tag(ticketXml, 'expirationTime');
  if (!token || !sign || !expiresAt) throw new ArcaError('ARCA no devolvió el ticket de acceso.');

  await sequelize.query(
    `INSERT INTO "ArcaTicket" (service, token, sign, "expiresAt") VALUES (:key, :token, :sign, :expiresAt)
     ON CONFLICT (service) DO UPDATE SET token = EXCLUDED.token, sign = EXCLUDED.sign, "expiresAt" = EXCLUDED."expiresAt"`,
    { replacements: { key, token, sign, expiresAt } },
  );
  return { token, sign };
};

// ---------- WSFEv1 ----------

const NS = 'http://ar.gov.afip.dif.FEV1/';

const wsfe = async (method: string, inner: string) => {
  const { token, sign } = await getTicket();
  const auth = `<ar:Auth><ar:Token>${token}</ar:Token><ar:Sign>${sign}</ar:Sign><ar:Cuit>${env.arca.cuit}</ar:Cuit></ar:Auth>`;
  return soap(
    URLS.wsfe[target()],
    NS + method,
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="${NS}"><soap:Body><ar:${method}>${auth}${inner}</ar:${method}></soap:Body></soap:Envelope>`,
  );
};

const wsfeErrors = (xml: string) => {
  const errors = tag(xml, 'Errors');
  return errors ? tags(errors, 'Msg').map(xmlUnescape) : [];
};

/** Código de condición frente al IVA del receptor (RG 5616). */
const RECEIVER_TAX_CONDITION: Record<TaxCondition, number> = {
  responsable_inscripto: 1,
  exento: 4,
  consumidor_final: 5,
  monotributo: 6,
};

export interface InvoiceRequest {
  amountArs: number;
  serviceFrom: string; // YYYY-MM-DD
  serviceTo: string;
  receiver: { cuit: string | null; taxCondition: TaxCondition };
}

export interface IssuedVoucher {
  pointOfSale: number;
  voucherType: number;
  voucherNumber: number;
  cae: string;
  caeExpiresAt: string;
  receiverDocType: number;
  receiverDocNumber: string;
  issuedAt: Date;
}

const ymd = (date: string) => date.replace(/-/g, '');
const fromYmd = (value: string) => `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;

/**
 * Emite una Factura C por servicios. Toma un lock en la base para que dos emisiones simultáneas
 * no pidan el mismo número de comprobante.
 */
export const issueVoucher = async (req: InvoiceRequest, transaction: Transaction): Promise<IssuedVoucher> => {
  if (!isArcaConfigured()) throw new ArcaError('ARCA no está configurado (faltan ARCA_CUIT, ARCA_CERT, ARCA_KEY o ARCA_POINT_OF_SALE).');
  if (env.arca.voucherType !== 11) throw new ArcaError('Por ahora Event Box solo emite Factura C (ARCA_VOUCHER_TYPE=11).');

  await sequelize.query('SELECT pg_advisory_xact_lock(4243)', { transaction });

  const pointOfSale = env.arca.pointOfSale;
  const voucherType = env.arca.voucherType;
  const head = `<ar:PtoVta>${pointOfSale}</ar:PtoVta><ar:CbteTipo>${voucherType}</ar:CbteTipo>`;

  const last = await wsfe('FECompUltimoAutorizado', head);
  const lastErrors = wsfeErrors(last);
  if (lastErrors.length) throw new ArcaError(`ARCA: ${lastErrors.join(' · ')}`);
  const voucherNumber = Number(tag(last, 'CbteNro') || 0) + 1;

  const cuit = req.receiver.cuit && /^\d{11}$/.test(req.receiver.cuit) ? req.receiver.cuit : null;
  const docType = cuit ? 80 : 99; // 80 = CUIT, 99 = consumidor final sin identificar
  const docNumber = cuit ?? '0';
  const amount = req.amountArs.toFixed(2);
  const today = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);

  const detail =
    `<ar:Concepto>2</ar:Concepto><ar:DocTipo>${docType}</ar:DocTipo><ar:DocNro>${docNumber}</ar:DocNro>` +
    `<ar:CbteDesde>${voucherNumber}</ar:CbteDesde><ar:CbteHasta>${voucherNumber}</ar:CbteHasta><ar:CbteFch>${ymd(today)}</ar:CbteFch>` +
    `<ar:ImpTotal>${amount}</ar:ImpTotal><ar:ImpTotConc>0</ar:ImpTotConc><ar:ImpNeto>${amount}</ar:ImpNeto>` +
    `<ar:ImpOpEx>0</ar:ImpOpEx><ar:ImpTrib>0</ar:ImpTrib><ar:ImpIVA>0</ar:ImpIVA>` +
    `<ar:FchServDesde>${ymd(req.serviceFrom)}</ar:FchServDesde><ar:FchServHasta>${ymd(req.serviceTo)}</ar:FchServHasta>` +
    `<ar:FchVtoPago>${ymd(today)}</ar:FchVtoPago><ar:MonId>PES</ar:MonId><ar:MonCotiz>1</ar:MonCotiz>` +
    `<ar:CondicionIVAReceptorId>${RECEIVER_TAX_CONDITION[req.receiver.taxCondition]}</ar:CondicionIVAReceptorId>`;

  const response = await wsfe(
    'FECAESolicitar',
    `<ar:FeCAEReq><ar:FeCabReq><ar:CantReg>1</ar:CantReg>${head}</ar:FeCabReq><ar:FeDetReq><ar:FECAEDetRequest>${detail}</ar:FECAEDetRequest></ar:FeDetReq></ar:FeCAEReq>`,
  );

  const result = tag(response, 'Resultado');
  const cae = tag(response, 'CAE');
  const caeExpiry = tag(response, 'CAEFchVto');
  if (result !== 'A' || !cae || !caeExpiry) {
    const observations = tags(response, 'Obs').flatMap((o) => tags(o, 'Msg')).map(xmlUnescape);
    const problems = [...wsfeErrors(response), ...observations];
    throw new ArcaError(`ARCA rechazó la factura${problems.length ? `: ${problems.join(' · ')}` : '.'}`);
  }

  return {
    pointOfSale,
    voucherType,
    voucherNumber,
    cae,
    caeExpiresAt: fromYmd(caeExpiry),
    receiverDocType: docType,
    receiverDocNumber: docNumber,
    issuedAt: new Date(),
  };
};

/** Datos del emisor para imprimir la factura (y el QR obligatorio de ARCA). */
export const issuerInfo = () => ({
  cuit: env.arca.cuit,
  name: env.arca.issuer.name,
  address: env.arca.issuer.address,
  taxCondition: env.arca.issuer.taxCondition,
  grossIncome: env.arca.issuer.grossIncome,
  activityStart: env.arca.issuer.activityStart,
  production: env.arca.production,
});
