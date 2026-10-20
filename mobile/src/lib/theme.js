/** Sistema visual SRV: negro + azul #0B78FB + naranja #F6950A, títulos en 900 (mismo que el front web). */
export const C = {
  bg: '#000000',
  surface: '#0d0d0d',
  surface2: '#161616',
  border: '#242424',
  text: '#ffffff',
  text2: '#e0e0e0',
  text3: '#a0a0a0',
  primary: '#0B78FB',
  accent: '#F6950A',
  ok: '#3ccf7a',
  warn: '#f6b14a',
  danger: '#ff6b6b',
};

export const R = 12;

export const type = {
  h1: { fontSize: 28, fontWeight: '900', letterSpacing: -0.6, color: C.text },
  h2: { fontSize: 20, fontWeight: '900', letterSpacing: -0.4, color: C.text },
  h3: { fontSize: 16, fontWeight: '800', color: C.text },
  body: { fontSize: 15, color: C.text2, lineHeight: 21 },
  small: { fontSize: 13, color: C.text3, lineHeight: 18 },
  overline: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: C.text3 },
  mono: { fontFamily: 'monospace', fontWeight: '800', color: C.text },
};
