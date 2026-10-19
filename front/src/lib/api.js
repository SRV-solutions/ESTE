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
