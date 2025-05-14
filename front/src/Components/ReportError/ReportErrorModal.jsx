import React, { useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  TextField,
  IconButton
} from '@mui/material';

import Tooltip from '@mui/material/Tooltip'; // ya importado con MUI

import CloseIcon from '@mui/icons-material/Close';
import styles from './style.module.css';

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
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('entry.1466397243', description);
    files.forEach(file => {
      formData.append('entry.0987654321', file);
    });

    try {
      await fetch('https://docs.google.com/forms/d/e/1FAIpQLSebVonRj5bu35WZxzPwZ4ZgAoNm_gbkZjnGCsKXeFB5LrFbNg/formResponse', {
        method: 'POST',
        mode: 'no-cors',
        body: formData,
      });
      alert('Reporte enviado correctamente. ¡Gracias!');
      setDescription('');
      setFiles([]);
      handleClose();
    } catch (error) {
      console.error('Error al enviar reporte:', error);
      alert('No se pudo enviar el reporte');
    }
  };

  return (
    <>
      <Tooltip title="Reportar un error" arrow placement="left">
        <div className={styles.reportButton} onClick={handleOpen}>
          !
        </div>
      </Tooltip>

      <Modal open={open} onClose={handleClose}>
        <Box sx={modalStyle}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Reportar un error</Typography>
            <IconButton onClick={handleClose}>
              <CloseIcon />
            </IconButton>
          </Box>
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <TextField
              multiline
              rows={4}
              fullWidth
              label="Describí paso por paso lo que ocurrió"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="normal"
              required
            />
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              style={{ marginTop: '16px', marginBottom: '16px' }}
            />
            <Box display="flex" justifyContent="flex-end" gap={1}>
              <Button variant="contained" type="submit">Enviar</Button>
              <Button onClick={handleClose}>Cerrar</Button>
            </Box>
          </form>
        </Box>
      </Modal>
    </>
  );
};

export default ReportErrorModal;
