import axios from 'axios';
import { getStoredToken, isTokenExpired, redirectToLogin, clearAuthData } from '../utils/auth';

// Cliente centralizado de API
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3000'),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adjuntar token en cada solicitud
api.interceptors.request.use((config) => {
  try {
    const token = getStoredToken();
    
    // Verificar si el token existe y no ha expirado antes de enviarlo
    if (token) {
      if (isTokenExpired(token)) {
        console.warn('Token expirado detectado antes de enviar petición');
        redirectToLogin('token_expired_before_request');
        return Promise.reject(new Error('Token expirado'));
      }
      
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.warn('Error en interceptor de request:', error);
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor para manejar respuestas y redirigir cuando el token expira
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const data = error.response?.data || {};
    const headers = error.response?.headers || {};

    // Manejar errores de autenticación (401)
    if (status === 401) {
      const redirectHeader = headers['x-redirect-to'] || headers['location'] || headers['Location'];
      const redirectTarget = data.redirect_to || redirectHeader;
      
      // Casos donde debemos redirigir al login
      const shouldRedirect = 
        data.error_code === 'AUTH_TOKEN_EXPIRED' ||
        data.error_code === 'AUTH_TOKEN_INVALID' ||
        data.error_code === 'AUTH_REQUIRED' ||
        redirectTarget ||
        data.message?.toLowerCase().includes('token') ||
        data.error?.toLowerCase().includes('token') ||
        data.message?.toLowerCase().includes('unauthorized') ||
        data.error?.toLowerCase().includes('unauthorized');

      if (shouldRedirect) {
        console.warn('Error de autenticación detectado:', {
          status,
          error_code: data.error_code,
          message: data.message || data.error,
          redirectTarget
        });
        
        redirectToLogin('auth_error_401');
        return Promise.reject(error);
      }
    }

    // Manejar errores de token expirado (403)
    if (status === 403) {
      const isForbiddenDueToToken = 
        data.error_code === 'AUTH_TOKEN_EXPIRED' ||
        data.message?.toLowerCase().includes('token') ||
        data.error?.toLowerCase().includes('token');
        
      if (isForbiddenDueToToken) {
        console.warn('Token expirado detectado (403):', data);
        redirectToLogin('token_expired_403');
        return Promise.reject(error);
      }
    }

    // Manejar errores de red o servidor que podrían indicar problemas de sesión
    if (!error.response && error.code === 'NETWORK_ERROR') {
      console.warn('Error de red detectado, verificando token...');
      const token = getStoredToken();
      if (token && isTokenExpired(token)) {
        redirectToLogin('network_error_with_expired_token');
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

