const LOCALE = 'es-AR';

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(LOCALE, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

/** Valor para un <input type="datetime-local"> en hora local. */
export const toDateTimeInput = (value) => {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const userName = (user) => {
  if (!user) return null;
  const full = [user.firstname, user.lastname].filter(Boolean).join(' ');
  return full || user.username;
};

export const eventLabel = (event) => {
  if (!event) return '—';
  const parts = [event.eventName, event.Location?.locationName].filter(Boolean);
  return parts.join(' · ') || `Evento #${event.id}`;
};

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** "hace 5 min", "hace 3 h", "hace 2 días", o la fecha si pasó más de un mes. */
export const timeAgo = (value) => {
  if (!value) return null;
  const s = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (s < 60) return 'recién';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  if (s < 30 * 86400) return `hace ${Math.round(s / 86400)} día${Math.round(s / 86400) === 1 ? '' : 's'}`;
  return `el ${formatDate(value)}`;
};
