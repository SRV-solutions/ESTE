/** Fechas de una orden, en el orden en que tienen que ocurrir. */
export const ORDER_DATES = [
  { key: 'incomeDate', label: 'Ingreso de material' },
  { key: 'assemblyDate', label: 'Armado' },
  { key: 'disassemblyDate', label: 'Desarme' },
  { key: 'outcomeDate', label: 'Egreso de material' },
];

/** Devuelve `{ campo: mensaje }` si alguna fecha es anterior a la que debería precederla. */
export const validateOrderDates = (values) => {
  const errors = {};
  let prev = null;
  for (const { key, label } of ORDER_DATES) {
    if (!values[key]) continue;
    if (prev && new Date(values[key]) < new Date(values[prev.key])) {
      errors[key] = `No puede ser anterior a ${prev.label.toLowerCase()}.`;
    }
    prev = { key, label };
  }
  return errors;
};
