import { useEffect, useRef, useState } from 'react';
import api from '../api/client';

const RecuperarContrasena = ({ onClose, onSubmit }) => {
  const [cedula, setCedula] = useState(() => {
    return localStorage.getItem('recovery_cedula') || '';
  });
  const [step, setStep] = useState('cedula'); // Se determinará en useEffect
  const [initializing, setInitializing] = useState(true);
  const [codigo, setCodigo] = useState(''); // almacena solo dígitos (0-6)
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [usuarioId, setUsuarioId] = useState(() => {
    const savedUserId = localStorage.getItem('recovery_user_id');
    return savedUserId ? parseInt(savedUserId, 10) : null;
  });
  const [codigoId, setCodigoId] = useState(() => {
    const savedCodigoId = localStorage.getItem('recovery_codigo_id');
    return savedCodigoId ? parseInt(savedCodigoId, 10) : null;
  });
  const [emailSent, setEmailSent] = useState(() => {
    return localStorage.getItem('recovery_code_sent') === 'true';
  });
  const [codeVerified, setCodeVerified] = useState(() => {
    return localStorage.getItem('recovery_code_verified') === 'true';
  });
  const codeInputRef = useRef(null);

  const caretMap = [0, 2, 4, 8, 10, 12, 13];

  const formatCodigoValue = (digits) => {
    const only = (digits || '').replace(/\D/g, '').slice(0, 6);
    const slots = Array.from({ length: 6 }, (_, i) => only[i] || '_');
    return `${slots[0]} ${slots[1]} ${slots[2]} - ${slots[3]} ${slots[4]} ${slots[5]}`;
  };


  // Función para limpiar el proceso de recuperación
  const clearRecoveryProcess = () => {
    localStorage.removeItem('recovery_code_sent');
    localStorage.removeItem('recovery_code_verified');
    localStorage.removeItem('recovery_cedula');
    localStorage.removeItem('recovery_user_id');
    localStorage.removeItem('recovery_codigo_id');
    setEmailSent(false);
    setCodeVerified(false);
    setCedula('');
    setCodigo('');
    setUsuarioId(null);
    setCodigoId(null);
    setError('');
    setSuccess('');
    setStep('cedula');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (step === 'cedula') {
        // Validar cédula antes de enviar
        if (!cedula || cedula.length !== 10) {
          setError('La cédula debe tener exactamente 10 dígitos');
          setLoading(false);
          return;
        }
        
        // Paso 1: Enviar correo de recuperación
        const response = await api.post('/auth/recover-password', {
          cedula: cedula
        });
        
        setSuccess('Se ha enviado un código de verificación a tu correo electrónico.');
        setEmailSent(true);
        localStorage.setItem('recovery_code_sent', 'true');
        localStorage.setItem('recovery_cedula', cedula);
        setStep('codigo');
      }
      else if (step === 'codigo') {
        // Paso 2: Verificar código
        if (codigo.length === 6) {
          const response = await api.post('/auth/verify-code', {
            codigo: codigo
          });
          
          if (response.data.estado === 'verificado') {
            
            // Guardar datos en estado
            setUsuarioId(response.data.usuario_id);
            setCodigoId(response.data.codigo_id);
            setCodeVerified(true);
            
            // Guardar en localStorage
            localStorage.setItem('recovery_code_verified', 'true');
            localStorage.setItem('recovery_user_id', response.data.usuario_id.toString());
            localStorage.setItem('recovery_codigo_id', response.data.codigo_id.toString());
            
            // Mostrar mensaje de éxito
            setSuccess('Código verificado correctamente. Ahora puedes establecer tu nueva contraseña.');
            
            // Avanzar al paso de contraseña
            setStep('password');
          } else if (response.data.estado === 'caducado') {
            setError('El código ha caducado. Por favor, solicita uno nuevo.');
            // Limpiar el proceso cuando el código caduca
            setTimeout(() => {
              clearRecoveryProcess();
            }, 2000);
          } else if (response.data.estado === 'no existe') {
            setError('El código ingresado no es válido.');
          }
        } else {
          setError('El código debe tener 6 dígitos');
        }
      }
      else if (step === 'password') {
        // Paso 3: Cambiar contraseña
        
        const passwordsMatch = newPass.length > 0 && newPass === confirmPass;
        if (!passwordsMatch) {
          setError('Las contraseñas no coinciden o están vacías');
          setLoading(false);
          return;
        }
        
        // Usar datos del localStorage como respaldo si no están en el estado
        const finalUsuarioId = usuarioId || parseInt(localStorage.getItem('recovery_user_id'), 10);
        const finalCodigoId = codigoId || parseInt(localStorage.getItem('recovery_codigo_id'), 10);
        
        if (!finalUsuarioId || !finalCodigoId) {
          setError('Error: Faltan datos de verificación. Por favor, inicia el proceso nuevamente.');
          setLoading(false);
          return;
        }
        
        if (newPass.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres');
          setLoading(false);
          return;
        }
        
        await api.post('/auth/reset-password', {
          codigo_id: finalCodigoId,
          usuario_id: finalUsuarioId,
          clave: newPass
        });
          
          setSuccess('¡Contraseña actualizada exitosamente!');
          
          // Limpiar localStorage después de completar el proceso
          localStorage.removeItem('recovery_code_sent');
          localStorage.removeItem('recovery_code_verified');
          localStorage.removeItem('recovery_cedula');
          localStorage.removeItem('recovery_user_id');
          localStorage.removeItem('recovery_codigo_id');
          
          // Llamar al callback del padre si existe
          if (onSubmit) {
            onSubmit(cedula, codigo, newPass);
          }
          
          // Cerrar el modal después de un breve delay
          setTimeout(() => {
            onClose();
          }, 2000);
        }
    } catch (err) {
      
      // Verificar si el error es "codigo ya enviado" y estamos en el paso de cédula
      if (step === 'cedula' && 
          (err.response?.data?.error?.includes('codigo ya enviado') || 
           err.response?.data?.message?.includes('codigo ya enviado'))) {
        
        // En lugar de mostrar error, avanzar automáticamente al paso de código
        setSuccess('Se ha enviado un código de verificación a tu correo electrónico.');
        setEmailSent(true);
        localStorage.setItem('recovery_code_sent', 'true');
        localStorage.setItem('recovery_cedula', cedula);
        setStep('codigo');
        setLoading(false);
        return;
      }
      
      // Para otros errores, mostrar el error normalmente
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const setCaretToNext = () => {
    const el = codeInputRef.current;
    if (!el) return;
    const pos = caretMap[Math.min(codigo.length, 6)];
    // Usar RAF para asegurar que el valor ya se renderizó
    requestAnimationFrame(() => {
      try {
        el.setSelectionRange(pos, pos);
      } catch {}
      el.focus();
    });
  };

  useEffect(() => {
    if (step === 'codigo') {
      setCaretToNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, step]);

  // Efecto para determinar el paso inicial al abrir el modal
  useEffect(() => {
    const initializeStep = () => {
      const codeVerifiedStored = localStorage.getItem('recovery_code_verified') === 'true';
      const codeSentStored = localStorage.getItem('recovery_code_sent') === 'true';
      const savedUserId = localStorage.getItem('recovery_user_id');
      const savedCodigoId = localStorage.getItem('recovery_codigo_id');

      if (codeVerifiedStored && savedUserId && savedCodigoId) {
        // Si ya se verificó el código, ir directo a contraseña
        setStep('password');
        setCodeVerified(true);
        setUsuarioId(parseInt(savedUserId, 10));
        setCodigoId(parseInt(savedCodigoId, 10));
      } else if (codeSentStored) {
        // Si se envió código, ir al paso de código (la validez se verificará al intentar usarlo)
        setStep('codigo');
        setEmailSent(true);
      } else {
        // No hay proceso previo, empezar desde cédula
        setStep('cedula');
      }
      
      setInitializing(false);
    };

    initializeStep();
  }, []); // Solo ejecutar una vez al montar el componente

  // Efecto para determinar el paso inicial basado en el estado (mantener para compatibilidad)
  useEffect(() => {
    if (!initializing && emailSent && !codeVerified) {
      setStep('codigo');
    } else if (!initializing && codeVerified) {
      setStep('password');
    }
  }, [emailSent, codeVerified, initializing]);

  // Auto-limpiar mensajes de error después de 5 segundos
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Limpiar el proceso cuando el componente se desmonte
  useEffect(() => {
    return () => {
      // No limpiar automáticamente, dejar que el usuario controle el proceso
    };
  }, [codeVerified, step]);

  // Mostrar loading mientras se inicializa
  if (initializing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
        <div className="relative z-10 max-w-md w-11/12 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-8">
            <svg className="w-8 h-8 animate-spin text-green-600 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="text-gray-600 text-sm">Verificando estado del proceso...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Fondo oscurecido */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />

      {/* Contenido del modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="recuperar-title"
        className="relative z-10 max-w-md w-11/12 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <h3 id="recuperar-title" className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            recuperar contraseña
          </h3>
          <button
            type="button"
            onClick={() => {
              // Limpiar el proceso de recuperación antes de cerrar
              clearRecoveryProcess();
              onClose();
            }}
            className="ml-4 text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="-mt-2 mb-4 text-xs text-gray-500">Sigue los pasos para restablecer tu acceso.</p>
        
        {/* Indicador de progreso */}
        <div className="mb-4 flex items-center justify-center space-x-4">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              step === 'cedula' ? 'bg-green-600 text-white' : emailSent ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
            }`}>
              1
            </div>
            <span className="ml-2 text-xs text-gray-600">Cédula</span>
          </div>
          <div className={`flex-1 h-0.5 ${emailSent ? 'bg-green-600' : 'bg-gray-200'}`}></div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              step === 'codigo' ? 'bg-green-600 text-white' : codeVerified ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
            <span className="ml-2 text-xs text-gray-600">Código</span>
          </div>
          <div className={`flex-1 h-0.5 ${codeVerified ? 'bg-green-600' : 'bg-gray-200'}`}></div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              step === 'password' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              3
            </div>
            <span className="ml-2 text-xs text-gray-600">Nueva contraseña</span>
          </div>
        </div>
        
        {/* Mensajes de error y éxito */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}
        
        {/* Body */}
        <form onSubmit={handleSubmit}>
          {step === 'cedula' && (
            <>
              <label htmlFor="cedula" className="block text-sm font-semibold text-gray-700 mb-2">Ingresar cédula</label>
              <input
                type="tel"
                inputMode="numeric"
                name="cedula"
                id="cedula"
                value={cedula}
                onChange={(e) => {
                  // Solo permitir números y limitar a 10 dígitos
                  const numericValue = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setCedula(numericValue);
                }}
                onKeyDown={(e) => {
                  // Permitir teclas de control (backspace, delete, arrows, etc.)
                  const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'];
                  if (allowedKeys.includes(e.key) || (e.ctrlKey && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))) {
                    return;
                  }
                  // Solo permitir números
                  if (!/^[0-9]$/.test(e.key)) {
                    e.preventDefault();
                  }
                  // Prevenir más de 10 dígitos
                  if (cedula.length >= 10 && /^[0-9]$/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                placeholder="Ingrese su cédula (10 dígitos)"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors shadow-sm ${
                  cedula.length > 0 && cedula.length !== 10
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                }`}
              />
              <p className="mt-2 text-xs text-gray-500">
                Debe contener exactamente 10 dígitos numéricos.
                {cedula.length > 0 && (
                  <span className={cedula.length === 10 ? 'text-green-600' : 'text-red-600'}>
                    {' '}({cedula.length}/10)
                  </span>
                )}
              </p>

              {/* Footer */}
              <div className="mt-6 flex justify-center">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#025a27' }}
                  onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#014d22')}
                  onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#025a27')}
                  disabled={cedula.length !== 10 || loading}
                >
                  {loading ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  )}
                  {loading ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </>
          )}

          {step === 'codigo' && (
            <>
              <div className="text-center mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">Ingresar código de verificación</p>
                <p className="text-xs text-gray-500 mb-3">
                  Escribe el código de 6 dígitos que enviamos a tu correo.
                  {cedula && <span className="block mt-1 text-green-600">Cédula: {cedula}</span>}
                </p>
              </div>
              
              <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                name="codigo"
                id="codigo"
                ref={codeInputRef}
                value={formatCodigoValue(codigo)}
                onChange={(e) => {
                  // Permite pegar códigos: extrae y limita a 6 dígitos
                  const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 6);
                  setCodigo(digits);
                }}
                onKeyDown={(e) => {
                  const { key } = e;
                  if (/^[0-9]$/.test(key)) {
                    if (codigo.length < 6) {
                      e.preventDefault();
                      setCodigo(codigo + key);
                    } else {
                      e.preventDefault();
                    }
                  } else if (key === 'Backspace') {
                    if (codigo.length > 0) {
                      e.preventDefault();
                      setCodigo(codigo.slice(0, -1));
                    } else {
                      e.preventDefault();
                    }
                  } else if (key === 'Delete') {
                    e.preventDefault();
                  } else if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Home' || key === 'End') {
                    // Fijar el caret al siguiente slot disponible
                    e.preventDefault();
                    setCaretToNext();
                  }
                }}
                onFocus={setCaretToNext}
                onClick={(e) => {
                  // Siempre posicionar el caret en el siguiente slot
                  e.preventDefault();
                  setCaretToNext();
                }}
                placeholder="_ _ _ - _ _ _"
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-green-500/20 transition-all duration-200 text-center font-mono text-lg tracking-widest ${
                    codigo.length === 6 
                      ? 'border-green-500 bg-green-50 text-green-700' 
                      : codigo.length > 0 
                        ? 'border-blue-400 bg-blue-50 text-blue-700' 
                        : 'border-gray-300 hover:border-gray-400'
                  }`}
                autoFocus
              />
                
                {/* Indicador de progreso */}
                <div className="mt-3 flex justify-center">
                  <div className="flex space-x-1">
                    {Array.from({ length: 6 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                          i < codigo.length ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Contador de dígitos */}
                <p className="mt-2 text-center text-xs">
                  <span className={codigo.length === 6 ? 'text-green-600 font-semibold' : 'text-gray-500'}>
                    {codigo.length}/6 dígitos
                  </span>
                  {codigo.length === 6 && (
                    <span className="ml-2 text-green-600">
                      ✓ Código completo
                    </span>
                  )}
                </p>
              </div>

              {/* Footer */}
              <div className="mt-6 flex justify-center gap-3">
                {!emailSent && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep('cedula');
                      setError('');
                      setSuccess('');
                      setCodigo('');
                      setEmailSent(false);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    disabled={loading}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver
                  </button>
                )}
                
                {/* Botón para reenviar código si es necesario */}
                {emailSent && error && (
                  <button
                    type="button"
                    onClick={clearRecoveryProcess}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-300 text-orange-700 font-semibold hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                    disabled={loading}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reenviar
                  </button>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#025a27' }}
                  onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#014d22')}
                  onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#025a27')}
                  disabled={codigo.length !== 6 || loading}
                >
                  {loading ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {loading ? 'Validando...' : 'Validar'}
                </button>
              </div>
            </>
          )}

          {step === 'password' && (
            <>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-700 mb-2">Nueva contraseña</p>
                  <div className="relative">
                  <input
                      type={showNewPass ? "text" : "password"}
                    name="nueva_contrasena"
                    id="nueva_contrasena"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Ingrese su nueva contraseña"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    autoFocus
                  />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-green-600 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 rounded-md transition-all duration-200"
                      aria-label={showNewPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                      title={showNewPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showNewPass ? (
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
                <div>
                  <p className="text-gray-700 mb-2">Repetir nueva contraseña</p>
                  <div className="relative">
                  <input
                      type={showConfirmPass ? "text" : "password"}
                    name="repetir_contrasena"
                    id="repetir_contrasena"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Repita su nueva contraseña"
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-green-600 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 rounded-md transition-all duration-200"
                      aria-label={showConfirmPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                      title={showConfirmPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showConfirmPass ? (
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
                {confirmPass && newPass !== confirmPass && (
                  <p className="text-sm text-red-600">Las contraseñas no coinciden.</p>
                )}
              </div>

              {/* Footer */}
              <div className="mt-6 flex justify-center gap-3">
                {(!usuarioId || !codigoId) && (
                  <button
                    type="button"
                    onClick={() => {
                      clearRecoveryProcess();
                      setStep('cedula');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-orange-300 text-orange-700 font-semibold hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                    disabled={loading}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reiniciar proceso
                  </button>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-6 py-2 rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                  style={{ backgroundColor: '#025a27' }}
                  onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#014d22')}
                  onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#025a27')}
                  disabled={!(newPass.length > 0 && newPass === confirmPass) || loading || !usuarioId || !codigoId}
                >
                  {loading ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                  )}
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default RecuperarContrasena;
