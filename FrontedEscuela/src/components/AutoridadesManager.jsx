import React, { useState, useEffect } from 'react';
import ConfirmDialog from './ConfirmDialog';
import Paginacion from './Paginacion';
import api from '../api/client';
import { Datepicker } from 'flowbite';
import { validarCedulaEcuatoriana } from '../utils/validaciones';

const AutoridadesManager = ({ onBack }) => {
  const [autoridades, setAutoridades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAutoridad, setEditingAutoridad] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [autoridadToToggle, setAutoridadToToggle] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'enabled', 'disabled'

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    nombre: '',
    fechaNacimiento: '',
    correo: '',
    telefono: '',
    cedula: '',
    cargo: '',
    cargoPersonalizado: ''
  });

  // Cliente API centralizado maneja el token

  // Lista de cargos comunes para autoridades UTEQ
  const cargosComunes = [
    'Rector',
    'Vicerrector Académico',
    'Vicerrector de Investigación',
    'Decano',
    'Subdecano',
    'Director de Carrera',
    'Coordinador/a Académico',
    'Secretario General',
    'Director de Planificación',
    'Docente',
    'Otro'
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  // Inicializar datepicker cuando se muestre el formulario
  useEffect(() => {
    if (showForm) {
      // Pequeño delay para asegurar que el DOM esté listo
      const timer = setTimeout(() => {
        const datepickerElement = document.getElementById('fecha-nacimiento-autoridades-datepicker');
        if (datepickerElement && !datepickerElement.hasAttribute('data-datepicker-initialized')) {
          try {
            // Marcar como inicializado para evitar múltiples inicializaciones
            datepickerElement.setAttribute('data-datepicker-initialized', 'true');

            // Inicializar el datepicker de Flowbite
            const datepicker = new Datepicker(datepickerElement, {
              format: 'yyyy-mm-dd',
              autohide: true,
              todayBtn: true,
              clearBtn: true,
              maxDate: new Date(), // No permitir fechas futuras
              orientation: 'bottom auto',
              container: 'body' // Renderizar en el body para evitar problemas de z-index
            });

            // Manejar el evento de selección de fecha
            datepickerElement.addEventListener('changeDate', (event) => {
              const selectedDate = event.detail.date;
              if (selectedDate) {
                const formattedDate = selectedDate.toISOString().split('T')[0];
                setFormData(prev => ({
                  ...prev,
                  fechaNacimiento: formattedDate
                }));
              }
            });

            // Limpiar el evento cuando el componente se desmonte
            return () => {
              datepickerElement.removeEventListener('changeDate', () => { });
              datepickerElement.removeAttribute('data-datepicker-initialized');
            };
          } catch (error) {
            console.error('Error al inicializar el datepicker:', error);
          }
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [showForm]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      try {
        const response = await api.get(`/api/autoridades-uteq/all-including-deleted`);
        const responseData = response.data;
        console.log('Datos de autoridades recibidos:', responseData);

        // Normalizar respuesta de API para asegurar que siempre sea un array
        const normalizeApiResponse = (data) => {
          // El backend envuelve los datos en un objeto con estructura: {success: true, data: [...], status_code: 200, ...}
          if (data && data.success && Array.isArray(data.data)) {
            return data.data;
          } else if (Array.isArray(data)) {
            return data;
          } else if (data && Array.isArray(data.data)) {
            return data.data;
          } else {
            console.warn('La respuesta de la API no es un array:', data);
            return [];
          }
        };

        let autoridadesConPersona = normalizeApiResponse(responseData);

        if (autoridadesConPersona.length > 0 && !autoridadesConPersona[0].persona) {
          console.log('Las autoridades no incluyen datos de persona, consultando por separado...');
          autoridadesConPersona = await Promise.all(
            autoridadesConPersona.map(async (autoridad) => {
              try {
                const personaResponse = await api.get(`/api/personas/${autoridad.persona_id}`);
                const personaData = personaResponse.data.success ? personaResponse.data.data : personaResponse.data;
                return { ...autoridad, persona: personaData };
              } catch (error) {
                console.error(`Error al obtener persona ${autoridad.persona_id}:`, error);
                return autoridad;
              }
            })
          );
        }

        setAutoridades(autoridadesConPersona);
      } catch (e) {
        throw e;
      }
    } catch (error) {
      console.error('Error al cargar autoridades:', error);
      setError('Error al cargar las autoridades: ' + error.message);
      setAutoridades([]);
    } finally {
      setLoading(false);
    }
  };



  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = (autoridad) => {
    setEditingAutoridad(autoridad);
    const cargo = autoridad.cargo || '';
    const esCargoPersonalizado = !cargosComunes.includes(cargo) && cargo !== '';

    setFormData({
      nombre: autoridad.persona?.nombre || '',
      fechaNacimiento: autoridad.persona?.fecha_nacimiento
        ? new Date(autoridad.persona.fecha_nacimiento).toISOString().split('T')[0]
        : '',
      correo: autoridad.persona?.correo || '',
      telefono: autoridad.persona?.telefono || '',
      cedula: autoridad.persona?.cedula || '',
      cargo: esCargoPersonalizado ? 'Otro' : cargo,
      cargoPersonalizado: esCargoPersonalizado ? cargo : ''
    });
    setShowForm(true);
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.nombre.trim()) errors.push('El nombre es requerido');
    if (!formData.cedula.trim()) errors.push('La cédula es requerida');
    if (!formData.cargo.trim()) errors.push('El cargo es requerido');
    if (formData.cargo === 'Otro' && !formData.cargoPersonalizado.trim()) {
      errors.push('Debe especificar el cargo personalizado');
    }

    // Validación de cédula ecuatoriana
    if (formData.cedula) {
      const validacionCedula = validarCedulaEcuatoriana(formData.cedula);
      if (!validacionCedula.esValida) {
        errors.push(validacionCedula.mensaje);
      }
    }

    if (formData.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      errors.push('El formato del correo no es válido');
    }

    if (formData.telefono && !/^\d{10}$/.test(formData.telefono)) {
      errors.push('El teléfono debe tener exactamente 10 dígitos numéricos');
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (errors.length > 0) {
      setError('Errores en el formulario: ' + errors.join(', '));
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    if (editingAutoridad) {
      await handleUpdate();
    } else {
      await handleCreate();
    }
  };

  const handleUpdate = async () => {
    try {
      const personaData = {
        nombre: formData.nombre.trim(),
        fecha_nacimiento: formData.fechaNacimiento ? new Date(formData.fechaNacimiento).toISOString() : editingAutoridad.persona?.fecha_nacimiento,
        correo: formData.correo.trim() || null,
        telefono: formData.telefono.trim() || null,
        cedula: formData.cedula.trim()
      };

      await api.put(`/api/personas/${editingAutoridad.persona_id}`, personaData);

      const autoridadData = {
        persona_id: editingAutoridad.persona_id,
        cargo: formData.cargo === 'Otro' ? formData.cargoPersonalizado.trim() : formData.cargo.trim()
      };

      await api.put(`/api/autoridades-uteq/${editingAutoridad.ID}`, autoridadData);

      setSuccess('Autoridad actualizada exitosamente');
      setFormData({
        nombre: '',
        fechaNacimiento: '',
        correo: '',
        telefono: '',
        cedula: '',
        cargo: '',
        cargoPersonalizado: ''
      });
      setShowForm(false);
      setEditingAutoridad(null);
      loadInitialData();

    } catch (error) {
      console.error('Error al actualizar la autoridad:', error);

      let errorMessage = 'Error al actualizar la autoridad: ';
      if (error.response?.data?.error) {
        const backendError = error.response.data.error;
        // Manejar errores específicos del backend
        if (backendError === 'duplicate_cedula') {
          errorMessage += 'Ya existe una persona con esta cédula. Verifique que la cédula no esté duplicada.';
        } else if (backendError === 'duplicate_email') {
          errorMessage += 'Ya existe una persona con este correo electrónico. Verifique que el correo no esté duplicado.';
        } else if (backendError === 'duplicate_usuario') {
          errorMessage += 'Ya existe un usuario con este nombre de usuario. Verifique que la cédula no esté duplicada.';
        } else {
          errorMessage += backendError;
        }
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else if (error.response?.status === 409) {
        errorMessage += 'Ya existe una persona con esta cédula. Verifique que la cédula no esté duplicada.';
      } else if (error.response?.status === 400) {
        errorMessage += 'Datos inválidos. Verifique que todos los campos requeridos estén llenos correctamente.';
      } else if (error.response?.status === 500) {
        errorMessage += 'Error interno del servidor. Verifique que no haya datos duplicados.';
      } else {
        errorMessage += error.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const tiposResponse = await api.get(`/api/tipos-usuario`);
      const tiposUsuario = tiposResponse.data.success ? tiposResponse.data.data : tiposResponse.data;
      const coAdminTipo = tiposUsuario.find(tipo =>
        tipo.nombre.toLowerCase().includes('coadministrador') ||
        tipo.nombre.toLowerCase().includes('co-administrador') ||
        tipo.nombre.toLowerCase().includes('administrador')
      );

      if (!coAdminTipo) {
        throw new Error('Tipo de usuario "CoAdministrador" no encontrado');
      }

      const personaData = {
        nombre: formData.nombre.trim(),
        fecha_nacimiento: formData.fechaNacimiento ? new Date(formData.fechaNacimiento).toISOString() : new Date().toISOString(),
        correo: formData.correo.trim() || null,
        telefono: formData.telefono.trim() || null,
        cedula: formData.cedula.trim()
      };

      const personaRes = await api.post(`/api/personas`, personaData);
      console.log('Respuesta completa de crear persona:', personaRes);
      console.log('Datos de persona:', personaRes.data);

      // Manejar diferentes estructuras de respuesta del backend
      const personaCreada = personaRes.data.success ? personaRes.data.data : personaRes.data;
      console.log('Persona creada extraída:', personaCreada);

      if (!personaCreada || !personaCreada.ID) {
        throw new Error('No se pudo obtener el ID de la persona creada');
      }

      const usuarioData = {
        usuario: formData.cedula.trim(),
        contraseña: formData.cedula.trim(),
        persona_id: personaCreada.ID,
        tipo_usuario_id: coAdminTipo.ID
      };

      let usuarioCreado;
      try {
        const usuarioRes = await api.post(`/api/usuarios`, usuarioData);
        console.log('Respuesta completa de crear usuario:', usuarioRes);
        console.log('Datos de usuario:', usuarioRes.data);

        // Manejar diferentes estructuras de respuesta del backend
        usuarioCreado = usuarioRes.data.success ? usuarioRes.data.data : usuarioRes.data;
        console.log('Usuario creado extraído:', usuarioCreado);
      } catch (e) {
        console.error('Error al crear usuario, intentando rollback de persona:', e);
        // Solo intentar eliminar la persona si tenemos un ID válido
        if (personaCreada && personaCreada.ID) {
          try {
            await api.delete(`/api/personas/${personaCreada.ID}`);
            console.log('Persona eliminada en rollback');
          } catch (deleteError) {
            console.error('Error al eliminar persona en rollback:', deleteError);
          }
        }
        throw e;
      }

      const autoridadData = {
        persona_id: personaCreada.ID,
        cargo: formData.cargo === 'Otro' ? formData.cargoPersonalizado.trim() : formData.cargo.trim()
      };

      try {
        await api.post(`/api/autoridades-uteq`, autoridadData);
      } catch (e) {
        console.error('Error al crear autoridad, intentando rollback completo:', e);
        // Rollback en orden inverso: autoridad -> usuario -> persona
        if (usuarioCreado && usuarioCreado.ID) {
          try {
            await api.delete(`/api/usuarios/${usuarioCreado.ID}`);
            console.log('Usuario eliminado en rollback');
          } catch (deleteError) {
            console.error('Error al eliminar usuario en rollback:', deleteError);
          }
        }
        if (personaCreada && personaCreada.ID) {
          try {
            await api.delete(`/api/personas/${personaCreada.ID}`);
            console.log('Persona eliminada en rollback');
          } catch (deleteError) {
            console.error('Error al eliminar persona en rollback:', deleteError);
          }
        }
        throw e;
      }

      setSuccess(`Autoridad creada exitosamente! Credenciales: Usuario: ${formData.cedula} | Contraseña: ${formData.cedula}`);
      setFormData({
        nombre: '',
        fechaNacimiento: '',
        correo: '',
        telefono: '',
        cedula: '',
        cargo: '',
        cargoPersonalizado: ''
      });
      setShowForm(false);
      loadInitialData();

    } catch (error) {
      console.error('Error al crear la autoridad:', error);

      let errorMessage = 'Error al crear la autoridad: ';
      if (error.response?.data?.error) {
        const backendError = error.response.data.error;
        // Manejar errores específicos del backend
        if (backendError === 'duplicate_cedula') {
          errorMessage += 'Ya existe una persona con esta cédula. Verifique que la cédula no esté duplicada.';
        } else if (backendError === 'duplicate_email') {
          errorMessage += 'Ya existe una persona con este correo electrónico. Verifique que el correo no esté duplicado.';
        } else if (backendError === 'duplicate_usuario') {
          errorMessage += 'Ya existe un usuario con este nombre de usuario. Verifique que la cédula no esté duplicada.';
        } else {
          errorMessage += backendError;
        }
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else if (error.response?.status === 409) {
        errorMessage += 'Ya existe una persona con esta cédula. Verifique que la cédula no esté duplicada.';
      } else if (error.response?.status === 400) {
        errorMessage += 'Datos inválidos. Verifique que todos los campos requeridos estén llenos correctamente.';
      } else if (error.response?.status === 500) {
        errorMessage += 'Error interno del servidor. Verifique que no haya datos duplicados.';
      } else {
        errorMessage += error.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleClick = (autoridad) => {
    setAutoridadToToggle(autoridad);
    setShowConfirmDialog(true);
  };

  const handleToggleStatus = async () => {
    if (!autoridadToToggle) return;

    try {
      setToggling(true);
      const isDisabled = autoridadToToggle.DeletedAt !== null;

      if (isDisabled) {
        await api.put(`/api/autoridades-uteq/${autoridadToToggle.ID}/restore`);
      } else {
        await api.delete(`/api/autoridades-uteq/${autoridadToToggle.ID}`);
      }

      setSuccess(`Autoridad ${isDisabled ? 'habilitada' : 'deshabilitada'} exitosamente`);
      loadInitialData();
    } catch (error) {
      console.error('Error al cambiar el estado de la autoridad:', error);

      let errorMessage = 'Error al cambiar el estado de la autoridad: ';
      if (error.response?.data?.error) {
        errorMessage += error.response.data.error;
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage += 'Datos inválidos. Verifique que la autoridad existe.';
      } else if (error.response?.status === 500) {
        errorMessage += 'Error interno del servidor. Intente nuevamente.';
      } else {
        errorMessage += error.message;
      }
      setError(errorMessage);
    } finally {
      setToggling(false);
      setShowConfirmDialog(false);
      setAutoridadToToggle(null);
    }
  };

  const handleCancelToggle = () => {
    setShowConfirmDialog(false);
    setAutoridadToToggle(null);
  };

  // Filtrar autoridades según el término de búsqueda y estado
  const filteredAutoridades = Array.isArray(autoridades) ? autoridades.filter(autoridad => {
    // Filtro por estado
    if (statusFilter === 'enabled' && autoridad.DeletedAt !== null) return false;
    if (statusFilter === 'disabled' && autoridad.DeletedAt === null) return false;

    // Filtro por búsqueda
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    const nombre = autoridad.persona?.nombre || '';
    const cedula = autoridad.persona?.cedula || '';
    const cargo = autoridad.cargo || '';
    const correo = autoridad.persona?.correo || '';

    return (
      nombre.toLowerCase().includes(searchLower) ||
      cedula.includes(searchLower) ||
      cargo.toLowerCase().includes(searchLower) ||
      correo.toLowerCase().includes(searchLower)
    );
  }) : [];

  // Funciones de paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAutoridades = filteredAutoridades.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAutoridades.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading && !showForm) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6">
      {/* Barra de botones */}

      <div className={`flex ${showForm ? 'justify-end' : 'justify-between'} items-center mb-4 sm:mb-6`}>
        {!showForm && (
          <button
            onClick={onBack}
            className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 flex items-center gap-2 text-sm sm:text-base"
            title="Volver al Dashboard"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="">Volver</span>
          </button>
        )}
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingAutoridad(null);
            setFormData({
              nombre: '',
              fechaNacimiento: '',
              correo: '',
              telefono: '',
              cedula: '',
              cargo: '',
              cargoPersonalizado: ''
            });
          }}
          className={`inline-flex items-center text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 text-sm sm:text-base ${showForm
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-green-800 hover:bg-green-900'
            }`}
          style={{ backgroundColor: showForm ? '#dc2626' : '#025a27' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = showForm ? '#b91c1c' : '#014a1f')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = showForm ? '#dc2626' : '#025a27')}
        >
          {showForm ? (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="hidden sm:inline">Nueva Autoridad</span>
              <span className="sm:hidden">Nueva</span>
            </>
          )}
        </button>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          {success}
        </div>
      )}

      {/* Formulario */}
      {showForm && (

        <div className="bg-white shadow-xl rounded-xl border border-gray-200">
          {/* Header del formulario */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 rounded-t-xl" style={{ backgroundColor: '#025a27' }}>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {editingAutoridad ? 'Editar Autoridad' : 'Registrar Nueva Autoridad'}
            </h3>
          </div>

          <div className="px-3 sm:px-6 py-4 sm:py-6 rounded-b-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Datos personales */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#025a27' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Datos Personales
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      required
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                      placeholder="Ingrese el nombre completo"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Cédula *</label>
                    <input
                      type="tel"
                      name="cedula"
                      value={formData.cedula}
                      onChange={handleInputChange}
                      required
                      maxLength="10"
                      pattern="[0-9]{10}"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                      placeholder="10 dígitos"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {editingAutoridad
                        ? '⚠️ Si cambia la cédula, también se actualizará el nombre de usuario (10 dígitos)'
                        : 'La cédula será usada como nombre de usuario y contraseña inicial (10 dígitos)'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      name="correo"
                      value={formData.correo}
                      onChange={handleInputChange}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                      placeholder="ejemplo@correo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                    <input
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      maxLength="10"
                      pattern="[0-9]{10}"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                      placeholder="10 dígitos (ej: 0987654321)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                    <div className="relative w-full">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                        </svg>
                      </div>
                      <input
                        id="fecha-nacimiento-autoridades-datepicker"
                        type="text"
                        name="fechaNacimiento"
                        value={formData.fechaNacimiento}
                        onChange={handleInputChange}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200 bg-white"
                        placeholder="Seleccionar fecha (YYYY-MM-DD)"
                        readOnly
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Cargo *</label>
                    <select
                      name="cargo"
                      value={formData.cargo}
                      onChange={handleInputChange}
                      required
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                    >
                      <option value="">Seleccione un cargo</option>
                      {cargosComunes.map((cargo, index) => (
                        <option key={index} value={cargo}>{cargo}</option>
                      ))}
                    </select>
                    {formData.cargo === 'Otro' && (
                      <input
                        type="text"
                        name="cargoPersonalizado"
                        value={formData.cargoPersonalizado}
                        onChange={handleInputChange}
                        placeholder="Especifique el cargo"
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200 mt-2"
                        required
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Botón de envío */}
              <div className="pt-4 sm:pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 text-sm sm:text-base"
                  style={{ backgroundColor: '#025a27' }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#014a1f')}
                  onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#025a27')}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {editingAutoridad ? 'Actualizando...' : 'Creando...'}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {editingAutoridad ? 'Actualizar Autoridad' : 'Registrar Autoridad'}
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

      )}

      {/* Lista de autoridades */}
      {!showForm && (

        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
          {/* Header de la tabla */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200" style={{ backgroundColor: '#025a27' }}>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Lista de Autoridades UTEQ
            </h3>
          </div>

          <div className="px-3 sm:px-6 py-4 sm:py-6">
            {/* Barra de búsqueda y filtros */}
            <div className="mb-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar autoridades..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Estado:</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="all">Todos</option>
                      <option value="enabled">Habilitados</option>
                      <option value="disabled">Deshabilitados</option>
                    </select>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'all' ? (
                    <span>
                      Mostrando {filteredAutoridades.length} de {autoridades.length} autoridades
                      {filteredAutoridades.length !== autoridades.length && (
                        <span className="text-green-600 font-medium"> (filtrados)</span>
                      )}
                    </span>
                  ) : (
                    <span>Total: {autoridades.length} autoridades ({autoridades.filter(a => a.DeletedAt !== null).length} deshabilitados)</span>
                  )}
                </div>
              </div>
            </div>

            {autoridades.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay autoridades</h3>
                <p className="mt-1 text-sm text-gray-500">Comienza agregando una nueva autoridad.</p>
              </div>
            ) : (
              <>
                {/* Vista de tabla para desktop */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr style={{ backgroundColor: '#ffffff' }}>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Nombre
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Cédula
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Cargo
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Contacto
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Estado
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {currentAutoridades.map((autoridad, index) => (
                        <tr
                          key={autoridad.ID}
                          className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: '#4ade80' }}>
                                  {(autoridad.persona?.nombre || 'A').charAt(0).toUpperCase()}
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {autoridad.persona?.nombre || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-medium">
                              {autoridad.persona?.cedula || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100" style={{ color: '#025a27' }}>
                              {autoridad.cargo || 'N/A'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {autoridad.persona?.correo || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {autoridad.persona?.telefono || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${autoridad.DeletedAt === null
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                              }`}>
                              {autoridad.DeletedAt === null ? 'Habilitado' : 'Deshabilitado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => handleEdit(autoridad)}
                                disabled={autoridad.DeletedAt !== null}
                                className={`inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg transition-all duration-200 hover:shadow-md ${autoridad.DeletedAt !== null
                                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                  : 'text-gray-700 bg-yellow-100 hover:bg-yellow-200'
                                  }`}
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Editar
                              </button>
                              <button
                                onClick={() => handleToggleClick(autoridad)}
                                className={`inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg transition-all duration-200 hover:shadow-md ${autoridad.DeletedAt === null
                                  ? 'text-red-700 bg-red-100 hover:bg-red-200'
                                  : 'text-green-700 bg-green-100 hover:bg-green-200'
                                  }`}
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  {autoridad.DeletedAt === null ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728M12 2.25c5.385 0 9.75 4.365 9.75 9.75s-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12 6.615 2.25 12 2.25z" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12l-2-2-4 4m6-4a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  )}
                                </svg>
                                {autoridad.DeletedAt === null ? 'Deshabilitar' : 'Habilitar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Vista de tarjetas para móvil y tablet */}
                <div className="lg:hidden space-y-4">
                  {currentAutoridades.map((autoridad, index) => (
                    <div
                      key={autoridad.ID}
                      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#4ade80' }}>
                              {(autoridad.persona?.nombre || 'A').charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">
                              {autoridad.persona?.nombre || 'N/A'}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              Cédula: {autoridad.persona?.cedula || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cargo</p>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 mt-1" style={{ color: '#025a27' }}>
                            {autoridad.cargo || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estado</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${autoridad.DeletedAt === null
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            {autoridad.DeletedAt === null ? 'Habilitado' : 'Deshabilitado'}
                          </span>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contacto</p>
                          <p className="text-sm text-gray-900 mt-1">
                            {autoridad.persona?.correo || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {autoridad.persona?.telefono || 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => handleEdit(autoridad)}
                          disabled={autoridad.DeletedAt !== null}
                          className={`flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg transition-all duration-200 ${autoridad.DeletedAt !== null
                            ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                            : 'text-gray-700 bg-yellow-100 hover:bg-yellow-200'
                            }`}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleClick(autoridad)}
                          className={`flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg transition-all duration-200 ${autoridad.DeletedAt === null
                            ? 'text-red-700 bg-red-100 hover:bg-red-200'
                            : 'text-green-700 bg-green-100 hover:bg-green-200'
                            }`}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {autoridad.DeletedAt === null ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0 0L5.636 5.636m0 12.728L18.364 5.636M12 2.25c5.385 0 9.75 4.365 9.75 9.75s-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12 6.615 2.25 12 2.25z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            )}
                          </svg>
                          {autoridad.DeletedAt === null ? 'Deshabilitar' : 'Habilitar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginación */}
                <Paginacion
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={paginate}
                  totalItems={filteredAutoridades.length}
                  itemsPerPage={itemsPerPage}
                  totalItemsOriginal={searchTerm ? autoridades.length : null}
                  itemName="autoridades"
                />
              </>
            )}
          </div>
        </div>

      )}

      {/* Modal de confirmación para cambio de estado */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={handleCancelToggle}
        onConfirm={handleToggleStatus}
        title={`Confirmar ${autoridadToToggle?.DeletedAt === null ? 'Deshabilitación' : 'Habilitación'}`}
        message={`¿Está seguro de que desea ${autoridadToToggle?.DeletedAt === null ? 'deshabilitar' : 'habilitar'} a la autoridad "${autoridadToToggle?.persona?.nombre || 'esta autoridad'}"? ${autoridadToToggle?.DeletedAt === null ? 'La autoridad no podrá acceder al sistema pero sus datos se conservarán.' : 'La autoridad podrá acceder nuevamente al sistema.'}`}
        confirmText={toggling
          ? (autoridadToToggle?.DeletedAt === null ? 'Deshabilitando...' : 'Habilitando...')
          : (autoridadToToggle?.DeletedAt === null ? 'Deshabilitar' : 'Habilitar')
        }
        cancelText="Cancelar"
        type={autoridadToToggle?.DeletedAt === null ? 'danger' : 'success'}
        loading={toggling}
      />
    </div>

  );
};

export default AutoridadesManager;
