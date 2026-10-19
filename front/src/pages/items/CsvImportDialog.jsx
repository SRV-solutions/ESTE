import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined';
import { useFeedback } from '../../context/FeedbackContext';
import { api, errorMessage } from '../../lib/api';

const COLUMNS = [
  ['nombre', 'Nombre de la categoría'],
  ['descripcion', 'Descripción'],
  ['codigo', 'Código de la categoría (prefijo de los ítems)'],
  ['tipo', 'Tipo: cable, baúl, pantalla…'],
  ['unidad', 'Unidad: mts, unidad…'],
  ['valor', 'Valor (número)'],
  ['peso', 'Peso (número)'],
  ['es_almacenable', '"si" o "no"'],
  ['es_contenedor', '"si" o "no"'],
  ['cantidad', 'Cuántos ítems crear (1 a 1000)'],
  ['usos', 'Usos previos (opcional)'],
];

const EXAMPLE = `nombre,descripcion,codigo,tipo,unidad,valor,peso,es_almacenable,es_contenedor,cantidad,usos
Cable HDMI 10m,Cable HDMI de alta velocidad,HDMI10M,cable,mts,15.5,0.2,si,no,10,0
Baúl azul,Baúl para cables,BAUL-AZUL,baul,unidad,200,15,no,si,2,0
`;

const downloadExample = () => {
  const url = URL.createObjectURL(new Blob([EXAMPLE], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'eventbox_ejemplo_items.csv' });
  a.click();
  URL.revokeObjectURL(url);
};

/** Carga masiva de stock desde un CSV (separado por coma o punto y coma). */
const CsvImportDialog = ({ open, onClose, onImported }) => {
  const { notify } = useFeedback();
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open) {
      setFile(null);
      setError('');
    }
  }, [open]);

  const upload = async () => {
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/items/import', form);
      notify(data.message);
      onImported();
    } catch (err) {
      setError(errorMessage(err, 'No se pudo procesar el archivo.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onClose={uploading ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>Importar stock desde CSV</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Cada fila crea N ítems de una categoría. Si el código de categoría no existe, se crea. Se importa el archivo
            entero o nada: si una fila tiene un error, no se guarda ninguna.{' '}
            <Link component="button" onClick={downloadExample} sx={{ verticalAlign: 'baseline' }}>
              Descargar ejemplo
            </Link>
          </Typography>

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Columna</TableCell>
                  <TableCell>Qué va</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {COLUMNS.map(([name, desc]) => (
                  <TableRow key={name}>
                    <TableCell sx={{ fontFamily: 'ui-monospace, monospace', fontWeight: 700 }}>{name}</TableCell>
                    <TableCell>{desc}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Button component="label" variant="outlined" startIcon={<UploadFileOutlined />} sx={{ alignSelf: 'flex-start' }}>
            {file ? file.name : 'Elegir archivo .csv'}
            <input hidden type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Button>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={uploading}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={upload} disabled={!file || uploading}>
          {uploading ? 'Importando…' : 'Importar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CsvImportDialog;
