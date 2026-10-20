import { useRef } from 'react';
import { Button } from '@mui/material';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';

/**
 * Botón que abre el selector de imágenes. Valida tipo y tamaño antes de mandar nada
 * (la API vuelve a validar el contenido real del archivo).
 */
const ImagePicker = ({ onPick, onError, children, ...buttonProps }) => {
  const input = useRef(null);

  const handle = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // Permite elegir el mismo archivo otra vez.
    if (!file) return;
    if (!ACCEPT.split(',').includes(file.type)) return onError?.('Elegí una imagen PNG, JPG, WEBP o GIF.');
    if (file.size > MAX_IMAGE_BYTES) return onError?.('La imagen pesa más de 5 MB.');
    onPick(file);
  };

  return (
    <>
      <Button {...buttonProps} onClick={() => input.current?.click()}>
        {children}
      </Button>
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={handle} />
    </>
  );
};

export default ImagePicker;
