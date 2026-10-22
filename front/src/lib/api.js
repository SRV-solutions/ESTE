import { API_URL } from '../config';

const TOKEN_KEY = 'eventbox.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** El AuthProvider se suscribe para cerrar la sesión cuando la API responde 401. */
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

/** Error con la misma forma que usa toda la app: `error.response.status` y `error.response.data`. */
class ApiError extends Error {
  constructor(status, data) {
    super(data?.message || `HTTP ${status}`);
    this.response = { status, data };
  }
}

const request = async (method, path, body, { params } = {}) => {
  const url = new URL(API_URL + path);
  Object.entries(params || {}).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && url.searchParams.set(k, v));

  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : isForm ? body : JSON.stringify(body) });
  } catch {
    throw new Error('Network Error');
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized();
    throw new ApiError(res.status, data);
  }
  return { data, status: res.status };
};

/** Cliente mínimo sobre fetch (reemplaza a axios): devuelve `{ data }`. */
export const api = {
  get: (path, opts) => request('GET', path, undefined, opts),
  post: (path, body, opts) => request('POST', path, body, opts),
  put: (path, body, opts) => request('PUT', path, body, opts),
  patch: (path, body, opts) => request('PATCH', path, body, opts),
  delete: (path, opts) => request('DELETE', path, undefined, opts),
};

/**
 * Archivos privados (recibos, planos): se piden con la sesión y se abren o descargan desde memoria.
 * `view` abre en otra pestaña (PDF e imágenes); si no, descarga con `fileName`.
 */
export const openPrivateFile = async (path, { view = false, fileName = 'archivo' } = {}) => {
  // La pestaña se abre antes del pedido para que el navegador no la bloquee como popup.
  const tab = view ? window.open('', '_blank') : null;
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API_URL + path, { headers });
  if (!res.ok) {
    tab?.close();
    const data = await res.json().catch(() => null);
    if (res.status === 401) onUnauthorized();
    throw new ApiError(res.status, data);
  }
  const url = URL.createObjectURL(await res.blob());
  if (tab) tab.location.href = url;
  else Object.assign(document.createElement('a'), { href: url, download: fileName }).click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

/** Baja un archivo privado y devuelve una URL local (blob) para mostrarlo dentro de la app. */
export const fetchPrivateBlob = async (path) => {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API_URL + path, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    if (res.status === 401) onUnauthorized();
    throw new ApiError(res.status, data);
  }
  return URL.createObjectURL(await res.blob());
};

/** Mensaje legible de cualquier error de la API. */
export const errorMessage = (error, fallback = 'Ocurrió un error inesperado.') => {
  if (!error?.response) return error?.message === 'Network Error' ? 'No hay conexión con el servidor.' : fallback;
  return error.response.data?.message || fallback;
};

/** Errores por campo (`{ username: '...' }`) que devuelve la API en las validaciones. */
export const fieldErrors = (error) => {
  const errors = error?.response?.data?.errors;
  return errors && !Array.isArray(errors) ? errors : {};
};
