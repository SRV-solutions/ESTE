export const KINDS = [
  { value: 'mensual', label: 'Sueldo mensual' },
  { value: 'aguinaldo', label: 'Aguinaldo' },
  { value: 'vacaciones', label: 'Vacaciones' },
  { value: 'liquidacion_final', label: 'Liquidación final' },
  { value: 'otro', label: 'Otro' },
];
export const kindLabel = (v) => KINDS.find((k) => k.value === v)?.label ?? v;

export const SLIP_STATUS = {
  pending: { label: 'Sin firmar', color: 'warning' },
  signed: { label: 'Firmado', color: 'success' },
  disputed: { label: 'En disconformidad', color: 'error' },
};

/** Mes actual en formato AAAA-MM. */
export const currentPeriod = () => new Date().toISOString().slice(0, 7);
