import { useEffect, useRef, useState } from 'react';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';

/** pdf.js se descarga recién la primera vez que se abre un PDF en el celular. */
let pdfjsPromise = null;
const loadPdfjs = () => {
  pdfjsPromise ??= Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.js?url')]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  });
  return pdfjsPromise;
};

/**
 * Muestra las páginas de un PDF dentro de la app. Se usa en el celular, donde el navegador no puede
 * mostrar un PDF adentro de una página. `zoom` 1 = ancho de la pantalla.
 */
const PdfPages = ({ url, zoom = 1 }) => {
  const box = useRef(null);
  const [doc, setDoc] = useState(null);
  const [error, setError] = useState('');
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let alive = true;
    let task = null;
    setDoc(null);
    setError('');
    loadPdfjs()
      .then((pdfjs) => {
        task = pdfjs.getDocument(url);
        return task.promise;
      })
      .then((d) => alive && setDoc(d))
      .catch(() => alive && setError('No se pudo mostrar el PDF. Probá descargarlo.'));
    return () => {
      alive = false;
      task?.destroy();
    };
  }, [url]);

  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!doc || !width || !box.current) return undefined;
    let cancelled = false;
    const holder = box.current.querySelector('[data-pages]');
    holder.replaceChildren();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    (async () => {
      for (let i = 1; i <= doc.numPages && !cancelled; i += 1) {
        const page = await doc.getPage(i);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const cssWidth = width * zoom;
        const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        Object.assign(canvas.style, { width: `${cssWidth}px`, height: `${(cssWidth * base.height) / base.width}px`, display: 'block', background: '#fff', borderRadius: '4px', margin: '0 auto 12px' });
        holder.appendChild(canvas);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      }
    })().catch(() => !cancelled && setError('No se pudo mostrar el PDF. Probá descargarlo.'));
    return () => {
      cancelled = true;
    };
  }, [doc, width, zoom]);

  return (
    <Box ref={box} sx={{ width: '100%' }}>
      {error && <Alert severity="warning">{error}</Alert>}
      {!doc && !error && (
        <Stack alignItems="center" sx={{ py: 6 }}>
          <CircularProgress />
        </Stack>
      )}
      <Box data-pages />
    </Box>
  );
};

export default PdfPages;
