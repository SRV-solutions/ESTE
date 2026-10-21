import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import IosShareOutlined from '@mui/icons-material/IosShareOutlined';
import { api } from '../lib/api';
import AddToHomeScreenOutlined from '@mui/icons-material/AddToHomeScreenOutlined';

const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);
const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

/** El navegador avisa cuando la app se puede instalar (Android/Chrome): se guarda el evento para disparar el prompt. */
let installPrompt = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installPrompt = e;
  });
}

/**
 * "Llevar Event Box al celular": en la computadora muestra un QR con la dirección del sitio; en el
 * celular ofrece agregarla a la pantalla de inicio (abre como una app, con el ícono de Event Box).
 */
const InstallDialog = ({ open, onClose }) => {
  const [qr, setQr] = useState(null);
  const [linkError, setLinkError] = useState('');
  const url = window.location.origin;
  const phone = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // El QR lleva un link de un solo uso que entra con tu usuario; vence a los 5 minutos, así que se renueva mientras el diálogo está abierto.
  useEffect(() => {
    if (!open || phone) return;
    let alive = true;
    const make = async () => {
      try {
        const { data } = await api.post('/auth/link');
        const m = await import('qrcode');
        const img = await m.toDataURL(data.url, { width: 220, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
        if (alive) {
          setQr(img);
          setLinkError('');
        }
      } catch {
        if (alive) setLinkError('No se pudo generar el código. Probá de nuevo.');
      }
    };
    make();
    const timer = setInterval(make, 4 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [open, phone]);

  const install = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Event Box en el celular</DialogTitle>
      <DialogContent>
        {isStandalone() ? (
          <Typography>Ya estás usando Event Box instalada en este dispositivo.</Typography>
        ) : phone ? (
          <Stack spacing={1.5}>
            <Typography>Agregala a la pantalla de inicio: queda con el ícono de Event Box y abre a pantalla completa.</Typography>
            {isIos() ? (
              <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 0.75 } }}>
                <li>
                  Tocá el botón <b>Compartir</b> de Safari (<IosShareOutlined sx={{ fontSize: 16, verticalAlign: 'middle' }} />).
                </li>
                <li>
                  Elegí <b>Agregar a inicio</b>.
                </li>
                <li>Confirmá con <b>Agregar</b>.</li>
              </Box>
            ) : installPrompt ? (
              <Button variant="contained" startIcon={<AddToHomeScreenOutlined />} onClick={install}>
                Agregar a la pantalla de inicio
              </Button>
            ) : (
              <Box component="ol" sx={{ pl: 2.5, m: 0, '& li': { mb: 0.75 } }}>
                <li>Abrí el menú del navegador (los tres puntos).</li>
                <li>
                  Tocá <b>Agregar a la pantalla principal</b> o <b>Instalar app</b>.
                </li>
              </Box>
            )}
          </Stack>
        ) : (
          <Stack spacing={1.5} alignItems="center" sx={{ textAlign: 'center' }}>
            <Typography>Escaneá el código con la cámara del celular: abre Event Box y entra con tu usuario, sin escribir la contraseña.</Typography>
            {qr ? <Box component="img" src={qr} alt="QR" sx={{ width: 220, height: 220, borderRadius: 2 }} /> : <Box sx={{ width: 220, height: 220, borderRadius: 2, bgcolor: 'action.hover' }} />}
            {linkError && (
              <Typography variant="body2" color="error">
                {linkError}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {url.replace(/^https?:\/\//, '')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              El código sirve una sola vez y vence a los 5 minutos: no lo compartas ni lo captures. Después, en el celular, el mismo botón te explica cómo dejarla en la pantalla de inicio.
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default InstallDialog;
