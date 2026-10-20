import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

/**
 * Cliente de la API de Event Box. El token y la URL del servidor se guardan en el almacenamiento
 * seguro del teléfono. La URL se puede cambiar desde la pantalla de ingreso (para probar contra
 * la PC en la red local o contra producción).
 */

const TOKEN_KEY = 'eventbox.token';
const URL_KEY = 'eventbox.apiUrl';
const DEFAULT_URL = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';

let baseUrl = DEFAULT_URL;
let token = null;
let onUnauthorized = () => {};

export const session = {
  async load() {
    const [t, u] = await Promise.all([SecureStore.getItemAsync(TOKEN_KEY), SecureStore.getItemAsync(URL_KEY)]);
    token = t;
    baseUrl = u || DEFAULT_URL;
    return { token, baseUrl };
  },
  async setToken(value) {
    token = value;
    if (value) await SecureStore.setItemAsync(TOKEN_KEY, value);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
  async setBaseUrl(value) {
    baseUrl = (value || DEFAULT_URL).replace(/\/+$/, '');
    if (value) await SecureStore.setItemAsync(URL_KEY, baseUrl);
    else await SecureStore.deleteItemAsync(URL_KEY);
  },
  get baseUrl() {
    return baseUrl;
  },
  get token() {
    return token;
  },
  defaultUrl: DEFAULT_URL,
  /** El AuthProvider se suscribe para cerrar la sesión cuando la API responde 401. */
  onUnauthorized(fn) {
    onUnauthorized = fn;
  },
};

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

const request = async (method, path, { body, params, form, timeout = 15000 } = {}) => {
  const url = new URL(baseUrl + path);
  if (params) Object.entries(params).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && url.searchParams.set(k, v));
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  let res;
  try {
    res = await fetch(url.toString(), { method, headers, body: form || (body ? JSON.stringify(body) : undefined), signal: controller.signal });
  } catch (err) {
    throw new ApiError(0, err.name === 'AbortError' ? 'El servidor no responde. Revisá la conexión y la dirección del servidor.' : `No se pudo conectar con ${baseUrl}.`);
  } finally {
    clearTimeout(timer);
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/auth/')) onUnauthorized();
    throw new ApiError(res.status, data?.message || `Error ${res.status}`, data?.errors);
  }
  return data;
};

export const api = {
  get: (path, params) => request('GET', path, { params }),
  post: (path, body) => request('POST', path, { body }),
  postForm: (path, form) => request('POST', path, { form, timeout: 60000 }),
  patch: (path, body) => request('PATCH', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  delete: (path) => request('DELETE', path),
};

export const errorMessage = (err, fallback = 'Algo salió mal.') => err?.message || fallback;

/** URL absoluta de un archivo público (logo, avatar). */
export const fileUrl = (value) => (value && !/^https?:/.test(value) ? `${baseUrl}${value}` : value);

/** Descarga un archivo privado (recibo, plano) con el token y devuelve la ruta local. */
export const downloadPrivate = async (path, fileName) => {
  const { File, Paths } = await import('expo-file-system');
  const destination = new File(Paths.cache, fileName);
  if (destination.exists) destination.delete();
  const task = File.createDownloadTask(baseUrl + path, destination, { headers: { Authorization: `Bearer ${token}` } });
  const file = await task.downloadAsync();
  if (!file) throw new ApiError(0, 'No se pudo descargar el archivo.');
  return file;
};
