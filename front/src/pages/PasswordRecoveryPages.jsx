import { useState } from 'react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { BySrv, EventBoxLogo } from '../components/Brand';
import PasswordField from '../components/PasswordField';
import { useFeedback } from '../context/FeedbackContext';
import { api, errorMessage } from '../lib/api';

const AuthCard = ({ title, subtitle, children }) => (
  <Box sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 3, sm: 6 } }}>
    <Box sx={{ width: '100%', maxWidth: 400 }}>
      <EventBoxLogo size={36} fontSize={22} />
      <Typography variant="h4" component="h1" sx={{ mt: 4 }}>
        {title}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
        {subtitle}
      </Typography>
      {children}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link component={RouterLink} to="/login" variant="body2">
          Volver a iniciar sesión
        </Link>
        <BySrv />
      </Box>
    </Box>
  </Box>
);

/** Pide el link para elegir una contraseña nueva (llega por mail). */
export const ForgotPasswordPage = () => {
  const [identifier, setIdentifier] = useState('');
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/forgot', { identifier: identifier.trim() });
      setSent(data.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Olvidé mi contraseña" subtitle="Ingresá tu usuario o tu email y te mandamos un link para elegir una nueva.">
      {sent ? (
        <Alert severity="success">{sent}</Alert>
      ) : (
        <Stack component="form" spacing={2} onSubmit={submit} noValidate>
          <TextField label="Usuario o email" size="medium" autoFocus value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={loading || !identifier.trim()}>
            {loading ? 'Enviando…' : 'Enviar link'}
          </Button>
        </Stack>
      )}
    </AuthCard>
  );
};

/** Elegir la contraseña nueva desde el link del mail. */
export const ResetPasswordPage = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useFeedback();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const mismatch = confirm && password !== confirm;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/reset', { token, password });
      notify(data.message);
      navigate('/login', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthCard title="Link inválido" subtitle="Abrí el link completo que te llegó por mail, o pedí uno nuevo.">
        <Button component={RouterLink} to="/forgot-password" variant="contained">
          Pedir un link nuevo
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Elegí tu contraseña nueva" subtitle="Mínimo 6 caracteres. Después entrás con ella.">
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        <PasswordField label="Contraseña nueva" size="medium" autoFocus autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <PasswordField
          label="Repetir contraseña"
          size="medium"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={!!mismatch}
          helperText={mismatch ? 'No coincide' : ' '}
        />
        {error && (
          <Alert
            severity="error"
            action={
              <Button component={RouterLink} to="/forgot-password" color="inherit" size="small">
                Pedir otro
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        <Button type="submit" variant="contained" size="large" disabled={loading || password.length < 6 || password !== confirm}>
          {loading ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </Stack>
    </AuthCard>
  );
};
