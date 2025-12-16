import { useState, useEffect } from 'react';
import api from '../api/client';
import logoUteq from '../assets/logouteq.webp';
import logoFccdd from '../assets/logotipo-fccdd-2025.webp';
import logoSoft from '../assets/Logo_soft.webp';
import fondo from '../assets/fondo.webp';
import AcercaDe from './AcercaDe';
import RecuperarContrasena from './RecuperarContrasena';
const Login = ({ onLogin }) => {
  // Cliente API centralizado maneja el token
  

  
  const [formData, setFormData] = useState({
    usuario: '',
    contraseña: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAcerca, setShowAcerca] = useState(false);
  const [showCreditos, setShowCreditos] = useState(false);
  const [showRecuperar, setShowRecuperar] = useState(false);

  // Auto-focus en el campo usuario al cargar
  useEffect(() => {
    const usernameInput = document.getElementById('usuario');
    if (usernameInput && !formData.usuario) {
      usernameInput.focus();
    }
  }, []);

  // Preload critical images for better performance
  useEffect(() => {
    try {
      // Preload UTEQ logo (critical LCP image)
      const linkUteq = document.createElement('link');
      linkUteq.rel = 'preload';
      linkUteq.as = 'image';
      linkUteq.href = logoUteq;
      linkUteq.fetchPriority = 'high';
      document.head.appendChild(linkUteq);
      
      // Preload background image (high priority as it's visible immediately)
      const linkBg = document.createElement('link');
      linkBg.rel = 'preload';
      linkBg.as = 'image';
      linkBg.href = fondo;
      linkBg.fetchPriority = 'high';
      document.head.appendChild(linkBg);

      // Preload software logo (lower priority)
      const linkSoft = document.createElement('link');
      linkSoft.rel = 'preload';
      linkSoft.as = 'image';
      linkSoft.href = logoSoft;
      linkSoft.fetchPriority = 'low';
      document.head.appendChild(linkSoft);

      // Cleanup function to remove preload links when component unmounts
      return () => {
        document.head.removeChild(linkUteq);
        document.head.removeChild(linkBg);
        document.head.removeChild(linkSoft);
      };
    } catch (error) {
      console.warn('Could not preload images:', error);
    }
  }, []);

  // Auto-ocultar alertas después de 5 segundos
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post(`/auth/login`, {
        usuario: formData.usuario,
        contraseña: formData.contraseña
      });

      const responseData = response.data.success ? response.data.data : response.data;
      if (responseData.usuario) {
        // Guardar datos del usuario en localStorage
        localStorage.setItem('usuario', JSON.stringify(responseData.usuario));
        localStorage.setItem('isAuthenticated', 'true');
        
        // Llamar la función onLogin pasada como prop
        onLogin(responseData.usuario);

        // Si el backend devuelve un token, guardarlo
        const tokenResp = responseData?.token || responseData?.access_token || responseData?.jwt;
        if (tokenResp) {
          localStorage.setItem('token', tokenResp);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center fixed top-0 left-0 bg-gray-50"
      style={{ minHeight: '100vh', width: '100vw' }}
    >
      {/* Fondo */}
      <img 
        src={fondo} 
        alt="Fondo"
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        importance="high"
      />
      <div className="w-full relative z-10" style={{ maxWidth: '420px' }}>
        {/* Logos: UTEQ arriba, FCCDD y Soft al lado */}
        <div className="text-center mb-3">
          <img
            src={logoUteq}
            alt="Logo UTEQ"
            className="mb-2 mx-auto -mt-5 md:mt-0"
            width={120}
            height={120}
            style={{ objectFit: 'contain' }}
            loading="eager"
            fetchPriority="high"
            importance="high"
            decoding="async"
          />
          <div className="inline-flex items-center justify-center gap-8">
            <img
              src={logoFccdd}
              alt="Logo FCCDD 2025"
              className="mb-2"
              width={120}
              height={120}
              style={{ objectFit: 'contain' }}
              loading="eager"
              decoding="async"
              fetchPriority="low"
              importance="low"
            />
            <img
              src={logoSoft}
              alt="Logo Soft"
              className="mb-2"
              width={120}
              height={120}
              style={{ objectFit: 'contain' }}
              loading="eager"
              decoding="async"
              fetchPriority="low"
              importance="low"
            />
          </div>
        </div>

        {/* Card principal */}
        <div 
          className="bg-white rounded-2xl shadow-lg relative w-full p-4 md:p-6 md:pb-3 gold-border-fade"
        >
          {/* Título Iniciar Sesión */}
          <div className="text-center mb-1">
            <h2 className="text-2xl font-bold text-gray-800">
              Iniciar Sesión TESTT
            </h2>
          </div>

          <form onSubmit={handleSubmit} autoComplete="off">
            {/* Campo Usuario */}
            <div className="mb-3">
              <label 
                htmlFor="usuario" 
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Usuario
              </label>
              <input
                type="text"
                name="usuario"
                id="usuario"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
                placeholder="Ingrese su nombre de usuario"
                required
                value={formData.usuario}
                onChange={handleChange}
              />
            </div>

            {/* Campo Contraseña */}
            <div className="mb-3">
              <label 
                htmlFor="contraseña" 
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="contraseña"
                  id="contraseña"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
                  placeholder="Ingrese su contraseña"
                  required
                  value={formData.contraseña}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-green-600  focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 rounded-md transition-all duration-200"
                  onClick={togglePassword}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div 
                className="mb-3 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative transition-opacity duration-500"
                style={{ opacity: error ? 1 : 0 }}
              >
                {error}
              </div>
            )}

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              style={{ backgroundColor: loading ? '#9ca3af' : '#025a27' }}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Iniciando sesión...
                </div>
              ) : (
                'INICIAR SESIÓN'
              )}
            </button>
          </form>
          {/* Enlace Acerca de */}
          <div className="mt-2 flex items-center justify-between text-sm">
             <button
              type="button" onClick={() => setShowRecuperar(true)}
              className="text-green-700 hover:text-green-800 hover:underline font-semibold"
            >
              Restablecer contraseña
            </button>
            <button
              type="button"
              onClick={() => setShowAcerca(true)}
              className="text-green-700 hover:text-green-800 hover:underline font-semibold"
            >
              Créditos
            </button>
          </div>
        </div>
      </div>
      {/* Modal Acerca de */}
      {showAcerca && (
        <AcercaDe onClose={() => setShowAcerca(false)} />
      )}
      {showRecuperar && (
        <RecuperarContrasena
          onClose={() => setShowRecuperar(false)}
            onSubmit={(cedula, codigo) => {
            console.log('Cedula enviada para recuperación:', cedula);
            setShowRecuperar(false);
          }}
        />
      )}
    </div>
  );
};

export default Login;
