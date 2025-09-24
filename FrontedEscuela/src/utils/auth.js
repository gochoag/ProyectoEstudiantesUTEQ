// Utilidades de autenticación
export const AUTH_STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'usuario',
  IS_AUTHENTICATED: 'isAuthenticated',
  CURRENT_VIEW: 'currentView'
};

/**
 * Decodifica un token JWT sin verificar la firma
 * @param {string} token - Token JWT
 * @returns {object|null} - Payload decodificado o null si es inválido
 */
export const decodeJWT = (token) => {
  try {
    if (!token || typeof token !== 'string') return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch (error) {
    console.warn('Error decodificando token:', error);
    return null;
  }
};

/**
 * Verifica si un token JWT ha expirado
 * @param {string} token - Token JWT
 * @returns {boolean} - true si ha expirado, false si es válido
 */
export const isTokenExpired = (token) => {
  try {
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    console.warn('Error verificando expiración del token:', error);
    return true;
  }
};

/**
 * Obtiene el token del localStorage
 * @returns {string|null} - Token o null si no existe
 */
export const getStoredToken = () => {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEYS.TOKEN);
  } catch (error) {
    console.warn('Error obteniendo token del localStorage:', error);
    return null;
  }
};

/**
 * Verifica si el usuario está autenticado y el token es válido
 * @returns {boolean} - true si está autenticado y el token es válido
 */
export const isAuthenticated = () => {
  try {
    const authStatus = localStorage.getItem(AUTH_STORAGE_KEYS.IS_AUTHENTICATED);
    const userData = localStorage.getItem(AUTH_STORAGE_KEYS.USER);
    const token = getStoredToken();
    
    // Verificar que todos los datos necesarios existan
    if (authStatus !== 'true' || !userData || !token) {
      return false;
    }
    
    // Verificar que el token no haya expirado
    if (isTokenExpired(token)) {
      console.warn('Token expirado detectado');
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('Error verificando autenticación:', error);
    return false;
  }
};

/**
 * Limpia todos los datos de autenticación del localStorage
 */
export const clearAuthData = () => {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEYS.TOKEN);
    localStorage.removeItem(AUTH_STORAGE_KEYS.USER);
    localStorage.removeItem(AUTH_STORAGE_KEYS.IS_AUTHENTICATED);
    localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_VIEW);
  } catch (error) {
    console.warn('Error limpiando datos de autenticación:', error);
  }
};

/**
 * Redirige al login y limpia los datos de autenticación
 * @param {string} reason - Razón de la redirección (opcional)
 */
export const redirectToLogin = (reason = 'session_expired') => {
  console.warn(`Redirigiendo al login. Razón: ${reason}`);
  
  // Limpiar datos de autenticación
  clearAuthData();
  
  // Redirigir al login
  if (typeof window !== 'undefined') {
    // Si estamos en una SPA, podemos usar window.location.reload() 
    // para forzar que la aplicación detecte que no hay autenticación
    window.location.reload();
  }
};

/**
 * Verifica periódicamente si el token sigue siendo válido
 * @param {function} onTokenExpired - Callback a ejecutar cuando el token expire
 * @param {number} intervalMs - Intervalo de verificación en milisegundos (default: 60000 = 1 minuto)
 * @returns {function} - Función para limpiar el intervalo
 */
export const startTokenValidationInterval = (onTokenExpired, intervalMs = 60000) => {
  const intervalId = setInterval(() => {
    if (!isAuthenticated()) {
      console.warn('Token inválido o expirado detectado en verificación periódica');
      onTokenExpired();
    }
  }, intervalMs);
  
  return () => clearInterval(intervalId);
};

/**
 * Obtiene información del usuario desde el token
 * @param {string} token - Token JWT (opcional, si no se proporciona se obtiene del localStorage)
 * @returns {object|null} - Información del usuario o null
 */
export const getUserFromToken = (token = null) => {
  try {
    const tokenToUse = token || getStoredToken();
    if (!tokenToUse) return null;
    
    const decoded = decodeJWT(tokenToUse);
    return decoded || null;
  } catch (error) {
    console.warn('Error obteniendo usuario del token:', error);
    return null;
  }
};

/**
 * Verifica si el token expirará pronto
 * @param {string} token - Token JWT (opcional)
 * @param {number} warningMinutes - Minutos antes de la expiración para mostrar advertencia (default: 5)
 * @returns {boolean} - true si expirará pronto
 */
export const willTokenExpireSoon = (token = null, warningMinutes = 5) => {
  try {
    const tokenToUse = token || getStoredToken();
    if (!tokenToUse) return true;
    
    const decoded = decodeJWT(tokenToUse);
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const warningTime = decoded.exp - (warningMinutes * 60);
    
    return currentTime >= warningTime;
  } catch (error) {
    console.warn('Error verificando proximidad de expiración:', error);
    return true;
  }
};