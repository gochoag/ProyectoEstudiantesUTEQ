import { useState, useEffect, useCallback } from 'react';
import { isAuthenticated, clearAuthData, startTokenValidationInterval, willTokenExpireSoon } from '../utils/auth';

/**
 * Hook personalizado para manejar la autenticación
 * @param {function} onTokenExpired - Callback a ejecutar cuando el token expire
 * @returns {object} - Estado y funciones de autenticación
 */
export const useAuth = (onTokenExpired) => {
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    isLoading: true,
    tokenWillExpireSoon: false
  });

  // Función para verificar el estado de autenticación
  const checkAuthStatus = useCallback(() => {
    try {
      const isAuth = isAuthenticated();
      const willExpire = willTokenExpireSoon();
      
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: isAuth,
        tokenWillExpireSoon: willExpire,
        isLoading: false
      }));
      
      return isAuth;
    } catch (error) {
      console.error('Error verificando estado de autenticación:', error);
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        tokenWillExpireSoon: false
      });
      return false;
    }
  }, []);

  // Función para manejar logout
  const logout = useCallback(() => {
    clearAuthData();
    setAuthState({
      isAuthenticated: false,
      isLoading: false,
      tokenWillExpireSoon: false
    });
    
    if (onTokenExpired) {
      onTokenExpired();
    }
  }, [onTokenExpired]);

  // Verificar autenticación al montar el componente
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Configurar verificación periódica del token
  useEffect(() => {
    let cleanupInterval = null;
    
    if (authState.isAuthenticated) {
      cleanupInterval = startTokenValidationInterval(() => {
        console.warn('Token expirado detectado por useAuth');
        logout();
      }, 60000); // Verificar cada minuto
    }
    
    return () => {
      if (cleanupInterval) {
        cleanupInterval();
      }
    };
  }, [authState.isAuthenticated, logout]);

  return {
    ...authState,
    checkAuthStatus,
    logout
  };
};

/**
 * Hook para obtener información del usuario autenticado
 * @returns {object} - Información del usuario
 */
export const useUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const userData = localStorage.getItem('usuario');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error obteniendo datos del usuario:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback((newUserData) => {
    try {
      localStorage.setItem('usuario', JSON.stringify(newUserData));
      setUser(newUserData);
    } catch (error) {
      console.error('Error actualizando datos del usuario:', error);
    }
  }, []);

  return {
    user,
    loading,
    updateUser
  };
};