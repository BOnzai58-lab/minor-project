import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Stack,
  TextField,
  Typography,
  Avatar,
  Chip,
} from '@mui/material';
import { AutoGraph as AutoGraphIcon } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({ username: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const username = formData.username.trim();
      if (mode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        await register(username, formData.password);
        setSuccess('Registration successful. Please login.');
        setMode('login');
      } else {
        await login(username, formData.password);
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        background:
          'radial-gradient(circle at 15% 20%, rgba(47,110,144,0.2) 0%, rgba(238,244,248,1) 45%), linear-gradient(135deg, #eef4f8 0%, #f8fbfd 100%)',
      }}
    >
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Card sx={{ borderRadius: 4, overflow: 'hidden' }}>
          <Box
            sx={{
              px: 4,
              py: 3,
              background: 'linear-gradient(120deg, #145374 0%, #2f6e90 100%)',
              color: 'white',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                <AutoGraphIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Smart Inventory Management
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Forecast-driven inventory operations
                </Typography>
              </Box>
            </Stack>
          </Box>

          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </Typography>
              <Chip
                label={mode === 'login' ? 'Sign In' : 'Register'}
                color={mode === 'login' ? 'primary' : 'secondary'}
                size="small"
              />
            </Stack>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {mode === 'login'
                ? 'Sign in to access your inventory dashboard.'
                : 'Create a user account for this prototype environment.'}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Username"
                name="username"
                margin="normal"
                value={formData.username}
                onChange={handleChange}
                required
              />
              <TextField
                fullWidth
                label="Password"
                name="password"
                type="password"
                margin="normal"
                value={formData.password}
                onChange={handleChange}
                required
              />
              {mode === 'register' && (
                <TextField
                  fullWidth
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  margin="normal"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              )}
              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ mt: 2, py: 1.2 }}
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                ) : mode === 'login' ? (
                  'Login'
                ) : (
                  'Register'
                )}
              </Button>
              <Button
                type="button"
                variant="text"
                fullWidth
                sx={{ mt: 1 }}
                onClick={() => {
                  setMode((prev) => (prev === 'login' ? 'register' : 'login'));
                  setError(null);
                  setSuccess(null);
                }}
                disabled={loading}
              >
                {mode === 'login' ? 'Create a new account' : 'Back to login'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default Login;
