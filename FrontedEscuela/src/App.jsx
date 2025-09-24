
import { useState, useEffect } from 'react';
// Cliente API utiliza token desde localStorage vía interceptores
import api from './api/client';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { isAuthenticated as checkAuth, clearAuthData, startTokenValidationInterval } from './utils/auth';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función para manejar logout cuando el token expire
  const handleTokenExpired = () => {
    console.warn('Token expirado detectado, cerrando sesión...');
    setIsAuthenticated(false);
    setUsuario(null);
    clearAuthData();
  };

  // Verificar si el usuario ya está autenticado al cargar la aplicación
  useEffect(() => {
    const validateAuth = () => {
      try {
        // Usar la nueva función de validación que verifica token y expiración
        const isValidAuth = checkAuth();
        
        if (isValidAuth) {
          const userData = localStorage.getItem('usuario');
          if (userData) {
            setIsAuthenticated(true);
            setUsuario(JSON.parse(userData));
          } else {
            // Si no hay datos de usuario pero el token es válido, limpiar todo
            clearAuthData();
            setIsAuthenticated(false);
            setUsuario(null);
          }
        } else {
          // Token inválido o expirado, limpiar datos
          clearAuthData();
          setIsAuthenticated(false);
          setUsuario(null);
        }
      } catch (error) {
        console.error('Error validando autenticación:', error);
        clearAuthData();
        setIsAuthenticated(false);
        setUsuario(null);
      } finally {
        setLoading(false);
      }
    };

    validateAuth();
  }, []);

  // Iniciar verificación periódica del token cuando el usuario esté autenticado
  useEffect(() => {
    let cleanupInterval = null;
    
    if (isAuthenticated) {
      // Iniciar verificación cada minuto
      cleanupInterval = startTokenValidationInterval(handleTokenExpired, 60000);
    }
    
    // Limpiar intervalo cuando el componente se desmonte o el usuario se desautentique
    return () => {
      if (cleanupInterval) {
        cleanupInterval();
      }
    };
  }, [isAuthenticated]);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUsuario(userData);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUsuario(null);
    clearAuthData();
  };

  // Mostrar pantalla de carga mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>
      {isAuthenticated ? (
        <Dashboard usuario={usuario} onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </>
  );
}

export default App;
