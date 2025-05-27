import { useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
} from '@mui/material';
import { useLocation } from 'react-router-dom';

import Tooltip from '@mui/material/Tooltip';
import CloseIcon from '@mui/icons-material/Close';
import styles from './style.module.css';
import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL;

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 500,
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

const ReportErrorModal = () => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState([]);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleFileChange = (e) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const uploadFileToBackend = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(
        `${apiUrl}/reports/upload-file`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      // backend debe responder con la URL pública del archivo
      return res.data.fileUrl;
    } catch (error) {
      console.error('Error uploading file to backend:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // 1. Subir todos los archivos al backend
      const uploadedFileUrls = await Promise.all(files.map(uploadFileToBackend));

      // 2. Unir los URLs en un string
      const joinedUrls = uploadedFileUrls.join(', ');

      // 3. Preparar datos para Google Forms
      const formData = new FormData();
      formData.append('entry.1466397243', description); // Descripción
      formData.append('entry.1226277495', joinedUrls); // URLs archivos

      // Enviar a Google Forms (fetch con no-cors)
      await fetch(
        'https://docs.google.com/forms/d/e/1FAIpQLSebVonRj5bu35WZxzPwZ4ZgAoNm_gbkZjnGCsKXeFB5LrFbNg/formResponse',
        {
          method: 'POST',
          mode: 'no-cors',
          body: formData,
        }
      );

      alert('Reporte enviado correctamente. ¡Gracias!');
      setDescription('');
      setFiles([]);
      handleClose();
    } catch (err) {
      console.error('Error al enviar reporte:', err);
      alert('No se pudo enviar el reporte');
    }
  };
  const location = useLocation();

  const isLoginPage = location.pathname === '/login';
  return (
    <>
      {!isLoginPage  && <Tooltip title="Reportar un error" arrow placement="left">
        <div className={styles.reportButton} onClick={handleOpen}>
          !
        </div>
      </Tooltip>}

      <Modal open={open} onClose={handleClose}>
        <Box sx={modalStyle}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">Reportar un error</Typography>
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
          <form onSubmit={handleSubmit}>
            <TextField
              multiline
              rows={4}
              fullWidth
              required
              label="Describí paso por paso lo que ocurrió"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="normal"
            />
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              style={{ marginTop: 16, marginBottom: 16 }}
            />
            <Box display="flex" justifyContent="flex-end" gap={1}>
              <Button variant="contained" type="submit">
                Enviar
              </Button>
              <Button onClick={handleClose}>Cerrar</Button>
            </Box>
          </form>
        </Box>
      </Modal>
    </>
  );
};

export default ReportErrorModal;
