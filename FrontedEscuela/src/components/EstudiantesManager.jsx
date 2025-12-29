import { useState, useEffect } from 'react';
import api from '../api/client';
import ConfirmDialog from './ConfirmDialog';
import ModalCargaExcel from './ModalCargaExcel';
import ReporteEstudiantes from './ReporteEstudiantes';
import Paginacion from './Paginacion';
import { Datepicker } from 'flowbite';
import { validarCedulaEcuatoriana } from '../utils/validaciones';

const EstudiantesManager = ({ onBack }) => {
  // Cliente API centralizado con token

  const [estudiantes, setEstudiantes] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [ciudadesFiltered, setCiudadesFiltered] = useState([]);
  const [instituciones, setInstituciones] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [tiposUsuario, setTiposUsuario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEstudiante, setEditingEstudiante] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para el modal de confirmación
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [estudianteToToggle, setEstudianteToToggle] = useState(null);
  const [actionType, setActionType] = useState(''); // 'disable' o 'enable'

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Estado para búsqueda
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para filtro de estudiantes (habilitados/deshabilitados/todos)
  const [statusFilter, setStatusFilter] = useState('todos'); // 'habilitados', 'deshabilitados', 'todos'

  // Estados para loading de acciones
  const [actioningStudentId, setActioningStudentId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Estados para errores de validación
  const [validationErrors, setValidationErrors] = useState({});

  const [formData, setFormData] = useState({
    // Datos de la persona
    nombre: '',
    fecha_nacimiento: '',
    correo: '',
    telefono: '',
    cedula: '',
    // Datos del estudiante
    institucion_id: '',
    ciudad_id: '',
    provincia_id: '',
    especialidad: ''
  });

  // Estados para Redes Sociales
  const [socialNetworks, setSocialNetworks] = useState([]);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [viewingStudentSocials, setViewingStudentSocials] = useState(null);
  const [openDropdownIndex, setOpenDropdownIndex] = useState(null);

  // Estado para carga masiva desde Excel
  const [showExcelModal, setShowExcelModal] = useState(false);

  // Estado para modal de exportación
  const [showExportModal, setShowExportModal] = useState(false);

  const socialPlatforms = [
    { name: 'Facebook', icon: 'fa-brands fa-facebook', color: '#1877F2' },
    { name: 'X (Twitter)', icon: 'fa-brands fa-square-x-twitter', color: '#000000' },
    { name: 'Instagram', icon: 'fa-brands fa-instagram', color: '#E4405F' },
    { name: 'TikTok', icon: 'fa-brands fa-tiktok', color: '#000000' },
    { name: 'LinkedIn', icon: 'fa-brands fa-linkedin', color: '#0A66C2' },
    { name: 'YouTube', icon: 'fa-brands fa-youtube', color: '#FF0000' },
    { name: 'Otro', icon: 'fa-solid fa-globe', color: '#6B7280' }
  ];

  // Función para generar la URL de la red social basándose en el username
  const getSocialUrl = (platform, username) => {
    if (!username) return null;

    // Limpiar el username: remover @ al inicio si existe
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;

    const urlPatterns = {
      'Facebook': `https://www.facebook.com/${cleanUsername}`,
      'X (Twitter)': `https://www.x.com/${cleanUsername}`,
      'Instagram': `https://www.instagram.com/${cleanUsername}`,
      'TikTok': `https://www.tiktok.com/@${cleanUsername}`,
      'LinkedIn': `https://www.linkedin.com/in/${cleanUsername}`,
      'YouTube': `https://www.youtube.com/@${cleanUsername}`,
      'Otro': null // Para "Otro" no generamos URL automática
    };

    return urlPatterns[platform] || null;
  };

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);

  // Inicializar datepicker cuando se muestre el formulario
  useEffect(() => {
    if (showForm) {
      // Pequeño delay para asegurar que el DOM esté listo
      const timer = setTimeout(() => {
        const datepickerElement = document.getElementById('fecha-nacimiento-datepicker');
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
                  fecha_nacimiento: formattedDate
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
    try {
      const [estudiantesRes, ciudadesRes, institucionesRes, provinciasRes, tiposUsuarioRes] = await Promise.all([
        api.get(`/api/estudiantes/all-including-deleted`),
        api.get(`/api/ciudades`),
        api.get(`/api/instituciones`),
        api.get(`/api/provincias`),
        api.get(`/api/tipos-usuario`)
      ]);

      // Normalizar respuestas de API para asegurar que siempre sean arrays
      const normalizeApiResponse = (responseData) => {
        if (Array.isArray(responseData)) {
          return responseData;
        } else if (responseData && Array.isArray(responseData.data)) {
          return responseData.data;
        } else {
          console.warn('La respuesta de la API no es un array:', responseData);
          return [];
        }
      };

      // Los estudiantes ya vienen con el campo deleted_at correctamente configurado desde la API
      setEstudiantes(normalizeApiResponse(estudiantesRes.data));
      setCiudades(normalizeApiResponse(ciudadesRes.data));
      setCiudadesFiltered([]); // Inicialmente vacío hasta que se seleccione una provincia
      setInstituciones(normalizeApiResponse(institucionesRes.data));
      setProvincias(normalizeApiResponse(provinciasRes.data));
      setTiposUsuario(normalizeApiResponse(tiposUsuarioRes.data));
    } catch (err) {
      console.error('Error al cargar los datos:', err);

      let errorMessage = 'Error al cargar los datos: ';
      if (err.response?.data?.error) {
        errorMessage += err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage += err.response.data.message;
      } else if (err.response?.status === 401) {
        errorMessage += 'No autorizado. Verifique su sesión.';
      } else if (err.response?.status === 403) {
        errorMessage += 'Acceso denegado. No tiene permisos para ver esta información.';
      } else if (err.response?.status === 500) {
        errorMessage += 'Error interno del servidor. Intente nuevamente.';
      } else {
        errorMessage += err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Función para cargar ciudades filtradas por provincia
  const loadCiudadesByProvincia = async (provinciaId) => {
    try {
      if (!provinciaId) {
        // Si no hay provincia seleccionada, limpiar las ciudades filtradas
        setCiudadesFiltered([]);
        return;
      }

      const response = await api.get(`/api/ciudades/provincia/${provinciaId}`);
      setCiudadesFiltered(response.data);
    } catch (err) {
      console.error('Error al cargar ciudades por provincia:', err);

      let errorMessage = 'Error al cargar las ciudades: ';
      if (err.response?.data?.error) {
        errorMessage += err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage += err.response.data.message;
      } else if (err.response?.status === 400) {
        errorMessage += 'Provincia inválida.';
      } else if (err.response?.status === 404) {
        errorMessage += 'No se encontraron ciudades para esta provincia.';
      } else if (err.response?.status === 500) {
        errorMessage += 'Error interno del servidor.';
      } else {
        errorMessage += err.message;
      }

      // En caso de error, limpiar las ciudades filtradas
      setCiudadesFiltered([]);
      setError(errorMessage);
    }
  };



  const validateForm = () => {
    const errors = [];

    // Validaciones obligatorias
    if (!formData.nombre.trim()) errors.push('El nombre es requerido');
    if (!formData.cedula.trim()) errors.push('La cédula es requerida');
    if (!formData.institucion_id) errors.push('Debe seleccionar una institución');
    if (!formData.provincia_id) errors.push('Debe seleccionar una provincia');
    if (!formData.ciudad_id) errors.push('Debe seleccionar una ciudad');
    if (!formData.especialidad.trim()) errors.push('La especialidad es requerida');

    // Validación de cédula ecuatoriana
    if (formData.cedula) {
      const validacionCedula = validarCedulaEcuatoriana(formData.cedula);
      if (!validacionCedula.esValida) {
        errors.push(validacionCedula.mensaje);
      }
    }

    // Validación: al menos uno de los campos (correo o teléfono) debe estar relleno
    if (!formData.correo?.trim() && !formData.telefono?.trim()) {
      errors.push('Debe proporcionar al menos un teléfono o un correo electrónico');
    }

    if (formData.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      errors.push('El formato del correo no es válido');
    }

    if (formData.telefono && !/^\d{10}$/.test(formData.telefono)) {
      errors.push('El teléfono debe tener exactamente 10 dígitos numéricos');
    }

    return errors;
  };

  // Función para obtener el ID del tipo de usuario "Estudiante"
  const getEstudianteTipoUsuarioId = () => {
    const estudianteTipo = tiposUsuario.find(tipo =>
      tipo.nombre.toLowerCase() === 'estudiante'
    );
    return estudianteTipo ? estudianteTipo.ID : null;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'provincia_id') {
      // Cuando se selecciona una provincia, filtrar las ciudades y limpiar la ciudad seleccionada
      setFormData({
        ...formData,
        [name]: value,
        ciudad_id: '' // Limpiar la ciudad seleccionada cuando cambie la provincia
      });

      // Cargar ciudades filtradas por provincia
      loadCiudadesByProvincia(value);
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  }


  // Manejo de Redes Sociales en el Formulario
  const handleAddSocialNetwork = () => {
    setSocialNetworks([...socialNetworks, { platform: '', icon: '', url: '' }]);
  };

  const handleRemoveSocialNetwork = (index) => {
    setSocialNetworks(socialNetworks.filter((_, i) => i !== index));
  };

  const handleSocialNetworkChange = (index, field, value) => {
    const newNetworks = [...socialNetworks];
    if (field === 'platform') {
      const platformObj = socialPlatforms.find(p => p.name === value);
      newNetworks[index].platform = value;
      newNetworks[index].icon = platformObj ? platformObj.icon : '';
    } else {
      newNetworks[index][field] = value;
    }
    setSocialNetworks(newNetworks);
  };

  const handleViewSocialNetworks = (estudiante) => {
    let networks = [];
    try {
      const rawSocial = estudiante.RedSocial || estudiante.redsocial;
      if (rawSocial) {
        networks = typeof rawSocial === 'string' ? JSON.parse(rawSocial) : rawSocial;
      }
    } catch (e) {
      console.error('Error parsing social networks:', e);
    }
    setViewingStudentSocials({ ...estudiante, parsedNetworks: Array.isArray(networks) ? networks : [] });
    setShowSocialModal(true);
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

    try {
      console.log('=== DEBUGGING VALIDATION ERROR ===');
      console.log('Datos del formulario:', formData);
      console.log('Tipo de operación:', editingEstudiante ? 'EDITAR' : 'CREAR');
      let personaId;

      if (editingEstudiante) {
        // Si estamos editando, actualizar la persona existente
        const personaData = {
          nombre: formData.nombre,
          fecha_nacimiento: formData.fecha_nacimiento ? formData.fecha_nacimiento + 'T00:00:00Z' : null,
          correo: formData.correo || null,
          telefono: formData.telefono || null,
          cedula: formData.cedula
        };

        // Obtener el persona_id del estudiante
        const personaIdToUpdate = editingEstudiante.persona_id || editingEstudiante.persona?.ID;

        if (!personaIdToUpdate) {
          throw new Error('No se pudo obtener el ID de la persona para actualizar');
        }

        // Actualizar la persona existente
        await api.put(`/api/personas/${personaIdToUpdate}`, personaData);
        personaId = personaIdToUpdate;
      } else {
        // Si estamos creando, crear nueva persona
        const personaData = {
          nombre: formData.nombre,
          fecha_nacimiento: formData.fecha_nacimiento ? formData.fecha_nacimiento + 'T00:00:00Z' : null,
          correo: formData.correo || null,
          telefono: formData.telefono || null,
          cedula: formData.cedula
        };

        console.log('Enviando datos de persona al backend:', personaData);
        const personaResponse = await api.post(`/api/personas`, personaData);
        console.log('Respuesta del backend para persona:', personaResponse.data);

        // Manejar diferentes estructuras de respuesta del backend
        const personaCreada = personaResponse.data.success ? personaResponse.data.data : personaResponse.data;
        console.log('Persona creada procesada:', personaCreada);

        if (!personaCreada || !personaCreada.ID) {
          throw new Error('No se pudo obtener el ID de la persona creada');
        }

        personaId = personaCreada.ID;

        // Crear usuario automáticamente solo para estudiantes nuevos
        const tipoUsuarioEstudianteId = getEstudianteTipoUsuarioId();
        if (!tipoUsuarioEstudianteId) {
          throw new Error('No se encontró el tipo de usuario "Estudiante"');
        }

        const usuarioData = {
          usuario: formData.cedula, // Usar la cédula como nombre de usuario
          contraseña: formData.cedula, // Usar la cédula como contraseña
          persona_id: personaId,
          tipo_usuario_id: tipoUsuarioEstudianteId
        };

        let usuarioCreado;
        try {
          console.log('Enviando datos de usuario al backend:', usuarioData);
          const usuarioResponse = await api.post(`/api/usuarios`, usuarioData);
          console.log('Respuesta del backend para usuario:', usuarioResponse.data);

          // Manejar diferentes estructuras de respuesta del backend
          usuarioCreado = usuarioResponse.data.success ? usuarioResponse.data.data : usuarioResponse.data;
          console.log('Usuario creado procesado:', usuarioCreado);
        } catch (e) {
          console.error('Error al crear usuario, intentando rollback de persona:', e);
          // Solo intentar eliminar la persona si tenemos un ID válido
          if (personaId) {
            try {
              await api.delete(`/api/personas/${personaId}`);
            } catch (deleteError) {
              console.error('Error al eliminar persona en rollback:', deleteError);
            }
          }
          throw e;
        }

        // Mostrar mensaje con las credenciales generadas
        setSuccess(`Estudiante registrado exitosamente. Usuario: ${formData.cedula} Contraseña: ${formData.cedula}`);
      }

      // Crear o actualizar el estudiante
      const estudianteData = {
        persona_id: personaId,
        institucion_id: parseInt(formData.institucion_id),
        ciudad_id: parseInt(formData.ciudad_id),
        especialidad: formData.especialidad,
        redsocial: JSON.stringify(socialNetworks)
      };


      try {
        console.log('Enviando datos de estudiante al backend:', estudianteData);
        if (editingEstudiante) {
          await api.put(`/api/estudiantes/${editingEstudiante.ID}`, estudianteData);
        } else {
          const estudianteResponse = await api.post(`/api/estudiantes`, estudianteData);
          console.log('Respuesta del backend para estudiante:', estudianteResponse.data);
          // El mensaje de éxito para nuevos estudiantes ya se configuró arriba con las credenciales
        }
      } catch (e) {
        console.error('Error al crear/actualizar estudiante, intentando rollback completo:', e);
        // Rollback en orden inverso: estudiante -> usuario -> persona (solo para nuevos estudiantes)
        if (!editingEstudiante && usuarioCreado && usuarioCreado.ID) {
          try {
            await api.delete(`/api/usuarios/${usuarioCreado.ID}`);
          } catch (deleteError) {
            console.error('Error al eliminar usuario en rollback:', deleteError);
          }
        }
        if (!editingEstudiante && personaId) {
          try {
            await api.delete(`/api/personas/${personaId}`);
          } catch (deleteError) {
            console.error('Error al eliminar persona en rollback:', deleteError);
          }
        }
        throw e;
      }

      // Recargar la lista
      await loadInitialData();

      // Resetear formulario y ocultar primero
      setFormData({
        nombre: '',
        fecha_nacimiento: '',
        correo: '',
        telefono: '',
        cedula: '',
        institucion_id: '',
        ciudad_id: '',
        provincia_id: '',
        especialidad: ''
      });
      setSocialNetworks([]);
      setShowForm(false);
      setEditingEstudiante(null);

      // Para ediciones, mostrar mensaje después de un pequeño delay para que se quite el formulario primero
      if (editingEstudiante) {
        setTimeout(() => {
          setSuccess('Estudiante actualizado exitosamente');
        }, 100);
      }

    } catch (err) {
      console.error('Error al guardar el estudiante:', err);
      console.log('Error completo:', err);
      console.log('Error response:', err.response);
      console.log('Error response data:', err.response?.data);

      let errorMessage = 'Error al guardar el estudiante: ';
      if (err.response?.data?.error) {
        const backendError = err.response.data.error;
        // Manejar errores específicos del backend
        if (backendError === 'duplicate_cedula') {
          errorMessage += 'Ya existe una persona con esta cédula. Verifique que la cédula no esté duplicada.';
        } else if (backendError === 'duplicate_email') {
          errorMessage += 'Ya existe una persona con este correo electrónico. Verifique que el correo no esté duplicado.';
        } else if (backendError === 'duplicate_usuario') {
          errorMessage += 'Ya existe un usuario con este nombre de usuario. Verifique que la cédula no esté duplicada.';
        } else if (backendError === 'validation_error') {
          errorMessage += 'Error de validación. Verifique que todos los campos estén completos y con el formato correcto.';
        } else if (backendError === 'invalid_institucion') {
          errorMessage += 'La institución seleccionada no es válida.';
        } else if (backendError === 'invalid_ciudad') {
          errorMessage += 'La ciudad seleccionada no es válida.';
        } else if (backendError === 'invalid_provincia') {
          errorMessage += 'La provincia seleccionada no es válida.';
        } else if (backendError === 'missing_required_fields') {
          errorMessage += 'Faltan campos requeridos. Verifique que todos los campos obligatorios estén completos.';
        } else if (backendError === 'invalid_data_format') {
          errorMessage += 'Formato de datos inválido. Verifique el formato de los campos ingresados.';
        } else {
          errorMessage += backendError;
        }
      } else if (err.response?.data?.message) {
        errorMessage += err.response.data.message;
      } else if (err.response?.status === 409) {
        errorMessage += 'Ya existe un estudiante con esta cédula. Verifique que la cédula no esté duplicada.';
      } else if (err.response?.status === 400) {
        errorMessage += 'Datos inválidos. Verifique que todos los campos requeridos estén llenos correctamente.';
      } else if (err.response?.status === 500) {
        errorMessage += 'Error interno del servidor. Verifique que no haya datos duplicados.';
      } else {
        errorMessage += err.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (estudiante) => {
    setEditingEstudiante(estudiante);

    // Buscar la ciudad del estudiante para obtener la provincia
    const ciudadEstudiante = ciudades.find(c => c.ID === estudiante.ciudad_id);
    const provinciaId = ciudadEstudiante ? ciudadEstudiante.provincia_id : '';

    setFormData({
      nombre: estudiante.persona?.nombre || '',
      fecha_nacimiento: estudiante.persona?.fecha_nacimiento ? estudiante.persona.fecha_nacimiento.split('T')[0] : '',
      correo: estudiante.persona?.correo || '',
      telefono: estudiante.persona?.telefono || '',
      cedula: estudiante.persona?.cedula || '',
      institucion_id: estudiante.institucion_id?.toString() || '',
      ciudad_id: estudiante.ciudad_id?.toString() || '',
      provincia_id: provinciaId?.toString() || '',
      especialidad: estudiante.especialidad || ''
    });

    // Cargar redes sociales
    let networks = [];
    try {
      const rawSocial = estudiante.RedSocial || estudiante.redsocial;
      if (rawSocial) {
        networks = typeof rawSocial === 'string' ? JSON.parse(rawSocial) : rawSocial;
      }
    } catch (e) {
      console.error('Error parsing social networks:', e);
    }
    setSocialNetworks(Array.isArray(networks) ? networks : []);

    // Cargar las ciudades filtradas por la provincia del estudiante
    if (provinciaId) {
      loadCiudadesByProvincia(provinciaId);
    }

    setShowForm(true);
  };

  const handleToggleStatus = (estudiante, action) => {
    setActioningStudentId(estudiante.ID);
    setEstudianteToToggle(estudiante);
    setActionType(action);
    setShowConfirmDialog(true);
  };

  const handleConfirmToggleStatus = async () => {
    if (estudianteToToggle) {
      try {
        setDeleting(true);
        if (actionType === 'disable') {
          // Deshabilitar estudiante (soft delete)
          await api.delete(`/api/estudiantes/${estudianteToToggle.ID}`);
          setSuccess('Estudiante deshabilitado exitosamente');
        } else if (actionType === 'enable') {
          // Habilitar estudiante (restore)
          await api.put(`/api/estudiantes/${estudianteToToggle.ID}/restore`);
          setSuccess('Estudiante habilitado exitosamente');
        }

        // Recargar los datos para obtener el estado actualizado desde la API
        await loadInitialData();
      } catch (err) {
        console.error('Error al cambiar estado del estudiante:', err);

        const action = actionType === 'disable' ? 'deshabilitar' : 'habilitar';
        let errorMessage = `Error al ${action} el estudiante: `;

        if (err.response?.data?.error) {
          const backendError = err.response.data.error;
          if (backendError === 'student_not_found') {
            errorMessage += 'El estudiante no fue encontrado.';
          } else if (backendError === 'already_disabled') {
            errorMessage += 'El estudiante ya está deshabilitado.';
          } else if (backendError === 'already_enabled') {
            errorMessage += 'El estudiante ya está habilitado.';
          } else {
            errorMessage += backendError;
          }
        } else if (err.response?.data?.message) {
          errorMessage += err.response.data.message;
        } else if (err.response?.status === 404) {
          errorMessage += 'El estudiante no fue encontrado.';
        } else if (err.response?.status === 400) {
          errorMessage += 'Datos inválidos.';
        } else if (err.response?.status === 500) {
          errorMessage += 'Error interno del servidor.';
        } else {
          errorMessage += err.message;
        }

        setError(errorMessage);
      } finally {
        setDeleting(false);
        setActioningStudentId(null);
      }
    }
    setShowConfirmDialog(false);
    setEstudianteToToggle(null);
    setActionType('');
  };

  const handleCancelToggleStatus = () => {
    setShowConfirmDialog(false);
    setEstudianteToToggle(null);
    setActionType('');
  };

  const getCiudadNombre = (ciudadId) => {
    const ciudad = ciudades.find(c => c.ID === ciudadId);
    return ciudad ? ciudad.ciudad : 'N/A';
  };

  const getInstitucionNombre = (institucionId) => {
    const institucion = instituciones.find(i => i.ID === institucionId);
    return institucion ? institucion.nombre : 'N/A';
  };

  // Filtrar estudiantes basado en el término de búsqueda y estado
  const filteredEstudiantes = Array.isArray(estudiantes) ? estudiantes.filter(estudiante => {
    const matchesSearch =
      (estudiante.persona?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (estudiante.persona?.cedula || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      getInstitucionNombre(estudiante.institucion_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCiudadNombre(estudiante.ciudad_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (estudiante.especialidad || '').toLowerCase().includes(searchTerm.toLowerCase());

    // Verificar si el estudiante está habilitado o deshabilitado
    // Solo está habilitado si DeletedAt es null o undefined
    const isEnabled = estudiante.DeletedAt === null || estudiante.DeletedAt === undefined;

    let matchesStatus = true;
    if (statusFilter === 'habilitados') {
      matchesStatus = isEnabled;
    } else if (statusFilter === 'deshabilitados') {
      matchesStatus = !isEnabled;
    }
    // Si statusFilter === 'todos', matchesStatus siempre es true

    return matchesSearch && matchesStatus;
  }) : [];

  // Funciones de paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentEstudiantes = filteredEstudiantes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredEstudiantes.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);



  if (loading && !showForm) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra de botones */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="mb-4 sm:mb-6">
          {/* Botón Volver - En móvil arriba, en desktop a la izquierda */}
          {!showForm && (
            <div className="flex justify-start mb-3 sm:hidden">
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 flex items-center gap-2 text-sm"
                title="Volver al Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Volver</span>
              </button>
            </div>
          )}

          {/* Contenedor principal de botones */}
          <div className={`flex ${showForm ? 'justify-end' : 'justify-between'} items-center`}>
            {/* Botón Volver - Solo visible en desktop */}
            {!showForm && (
              <button
                onClick={onBack}
                className="hidden sm:flex text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 items-center gap-2 text-base"
                title="Volver al Dashboard"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Volver</span>
              </button>
            )}

            {/* Grupo de botones de acción */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setShowForm(!showForm);
                  setEditingEstudiante(null);
                  setValidationErrors({});
                  setFormData({
                    nombre: '',
                    fecha_nacimiento: '',
                    correo: '',
                    telefono: '',
                    cedula: '',
                    institucion_id: '',
                    ciudad_id: '',
                    provincia_id: '',
                    especialidad: ''
                  });
                  setSocialNetworks([]);
                  setCiudadesFiltered([]);
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
                    <span className="hidden sm:inline">Nuevo Estudiante</span>
                    <span className="sm:hidden">Nuevo</span>
                  </>
                )}
              </button>
              {/* Botón Cargar Excel - solo visible cuando no hay formulario abierto */}
              {!showForm && (
                <button
                  onClick={() => setShowExcelModal(true)}
                  className="inline-flex items-center text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 text-sm sm:text-base"
                  style={{ backgroundColor: '#025a27' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#014a1f'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#025a27'}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">Cargar Excel</span>
                  <span className="sm:hidden">Excel</span>
                </button>
              )}
              {/* Botón Exportar - solo visible cuando no hay formulario abierto */}
              {!showForm && (
                <button
                  onClick={() => setShowExportModal(true)}
                  className="inline-flex items-center text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 text-sm sm:text-base"
                  style={{ backgroundColor: '#1c1c1c' }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#1c1c1c'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#1c1c1c'}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">Exportar</span>
                  <span className="sm:hidden">Exportar</span>
                </button>
              )}
            </div>
          </div>
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {editingEstudiante ? 'Editar Estudiante' : 'Registrar Nuevo Estudiante'}
              </h3>
            </div>

            <div className="px-3 sm:px-6 py-4 sm:py-6 rounded-b-xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Datos de la persona */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#025a27' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Datos Personales
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                      <input
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleInputChange}
                        required
                        placeholder="Ingrese el nombre completo"
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                        style={{ focusRingColor: '#025a27' }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Cédula</label>
                      <input
                        type="tel"
                        name="cedula"
                        value={formData.cedula}
                        onChange={handleInputChange}
                        required
                        maxLength="10"
                        placeholder="10 dígitos"
                        className={`block w-full border rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 text-sm sm:text-base transition-colors duration-200 ${validationErrors.cedula
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                          }`}
                      />
                      {validationErrors.cedula && (
                        <p className="mt-1 text-xs text-red-600 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {validationErrors.cedula}
                        </p>
                      )}
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
                          id="fecha-nacimiento-datepicker"
                          type="text"
                          name="fecha_nacimiento"
                          value={formData.fecha_nacimiento}
                          onChange={handleInputChange}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200 bg-white"
                          placeholder="Seleccionar fecha (YYYY-MM-DD)"
                          readOnly
                          required
                        />
                      </div>
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
                        placeholder="10 dígitos"
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Datos del estudiante */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#025a27' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    </svg>
                    Datos Académicos
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Institución</label>
                      <select
                        name="institucion_id"
                        value={formData.institucion_id}
                        onChange={handleInputChange}
                        required
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                      >
                        <option value="">Seleccione una institución</option>
                        {instituciones.map((institucion) => (
                          <option key={institucion.ID} value={institucion.ID}>
                            {institucion.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Provincia</label>
                      <select
                        name="provincia_id"
                        value={formData.provincia_id}
                        onChange={handleInputChange}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                      >
                        <option value="">Seleccione una provincia</option>
                        {provincias.map((provincia) => (
                          <option key={provincia.ID} value={provincia.ID}>
                            {provincia.provincia}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                      <select
                        name="ciudad_id"
                        value={formData.ciudad_id}
                        onChange={handleInputChange}
                        required
                        disabled={!formData.provincia_id}
                        className={`block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200 ${!formData.provincia_id ? 'bg-gray-100 cursor-not-allowed' : ''
                          }`}
                      >
                        <option value="">
                          {formData.provincia_id ? 'Seleccione una ciudad' : 'Primero seleccione una provincia'}
                        </option>
                        {ciudadesFiltered.map((ciudad) => (
                          <option key={ciudad.ID} value={ciudad.ID}>
                            {ciudad.ciudad}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                      <input
                        type="text"
                        name="especialidad"
                        value={formData.especialidad}
                        onChange={handleInputChange}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                        placeholder="Ingrese la especialidad"
                      />
                    </div>
                  </div>
                </div>

                {/* Redes Sociales */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#025a27' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Redes Sociales
                  </h3>

                  <button
                    type="button"
                    onClick={handleAddSocialNetwork}
                    className="mb-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Agregar Red Social
                  </button>

                  <div className="space-y-3">
                    {socialNetworks.map((network, index) => (
                      <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="w-full sm:w-1/3 relative">
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenDropdownIndex(openDropdownIndex === index ? null : index)}
                              className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            >
                              <span className="flex items-center truncate">
                                {network.platform ? (
                                  <>
                                    <i className={`${socialPlatforms.find(p => p.name === network.platform)?.icon || 'fa-solid fa-globe'} mr-2`} style={{ color: socialPlatforms.find(p => p.name === network.platform)?.color }}></i>
                                    {network.platform}
                                  </>
                                ) : (
                                  <span className="text-gray-500">Seleccione plataforma</span>
                                )}
                              </span>
                              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </span>
                            </button>

                            {openDropdownIndex === index && (
                              <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                {socialPlatforms.map((platform) => (
                                  <div
                                    key={platform.name}
                                    className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-green-50 ${network.platform === platform.name ? 'bg-green-100' : ''}`}
                                    onClick={() => {
                                      handleSocialNetworkChange(index, 'platform', platform.name);
                                      setOpenDropdownIndex(null);
                                    }}
                                  >
                                    <div className="flex items-center">
                                      <i className={`${platform.icon} mr-2 w-5 text-center`} style={{ color: platform.color }}></i>
                                      <span className={`block truncate ${network.platform === platform.name ? 'font-semibold' : 'font-normal'}`}>
                                        {platform.name}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="w-full sm:w-1/2">
                          <input
                            type="text"
                            value={network.url}
                            onChange={(e) => handleSocialNetworkChange(index, 'url', e.target.value)}
                            placeholder="Usuario o URL del perfil"
                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveSocialNetwork(index)}
                          className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-100"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    {socialNetworks.length === 0 && (
                      <p className="text-gray-500 text-sm italic">No hay redes sociales registradas.</p>
                    )}
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
                        Guardando...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {editingEstudiante ? 'Actualizar Estudiante' : 'Registrar Estudiante'}
                      </div>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

        )}

        {/* Lista de estudiantes */}
        {!showForm && (

          <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
            {/* Header de la tabla */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200" style={{ backgroundColor: '#025a27' }}>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                </svg>
                Lista de Estudiantes
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
                    placeholder="Buscar estudiantes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Estado:</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="todos">Todos</option>
                        <option value="habilitados">Habilitados</option>
                        <option value="deshabilitados">Deshabilitados</option>
                      </select>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {searchTerm || statusFilter !== 'todos' ? (
                      <span>
                        Mostrando {filteredEstudiantes.length} de {estudiantes.length} estudiantes
                        {filteredEstudiantes.length !== estudiantes.length && (
                          <span className="text-green-600 font-medium"> (filtrados)</span>
                        )}
                      </span>
                    ) : (
                      <span>Total: {estudiantes.length} estudiantes ({estudiantes.filter(e => e.DeletedAt).length} deshabilitados)</span>
                    )}
                  </div>
                </div>
              </div>


              {estudiantes.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay estudiantes</h3>
                  <p className="mt-1 text-sm text-gray-500">Comienza agregando un nuevo estudiante.</p>
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
                            Institución
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                            Ciudad
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                            Contacto
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                            Especialidad
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                            Estado
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {currentEstudiantes.map((estudiante, index) => (
                          <tr
                            key={estudiante.ID}
                            className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: '#4ade80' }}>
                                    {(estudiante.persona?.nombre || 'N').charAt(0).toUpperCase()}
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {estudiante.persona?.nombre || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900 font-medium">
                                {estudiante.persona?.cedula || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {getInstitucionNombre(estudiante.institucion_id)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {getCiudadNombre(estudiante.ciudad_id)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm text-gray-900 flex items-center">
                                  <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  {estudiante.persona?.correo || 'N/A'}
                                </span>
                                <span className="text-sm text-gray-500 flex items-center mt-1">
                                  <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  {estudiante.persona?.telefono || 'N/A'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100" style={{ color: '#025a27' }}>
                                {estudiante.especialidad || 'Sin especialidad'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              {estudiante.DeletedAt === null || estudiante.DeletedAt === undefined ? (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  Habilitado
                                </span>
                              ) : (
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                  Deshabilitado
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => handleViewSocialNetworks(estudiante)}
                                  className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 transition-all duration-200 hover:shadow-md"
                                  title="Ver Redes Sociales"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                  </svg>
                                  Red social
                                </button>
                                <button
                                  onClick={() => handleEdit(estudiante)}
                                  disabled={actioningStudentId === estudiante.ID || deleting || (estudiante.DeletedAt !== null && estudiante.DeletedAt !== undefined)}
                                  className={`inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${(estudiante.DeletedAt !== null && estudiante.DeletedAt !== undefined)
                                    ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                    : 'text-gray-700 bg-yellow-100 hover:bg-yellow-200'
                                    }`}
                                >
                                  {actioningStudentId === estudiante.ID ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Editar
                                    </>
                                  )}
                                </button>
                                {estudiante.DeletedAt === null || estudiante.DeletedAt === undefined ? (
                                  <button
                                    onClick={() => handleToggleStatus(estudiante, 'disable')}
                                    disabled={actioningStudentId === estudiante.ID || deleting}
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {actioningStudentId === estudiante.ID && deleting ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-1"></div>
                                        Deshabilitando...
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728M12 2.25c5.385 0 9.75 4.365 9.75 9.75s-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12 6.615 2.25 12 2.25z" />
                                        </svg>
                                        Deshabilitar
                                      </>
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleToggleStatus(estudiante, 'enable')}
                                    disabled={actioningStudentId === estudiante.ID || deleting}
                                    className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {actioningStudentId === estudiante.ID && deleting ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-1"></div>
                                        Habilitando...
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Habilitar
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Vista de tarjetas para móvil y tablet */}
                  <div className="lg:hidden space-y-4">
                    {currentEstudiantes.map((estudiante, index) => (
                      <div
                        key={estudiante.ID}
                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
                              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#4ade80' }}>
                                {(estudiante.persona?.nombre || 'N').charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div className="ml-3">
                              <h4 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">
                                {estudiante.persona?.nombre || 'N/A'}
                              </h4>
                              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                Cédula: {estudiante.persona?.cedula || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Institución</p>
                            <p className="text-sm text-gray-900 mt-1 truncate">
                              {getInstitucionNombre(estudiante.institucion_id)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ciudad</p>
                            <p className="text-sm text-gray-900 mt-1">
                              {getCiudadNombre(estudiante.ciudad_id)}
                            </p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Especialidad</p>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100" style={{ color: '#025a27' }}>
                            {estudiante.especialidad || 'Sin especialidad'}
                          </span>
                        </div>

                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Estado</p>
                          {estudiante.DeletedAt === null || estudiante.DeletedAt === undefined ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Habilitado
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Deshabilitado
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => handleEdit(estudiante)}
                            disabled={actioningStudentId === estudiante.ID || deleting || (estudiante.DeletedAt !== null && estudiante.DeletedAt !== undefined)}
                            className={`flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${(estudiante.DeletedAt !== null && estudiante.DeletedAt !== undefined)
                              ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                              : 'text-gray-700 bg-yellow-100 hover:bg-yellow-200'
                              }`}
                          >
                            {actioningStudentId === estudiante.ID ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Editar
                              </>
                            )}
                          </button>
                          {estudiante.DeletedAt === null || estudiante.DeletedAt === undefined ? (
                            <button
                              onClick={() => handleToggleStatus(estudiante, 'disable')}
                              disabled={actioningStudentId === estudiante.ID || deleting}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actioningStudentId === estudiante.ID && deleting ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-2"></div>
                                  Deshabilitando...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728M12 2.25c5.385 0 9.75 4.365 9.75 9.75s-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12 6.615 2.25 12 2.25z" />
                                  </svg>
                                  Deshabilitar
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(estudiante, 'enable')}
                              disabled={actioningStudentId === estudiante.ID || deleting}
                              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-green-700 bg-green-100 hover:bg-green-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actioningStudentId === estudiante.ID && deleting ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2"></div>
                                  Habilitando...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Habilitar
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Paginación */}
                  {/* Paginación */}
                  <Paginacion
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={paginate}
                    totalItems={filteredEstudiantes.length}
                    itemsPerPage={itemsPerPage}
                    totalItemsOriginal={searchTerm ? estudiantes.length : null}
                    itemName="estudiantes"
                  />
                </>
              )}
            </div>
          </div>

        )}

      </div>

      {/* Modal de confirmación para habilitar/deshabilitar */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={handleCancelToggleStatus}
        onConfirm={handleConfirmToggleStatus}
        title={actionType === 'disable' ? 'Confirmar Deshabilitación' : 'Confirmar Habilitación'}
        message={
          actionType === 'disable'
            ? `¿Está seguro de que desea deshabilitar al estudiante "${estudianteToToggle?.persona?.nombre || 'este estudiante'}"? El estudiante no podrá acceder al sistema pero sus datos se conservarán.`
            : `¿Está seguro de que desea habilitar al estudiante "${estudianteToToggle?.persona?.nombre || 'este estudiante'}"? El estudiante podrá acceder nuevamente al sistema.`
        }
        confirmText={deleting
          ? (actionType === 'disable' ? 'Deshabilitando...' : 'Habilitando...')
          : (actionType === 'disable' ? 'Deshabilitar' : 'Habilitar')
        }
        cancelText="Cancelar"
        loading={deleting}
        type={actionType === 'disable' ? 'danger' : 'success'}
      />

      {/* Modal de Carga Masiva desde Excel */}
      <ModalCargaExcel
        isOpen={showExcelModal}
        onClose={() => setShowExcelModal(false)}
        onSuccess={() => loadInitialData()}
        onError={(msg) => setError(msg)}
        instituciones={instituciones}
        ciudades={ciudades}
        estudiantes={estudiantes}
      />


      {/* Modal de Redes Sociales */}
      {showSocialModal && viewingStudentSocials && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all scale-100">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center" style={{ backgroundColor: '#025a27' }}>
              <h3 className="text-lg font-bold text-white flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Redes Sociales
              </h3>
              <button
                onClick={() => setShowSocialModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Estudiante</h4>
                <p className="text-lg font-semibold text-gray-900">{viewingStudentSocials.persona?.nombre}</p>
              </div>

              <div className="space-y-3">
                {viewingStudentSocials.parsedNetworks && viewingStudentSocials.parsedNetworks.length > 0 ? (
                  viewingStudentSocials.parsedNetworks.map((network, index) => {
                    const socialUrl = getSocialUrl(network.platform, network.url);
                    const displayUrl = socialUrl || (network.url?.startsWith('http') ? network.url : null);

                    return (
                      <a
                        key={index}
                        href={displayUrl || '#'}
                        target={displayUrl ? '_blank' : undefined}
                        rel={displayUrl ? 'noopener noreferrer' : undefined}
                        className={`flex items-center p-4 bg-gray-50 rounded-xl border border-gray-200 transition-all duration-200 ${displayUrl ? 'hover:bg-gray-100 hover:border-green-300 hover:shadow-md cursor-pointer group' : 'cursor-default'}`}
                        onClick={(e) => !displayUrl && e.preventDefault()}
                      >
                        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-white border-2 border-gray-200 mr-4 group-hover:border-green-400 transition-colors duration-200" style={{ borderColor: socialPlatforms.find(p => p.name === network.platform)?.color }}>
                          <i className={`${socialPlatforms.find(p => p.name === network.platform)?.icon || 'fa-solid fa-globe'} text-xl`} style={{ color: socialPlatforms.find(p => p.name === network.platform)?.color }}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-bold text-gray-900 truncate group-hover:text-green-700 transition-colors duration-200">
                            {network.url?.startsWith('@') ? network.url : `@${network.url}`}
                          </p>
                          <p className="text-sm text-gray-500 truncate flex items-center">
                            <span>{network.platform}</span>
                            {displayUrl && (
                              <svg className="w-4 h-4 ml-2 text-gray-400 group-hover:text-green-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            )}
                          </p>
                        </div>
                      </a>
                    );
                  })
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No tiene redes sociales registradas</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exportación de Estudiantes */}
      <ReporteEstudiantes
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        estudiantes={filteredEstudiantes}
        instituciones={instituciones}
        ciudades={ciudades}
      />
    </div>
  );
};


export default EstudiantesManager;
