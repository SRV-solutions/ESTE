import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import LostBox from '../components/LostBox';

/** 404 dentro de la app: la dirección no existe (un link viejo, mal escrito o una sección que se movió). */
const NotFoundPage = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  return (
    <Stack alignItems="center" spacing={2} sx={{ py: { xs: 5, sm: 8 }, px: 2, textAlign: 'center' }}>
      <LostBox />
      <Typography
        sx={{
          fontWeight: 900,
          fontSize: { xs: 64, sm: 88 },
          lineHeight: 1,
          letterSpacing: '-0.04em',
          background: 'linear-gradient(135deg, #5AA6FF 0%, #0B78FB 55%, #F6950A 100%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        404
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 900 }}>
        Esta página no está en el depósito
      </Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 460 }}>
        Buscamos en todas las cajas y no la encontramos. Puede que el link esté mal escrito o que la sección se haya movido.
      </Typography>
      <Box
        component="code"
        sx={{ px: 1.25, py: 0.5, borderRadius: 1.5, bgcolor: 'action.hover', color: 'text.secondary', fontSize: 13, maxWidth: '100%', overflowWrap: 'anywhere' }}
      >
        {pathname}
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ pt: 1, width: { xs: '100%', sm: 'auto' } }}>
        <Button variant="contained" size="large" startIcon={<HomeOutlined />} onClick={() => navigate('/')}>
          Ir al inicio
        </Button>
        <Button variant="outlined" size="large" startIcon={<ArrowBack />} onClick={() => navigate(-1)}>
          Volver atrás
        </Button>
      </Stack>
    </Stack>
  );
};

export default NotFoundPage;
