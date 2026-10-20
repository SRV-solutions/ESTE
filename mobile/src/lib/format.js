const LOCALE = 'es-AR';

export const formatDate = (value) => (value ? new Date(value).toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const userName = (user) => {
  if (!user) return null;
  const full = [user.firstname, user.lastname].filter(Boolean).join(' ');
  return full || user.username;
};

export const initials = (user) => {
  const name = userName(user) || '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
};

export const eventLabel = (event) => {
  if (!event) return '—';
  const parts = [event.eventName, event.Location?.locationName].filter(Boolean);
  return parts.join(' · ') || `Evento #${event.id}`;
};

const ars = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
export const formatArs = (value) => (value === null || value === undefined ? '—' : ars.format(Number(value)));

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const periodLabel = (period) => (period ? `${MONTHS[Number(period.slice(5, 7)) - 1]} ${period.slice(0, 4)}` : '—');

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
