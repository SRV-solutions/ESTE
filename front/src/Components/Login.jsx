import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Typography, Alert } from '@mui/material';
const apiUrl = import.meta.env.VITE_API_URL;

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Simulación de petición al backend (reemplaza con tu API real)
      const response = await fetch(`${apiUrl}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        throw new Error('Credenciales incorrectas');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token); // Guarda el token
      localStorage.setItem('userData', JSON.stringify(data.userData)); // Guarda el token
      navigate('/'); // Redirige a una ruta protegida
    } catch (error) {      
      setError(error.message);
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 400,
        margin: '50px auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        textAlign: 'center',
      }}
    >
      <Typography variant="h4">Iniciar Sesión</Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Correo Electrónico"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleInputChange}
          fullWidth
          required
        />
        <TextField
          label="Contraseña"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleInputChange}
          fullWidth
          required
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
        >
          Entrar
        </Button>
      </form>
      {error && <Alert severity="error">{error}</Alert>}
    </Box>
  );
};

export default Login;
