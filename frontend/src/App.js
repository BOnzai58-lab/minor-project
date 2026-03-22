import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Predictions from './pages/Predictions';
import Inventory from './pages/Inventory';
import AdminPanel from './pages/AdminPanel';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#145374',
      dark: '#0f3f58',
      light: '#2f6e90',
    },
    secondary: {
      main: '#f08a5d',
      dark: '#d66e42',
      light: '#f5a47f',
    },
    background: {
      default: '#eef4f8',
      paper: '#ffffff',
    },
    success: {
      main: '#2a9d8f',
    },
    warning: {
      main: '#e9a000',
    },
  },
  typography: {
    fontFamily: '"Manrope", "Poppins", "Segoe UI", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700, letterSpacing: 0.2 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: 'linear-gradient(90deg, #145374 0%, #2f6e90 100%)',
          boxShadow: '0 10px 24px rgba(20, 83, 116, 0.24)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 12px 26px rgba(14, 60, 86, 0.1)',
          border: '1px solid rgba(20, 83, 116, 0.08)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 10px 22px rgba(14, 60, 86, 0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          textTransform: 'none',
          fontWeight: 600,
        },
        containedPrimary: {
          background: 'linear-gradient(90deg, #145374 0%, #2f6e90 100%)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppRoutes() {
  const { isAuthenticated, role, user, logout } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      <Route
        path="/dashboard"
        element={(
          <ProtectedRoute allowedRoles={['user', 'admin']}>
            <Layout role={role} username={user?.username} onLogout={logout}>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        )}
      />

      <Route
        path="/predictions"
        element={(
          <ProtectedRoute allowedRoles={['user', 'admin']}>
            <Layout role={role} username={user?.username} onLogout={logout}>
              <Predictions />
            </Layout>
          </ProtectedRoute>
        )}
      />

      <Route
        path="/inventory"
        element={(
          <ProtectedRoute allowedRoles={['user', 'admin']}>
            <Layout role={role} username={user?.username} onLogout={logout}>
              <Inventory />
            </Layout>
          </ProtectedRoute>
        )}
      />

      <Route
        path="/admin"
        element={(
          <ProtectedRoute allowedRoles={['admin']}>
            <Layout role={role} username={user?.username} onLogout={logout}>
              <AdminPanel />
            </Layout>
          </ProtectedRoute>
        )}
      />

      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
}

export default App; 
