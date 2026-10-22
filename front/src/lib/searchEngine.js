/**
 * Motor de búsqueda de Event Box (la misma lógica está en api/src/utils/searchEngine.ts).
 *
 * Arma un índice invertido: cada palabra (en su "forma fonética") apunta a los resultados que la tienen.
 * Al buscar, cada palabra de la consulta se compara con el vocabulario del índice:
 *   - igual, o el comienzo de una palabra ("cab" → cable);
 *   - con errores de tipeo (1 letra en palabras cortas, 2 en largas: "boul" → baúl);
 *   - por cómo suena en castellano (b/v, c/s/z, h muda, ll/y, sin tildes: "vaul" → baúl);
 *   - por sinónimos del rubro ("cajón" → baúl, case, rack, contenedor).
 */

/** Palabras que no ayudan a encontrar nada. */
const STOP = new Set(
  'a al algo como con cual de del donde el en es esa ese esta este hay la las le lo los me mi mis o para por que quiero se su sus te tengo un una uno unos unas y ya yo necesito puedo hacer quisiera'.split(' '),
);

/** Grupos de palabras que se buscan como si fueran la misma (rubro eventos + la app). */
export const SYNONYMS = [
  ['baul', 'cajon', 'caja', 'case', 'flightcase', 'rack', 'contenedor', 'anvil', 'arcon', 'valija', 'estuche', 'cofre'],
  ['parlante', 'bafle', 'baffle', 'altavoz', 'speaker', 'bocina', 'sonido', 'audio'],
  ['luz', 'iluminacion', 'reflector', 'tacho', 'foco', 'lampara', 'beam', 'spot', 'robotica', 'cabezal'],
  ['microfono', 'mic', 'micro', 'inalambrico'],
  ['consola', 'mixer', 'mezcladora', 'mezclador'],
  ['pantalla', 'monitor', 'televisor', 'tv', 'proyector', 'display', 'led'],
  ['cable', 'cableado', 'alargue', 'extension', 'zapatilla', 'prolongador', 'manguera'],
  ['tarima', 'escenario', 'practicable', 'plataforma', 'tablado', 'stage'],
  ['truss', 'estructura', 'torre'],
  ['generador', 'electrogeno', 'grupo'],
  ['silla', 'butaca', 'banqueta', 'taburete'],
  ['mesa', 'tablon', 'tabla'],
  ['carpa', 'gazebo', 'toldo'],
  ['camion', 'flete', 'transporte', 'logistica', 'traslado', 'chofer', 'vehiculo', 'camioneta'],
  ['orden', 'pedido', 'remito', 'os'],
  ['evento', 'fiesta', 'show', 'recital', 'casamiento', 'boda', 'congreso', 'corporativo', 'cumpleanos', 'gala'],
  ['lugar', 'salon', 'venue', 'locacion', 'estadio', 'predio', 'hotel', 'quinta'],
  ['persona', 'empleado', 'usuario', 'personal', 'gente', 'staff', 'colaborador', 'tecnico', 'trabajador'],
  ['sueldo', 'salario', 'recibo', 'haberes', 'nomina', 'liquidacion'],
  ['plano', 'layout', 'croquis', 'dibujo', 'diagrama', 'autocad', 'dwg'],
  ['crear', 'nuevo', 'nueva', 'agregar', 'alta', 'cargar', 'sumar', 'anadir', 'registrar', 'subir'],
  ['borrar', 'eliminar', 'quitar', 'sacar', 'baja'],
  ['item', 'articulo', 'producto', 'equipo', 'material', 'elemento', 'cosa', 'objeto', 'unidad'],
  ['stock', 'inventario', 'deposito', 'almacen', 'galpon'],
  ['categoria', 'tipo', 'familia', 'rubro', 'clase'],
  ['contrasena', 'clave', 'password', 'pin'],
  ['reporte', 'informe', 'estadistica', 'metrica', 'grafico'],
];

/** Minúsculas y sin tildes. */
export const fold = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export const words = (s) => fold(s).split(/[^a-z0-9]+/).filter(Boolean);

/** Forma "como suena" de una palabra en castellano. Los códigos con números quedan igual. */
export const phon = (w) => {
  if (/\d/.test(w)) return w;
  let s = w
    .replace(/ch/g, 'X')
    .replace(/gu([ei])/g, 'G$1')
    .replace(/g([ei])/g, 'j$1')
    .replace(/G/g, 'g')
    .replace(/qu/g, 'k')
    .replace(/c([ei])/g, 's$1')
    .replace(/c/g, 'k')
    .replace(/z/g, 's')
    .replace(/[vw]/g, 'b')
    .replace(/ll/g, 'y')
    .replace(/h/g, '')
    .replace(/X/g, 'ch')
    .replace(/x/g, 'ks')
    .replace(/(.)\1+/g, '$1');
  if (s.length > 3 && s.endsWith('s')) s = s.slice(0, -1); // plurales
  if (s.length > 1 && s.endsWith('y')) s = `${s.slice(0, -1)}i`;
  return s || w;
};

/** Distancia de edición (con transposiciones), cortando apenas supera `max`. */
const distance = (a, b, max) => {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2 = null;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      if (v < best) best = v;
    }
    if (best > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
};

const allowedTypos = (len) => (len <= 3 ? 0 : len <= 5 ? 1 : 2);

/** Qué tan bien la palabra buscada `q` coincide con la palabra del índice `t` (0 a 1). */
export const tokenScore = (q, t) => {
  if (q === t) return 1;
  if (q.length >= 2 && t.startsWith(q)) return 0.82 + 0.1 * (q.length / t.length);
  // Errores de tipeo: casi nunca en la primera letra (así "claudio" no trae "audio").
  if (q[0] !== t[0]) return 0;
  const max = allowedTypos(q.length);
  if (!max) return 0;
  const d = distance(q, t, max);
  if (d <= max) return d === 1 ? 0.72 : 0.6;
  if (t.length > q.length) {
    const dp = distance(q, t.slice(0, q.length), max);
    if (dp <= max) return 0.58;
  }
  return 0;
};

const SYN_KEYS = SYNONYMS.map((group) => group.map(phon));

/** Palabras equivalentes a `key` por sinónimo (con su peso). */
const synonymsOf = (key) => {
  const out = new Map();
  if (key.length < 3) return out;
  for (const group of SYN_KEYS) {
    let match = 0;
    for (const k of group) match = Math.max(match, k.length >= 3 ? tokenScore(key, k) : key === k ? 1 : 0);
    if (match < 0.8) continue; // solo exacta o por comienzo: un error de tipeo en un sinónimo trae cualquier cosa
    for (const k of group) if (k !== key) out.set(k, Math.max(out.get(k) ?? 0, 0.8 * match));
  }
  return out;
};

/**
 * Índice de búsqueda. `add(doc, campos)` con campos `[[texto, peso], ...]` (peso 1 = título).
 * `search(consulta, { limit, filter })` devuelve los documentos ordenados por relevancia.
 */
export class SearchIndex {
  constructor() {
    this.docs = [];
    this.postings = new Map(); // forma fonética -> Map(índice del doc -> peso)
  }

  add(doc, fields) {
    const id = this.docs.push(doc) - 1;
    for (const [text, weight] of fields) {
      for (const w of words(text)) {
        const key = phon(w);
        let docs = this.postings.get(key);
        if (!docs) this.postings.set(key, (docs = new Map()));
        if ((docs.get(id) ?? 0) < weight) docs.set(id, weight);
      }
    }
    return this;
  }

  search(query, { limit = 20, filter } = {}) {
    const all = words(query);
    const terms = all.filter((w) => !STOP.has(w));
    const keys = (terms.length ? terms : all).map(phon);
    if (!keys.length) return [];

    const totals = new Map(); // doc -> { sum, matched }
    for (const key of keys) {
      // Palabras del vocabulario que coinciden con esta palabra de la consulta (o con un sinónimo).
      const candidates = new Map();
      const synonyms = synonymsOf(key);
      for (const vocab of this.postings.keys()) {
        let s = tokenScore(key, vocab);
        for (const [syn, w] of synonyms) if (s < w) s = Math.max(s, (vocab === syn || (syn.length >= 3 && vocab.startsWith(syn)) ? 1 : 0) * w);
        if (s > 0) candidates.set(vocab, s);
      }
      const best = new Map();
      for (const [vocab, s] of candidates) {
        for (const [id, weight] of this.postings.get(vocab)) {
          const v = s * weight;
          if (v > (best.get(id) ?? 0)) best.set(id, v);
        }
      }
      for (const [id, v] of best) {
        const t = totals.get(id) ?? { sum: 0, matched: 0 };
        t.sum += v;
        t.matched += 1;
        totals.set(id, t);
      }
    }

    const needed = Math.ceil(keys.length / 2);
    const results = [];
    for (const [id, { sum, matched }] of totals) {
      if (matched < needed) continue;
      const doc = this.docs[id];
      if (filter && !filter(doc)) continue;
      const score = sum / keys.length + (matched === keys.length ? 0.15 : 0) + (doc.boost ?? 0);
      if (score >= 0.35) results.push({ doc, score });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
