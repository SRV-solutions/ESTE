import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { BySrv, SortexLogo, SortexMark } from '../components/Brand';
import { APP_TAGLINE } from '../config';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../lib/api';
import { BRAND } from '../theme';

const LoginPage = () => {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (status === 'authenticated') return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username.trim(), form.password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'No se pudo iniciar sesión.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' } }}>
      {/* Panel de marca */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 6,
          bgcolor: BRAND.black,
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <SortexLogo size={36} fontSize={22} color="#fff" />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography sx={{ fontWeight: 900, fontSize: 48, lineHeight: 1.05, letterSpacing: '-0.03em', maxWidth: 520 }}>
            Ordená tu stock.{' '}
            <Box component="span" sx={{ color: BRAND.blue }}>
              Armá cada evento
            </Box>{' '}
            sin sorpresas
            <Box component="span" sx={{ color: BRAND.orange }}>
              .
            </Box>
          </Typography>
          <Typography sx={{ mt: 2, color: '#a0a0a0', maxWidth: 440 }}>
            Inventario, contenedores y órdenes de servicio en un solo lugar, para empresas de eventos.
          </Typography>
        </Box>
        <BySrv sx={{ color: '#a0a0a0' }} />
        <Box sx={{ position: 'absolute', right: -120, bottom: -120, opacity: 0.12 }}>
          <SortexMark size={460} />
        </Box>
      </Box>

      {/* Formulario */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 3, sm: 6 } }}>
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%', maxWidth: 380 }}>
          <Box sx={{ display: { md: 'none' }, mb: 4 }}>
            <SortexLogo size={36} fontSize={22} />
            <Typography color="text.secondary" sx={{ mt: 1.5 }}>
              {APP_TAGLINE}
            </Typography>
          </Box>
          <Typography variant="h4" component="h1">
            Iniciar sesión
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
            Entrá con el usuario que te dio tu empresa.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Usuario"
              name="username"
              autoComplete="username"
              autoFocus
              size="medium"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
            <TextField
              label="Contraseña"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              size="medium"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((v) => !v)}
                      edge="end"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {error && <Alert severity="error">{error}</Alert>}
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={loading || !form.username || !form.password}
              sx={{ py: 1.25 }}
            >
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </Stack>
          <Box sx={{ display: { md: 'none' }, mt: 4, textAlign: 'center' }}>
            <BySrv />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
