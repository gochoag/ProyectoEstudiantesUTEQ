import { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import ConfirmDialog from './ConfirmDialog';
import Paginacion from './Paginacion';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const ComunicadosManager = ({ onBack, usuario }) => {
  const [comunicados, setComunicados] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [instituciones, setInstituciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sending, setSending] = useState(false);

  // Estados para el formulario
  const [formData, setFormData] = useState({
    asunto: '',
    tipoDestinatario: '', // todos, instituciones, estudiantes, todas_instituciones
    institucionesSeleccionadas: [],
    estudiantesSeleccionados: [],
    mensaje: ''
  });
  const [adjuntos, setAdjuntos] = useState([]);
  const [adjuntosError, setAdjuntosError] = useState('');
  const fileInputRef = useRef(null);

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Estado para búsqueda
  const [searchTerm, setSearchTerm] = useState('');

  // Estado para filtro
  const [destinatarioFilter, setDestinatarioFilter] = useState('todos');

  // Estado para modal de confirmación de eliminación
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [comunicadoToDelete, setComunicadoToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Estado para modal de vista de comunicado
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedComunicado, setSelectedComunicado] = useState(null);

  // Estado para modal de destinatarios
  const [showDestinatariosModal, setShowDestinatariosModal] = useState(false);
  const [comunicadoDestinatarios, setComunicadoDestinatarios] = useState(null);

  // Estados para filtros de búsqueda en selección de destinatarios
  const [busquedaInstitucion, setBusquedaInstitucion] = useState('');
  const [busquedaEstudiante, setBusquedaEstudiante] = useState('');

  // Módulos de Quill
  const quillModules = {
    toolbar: [
      [{ 'font': [] }],
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ]
  };

  const quillFormats = [
    'font', 'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'bullet', 'align', 'link'
  ];

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
  }, []);

  // Limpiar mensajes después de 5 segundos
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [comunicadosRes, estudiantesRes, institucionesRes] = await Promise.all([
        api.get('/api/comunicados'),
        api.get('/api/estudiantes'),
        api.get('/api/instituciones')
      ]);

      const normalizeApiResponse = (responseData) => {
        if (Array.isArray(responseData)) return responseData;
        if (responseData && Array.isArray(responseData.data)) return responseData.data;
        return [];
      };

      setComunicados(normalizeApiResponse(comunicadosRes.data));
      setEstudiantes(normalizeApiResponse(estudiantesRes.data));
      setInstituciones(normalizeApiResponse(institucionesRes.data));
    } catch (err) {
      console.error('Error al cargar los datos:', err);
      setError('Error al cargar los datos: ' + (err.response?.data?.error || err.message));
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

    // Limpiar selecciones y búsquedas cuando cambia el tipo de destinatario
    if (name === 'tipoDestinatario') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        institucionesSeleccionadas: [],
        estudiantesSeleccionados: []
      }));
      setBusquedaInstitucion('');
      setBusquedaEstudiante('');
    }
  };

  const handleMensajeChange = (content) => {
    setFormData(prev => ({
      ...prev,
      mensaje: content
    }));
  };

  const handleInstitucionChange = (institucionId) => {
    setFormData(prev => {
      const current = prev.institucionesSeleccionadas;
      if (current.includes(institucionId)) {
        return {
          ...prev,
          institucionesSeleccionadas: current.filter(id => id !== institucionId)
        };
      } else {
        return {
          ...prev,
          institucionesSeleccionadas: [...current, institucionId]
        };
      }
    });
  };

  const handleEstudianteChange = (estudianteId) => {
    setFormData(prev => {
      const current = prev.estudiantesSeleccionados;
      if (current.includes(estudianteId)) {
        return {
          ...prev,
          estudiantesSeleccionados: current.filter(id => id !== estudianteId)
        };
      } else {
        return {
          ...prev,
          estudiantesSeleccionados: [...current, estudianteId]
        };
      }
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = [];
    const errors = [];

    // Limpiar error anterior de adjuntos
    setAdjuntosError('');

    files.forEach(file => {
      // Validar tipo (solo PDF e imágenes)
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        errors.push(`"${file.name}": Solo se permiten archivos PDF e imágenes`);
        return;
      }

      // Validar tamaño (5MB máximo)
      if (file.size > 5 * 1024 * 1024) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        errors.push(`"${file.name}" (${sizeMB}MB): Excede el límite de 5MB`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setAdjuntosError(errors.join('. '));
    }

    setAdjuntos(prev => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAdjunto = (index) => {
    setAdjuntos(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.asunto.trim()) {
      errors.push('El asunto es requerido');
    }

    if (!formData.tipoDestinatario) {
      errors.push('Debe seleccionar un tipo de destinatario');
    }

    if (formData.tipoDestinatario === 'instituciones' && formData.institucionesSeleccionadas.length === 0) {
      errors.push('Debe seleccionar al menos una institución');
    }

    if (formData.tipoDestinatario === 'estudiantes' && formData.estudiantesSeleccionados.length === 0) {
      errors.push('Debe seleccionar al menos un estudiante');
    }

    if (!formData.mensaje || formData.mensaje === '<p><br></p>') {
      errors.push('El mensaje es requerido');
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

    setSending(true);
    setError('');
    setSuccess('');

    try {
      // Preparar destinatarios según el tipo
      let destinatarios = { tipo: formData.tipoDestinatario };
      if (formData.tipoDestinatario === 'instituciones') {
        destinatarios.ids = formData.institucionesSeleccionadas;
      } else if (formData.tipoDestinatario === 'estudiantes') {
        destinatarios.ids = formData.estudiantesSeleccionados;
      }

      // Crear FormData para enviar archivos
      const formDataToSend = new FormData();
      formDataToSend.append('asunto', formData.asunto);
      formDataToSend.append('destinatarios', JSON.stringify(destinatarios));
      formDataToSend.append('mensaje', formData.mensaje);
      formDataToSend.append('usuario_id', usuario?.ID || usuario?.id);

      adjuntos.forEach(file => {
        formDataToSend.append('adjuntos', file);
      });

      const response = await api.post('/api/comunicados', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const data = response.data;
      setSuccess(`Comunicado enviado exitosamente. Correos enviados: ${data.enviados}/${data.total}`);

      if (data.errores && data.errores.length > 0) {
        console.warn('Errores de envío:', data.errores);
      }

      // Resetear formulario
      setFormData({
        asunto: '',
        tipoDestinatario: '',
        institucionesSeleccionadas: [],
        estudiantesSeleccionados: [],
        mensaje: ''
      });
      setAdjuntos([]);
      setShowForm(false);

      // Recargar comunicados
      await loadInitialData();
    } catch (err) {
      console.error('Error al enviar el comunicado:', err);
      setError('Error al enviar el comunicado: ' + (err.response?.data?.error || err.message));
    } finally {
      setSending(false);
    }
  };

  const handleDeleteClick = (comunicado) => {
    setComunicadoToDelete(comunicado);
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (comunicadoToDelete) {
      try {
        setDeleting(true);
        await api.delete(`/api/comunicados/${comunicadoToDelete.ID}`);
        setSuccess('Comunicado eliminado exitosamente');
        await loadInitialData();
      } catch (err) {
        console.error('Error al eliminar:', err);
        setError('Error al eliminar: ' + (err.response?.data?.error || err.message));
      } finally {
        setDeleting(false);
      }
    }
    setShowConfirmDialog(false);
    setComunicadoToDelete(null);
  };

  const handleCancelDelete = () => {
    setShowConfirmDialog(false);
    setComunicadoToDelete(null);
  };

  const handleViewComunicado = (comunicado) => {
    setSelectedComunicado(comunicado);
    setShowViewModal(true);
  };

  const handleViewDestinatarios = (comunicado) => {
    setComunicadoDestinatarios(comunicado);
    setShowDestinatariosModal(true);
  };

  const getDestinatarioTipo = (destinatariosJSON) => {
    try {
      const dest = JSON.parse(destinatariosJSON);
      return dest.tipo || 'desconocido';
    } catch {
      return 'desconocido';
    }
  };

  const getDestinatarioLabel = (destinatariosJSON) => {
    try {
      const dest = JSON.parse(destinatariosJSON);
      switch (dest.tipo) {
        case 'todos':
          return 'Todos los estudiantes';
        case 'instituciones':
          return `${dest.ids?.length || 0} institución(es)`;
        case 'estudiantes':
          return `${dest.ids?.length || 0} estudiante(s)`;
        case 'todas_instituciones':
          return 'Todas las instituciones';
        default:
          return 'Desconocido';
      }
    } catch {
      return 'Desconocido';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtrar comunicados
  const filteredComunicados = comunicados.filter(com => {
    const matchesSearch = (com.asunto || '').toLowerCase().includes(searchTerm.toLowerCase());
    const tipo = getDestinatarioTipo(com.destinatarios);
    const matchesFilter = destinatarioFilter === 'todos' || tipo === destinatarioFilter;
    return matchesSearch && matchesFilter;
  });

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentComunicados = filteredComunicados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredComunicados.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

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
            setFormData({
              asunto: '',
              tipoDestinatario: '',
              institucionesSeleccionadas: [],
              estudiantesSeleccionados: [],
              mensaje: ''
            });
            setAdjuntos([]);
          }}
          className={`inline-flex items-center text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 text-sm sm:text-base ${showForm
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-green-800 hover:bg-green-900'
            }`}
          style={{ backgroundColor: showForm ? '#dc2626' : '#025a27' }}
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
              <span className="hidden sm:inline">Nuevo Comunicado</span>
              <span className="sm:hidden">Nuevo</span>
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

        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
          {/* Header del formulario */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200" style={{ backgroundColor: '#025a27' }}>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Nuevo Comunicado
            </h3>
          </div>

          <div className="px-3 sm:px-6 py-4 sm:py-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Asunto */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Asunto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="asunto"
                  value={formData.asunto}
                  onChange={handleInputChange}
                  required
                  placeholder="Ingrese el asunto del comunicado"
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base"
                />
              </div>

              {/* Tipo de Destinatario */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Destinatarios <span className="text-red-500">*</span>
                </label>
                <select
                  name="tipoDestinatario"
                  value={formData.tipoDestinatario}
                  onChange={handleInputChange}
                  required
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base"
                >
                  <option value="">Seleccione tipo de destinatario</option>
                  <option value="todos">Todos los estudiantes</option>
                  <option value="todas_instituciones">Todas las instituciones</option>
                  <option value="instituciones">Instituciones específicas</option>
                  <option value="estudiantes">Estudiantes específicos</option>
                </select>
              </div>

              {/* Selección de Instituciones */}
              {formData.tipoDestinatario === 'instituciones' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Seleccione Instituciones <span className="text-red-500">*</span>
                  </label>
                  {/* Input de búsqueda */}
                  <div className="relative mb-2">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por nombre o correo..."
                      value={busquedaInstitucion}
                      onChange={(e) => setBusquedaInstitucion(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                    {instituciones
                      .filter(inst => {
                        if (!busquedaInstitucion.trim()) return true;
                        const search = busquedaInstitucion.toLowerCase();
                        return (
                          inst.nombre?.toLowerCase().includes(search) ||
                          inst.correo?.toLowerCase().includes(search)
                        );
                      })
                      .map(inst => (
                        <label key={inst.ID} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.institucionesSeleccionadas.includes(inst.ID)}
                            onChange={() => handleInstitucionChange(inst.ID)}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{inst.nombre}</span>
                          {inst.correo && (
                            <span className="ml-2 text-xs text-gray-500">({inst.correo})</span>
                          )}
                        </label>
                      ))}
                    {instituciones.filter(inst => {
                      if (!busquedaInstitucion.trim()) return true;
                      const search = busquedaInstitucion.toLowerCase();
                      return inst.nombre?.toLowerCase().includes(search) || inst.correo?.toLowerCase().includes(search);
                    }).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-2">No se encontraron instituciones</p>
                      )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.institucionesSeleccionadas.length} institución(es) seleccionada(s)
                  </p>
                </div>
              )}

              {/* Selección de Estudiantes */}
              {formData.tipoDestinatario === 'estudiantes' && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Seleccione Estudiantes <span className="text-red-500">*</span>
                  </label>
                  {/* Input de búsqueda */}
                  <div className="relative mb-2">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por nombre, cédula o correo..."
                      value={busquedaEstudiante}
                      onChange={(e) => setBusquedaEstudiante(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                    {estudiantes
                      .filter(est => {
                        if (!busquedaEstudiante.trim()) return true;
                        const search = busquedaEstudiante.toLowerCase();
                        return (
                          est.persona?.nombre?.toLowerCase().includes(search) ||
                          est.persona?.cedula?.toLowerCase().includes(search) ||
                          est.persona?.correo?.toLowerCase().includes(search)
                        );
                      })
                      .map(est => (
                        <label key={est.ID} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.estudiantesSeleccionados.includes(est.ID)}
                            onChange={() => handleEstudianteChange(est.ID)}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {est.persona?.nombre || 'Sin nombre'} - {est.persona?.cedula || 'Sin cédula'}
                          </span>
                          {est.persona?.correo && (
                            <span className="ml-2 text-xs text-gray-500">({est.persona.correo})</span>
                          )}
                        </label>
                      ))}
                    {estudiantes.filter(est => {
                      if (!busquedaEstudiante.trim()) return true;
                      const search = busquedaEstudiante.toLowerCase();
                      return (
                        est.persona?.nombre?.toLowerCase().includes(search) ||
                        est.persona?.cedula?.toLowerCase().includes(search) ||
                        est.persona?.correo?.toLowerCase().includes(search)
                      );
                    }).length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-2">No se encontraron estudiantes</p>
                      )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.estudiantesSeleccionados.length} estudiante(s) seleccionado(s)
                  </p>
                </div>
              )}

              {/* Editor de Mensaje */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Mensaje <span className="text-red-500">*</span>
                </label>
                <div className="border border-gray-300 rounded-md">
                  <ReactQuill
                    theme="snow"
                    value={formData.mensaje}
                    onChange={handleMensajeChange}
                    modules={quillModules}
                    formats={quillFormats}
                    placeholder="Escriba su mensaje aquí..."
                    className="bg-white"
                    style={{ minHeight: '200px' }}
                  />
                </div>
              </div>

              {/* Adjuntos */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Archivos Adjuntos <span className="text-gray-400">(Opcional - PDF e imágenes, máx. 5MB c/u)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.gif"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Adjuntar Archivos
                  </button>
                </div>

                {/* Mensaje de error de adjuntos */}
                {adjuntosError && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
                    <svg className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">Error al adjuntar archivo(s)</p>
                      <p className="text-sm text-red-600 mt-0.5">{adjuntosError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAdjuntosError('')}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                {adjuntos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {adjuntos.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                        <span className="text-sm text-gray-600 truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAdjunto(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botón Enviar */}
              <div className="pt-4 sm:pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 text-sm sm:text-base"
                  style={{ backgroundColor: '#025a27' }}
                  onMouseEnter={(e) => !sending && (e.target.style.backgroundColor = '#014a1f')}
                  onMouseLeave={(e) => !sending && (e.target.style.backgroundColor = '#025a27')}
                >
                  {sending ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Enviando...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Enviar Comunicado
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

      )}

      {/* Lista de Comunicados */}
      {!showForm && (

        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
          {/* Header de la tabla */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200" style={{ backgroundColor: '#025a27' }}>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Comunicados Enviados
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
                  placeholder="Buscar comunicados por asunto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Destinatario:</label>
                    <select
                      value={destinatarioFilter}
                      onChange={(e) => setDestinatarioFilter(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="todos">Todos</option>
                      <option value="todos">Todos los estudiantes</option>
                      <option value="todas_instituciones">Todas las instituciones</option>
                      <option value="instituciones">Instituciones específicas</option>
                      <option value="estudiantes">Estudiantes específicos</option>
                    </select>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {searchTerm || destinatarioFilter !== 'todos' ? (
                    <span>
                      Mostrando {filteredComunicados.length} de {comunicados.length} comunicados
                      {filteredComunicados.length !== comunicados.length && (
                        <span className="text-green-600 font-medium"> (filtrados)</span>
                      )}
                    </span>
                  ) : (
                    <span>Total: {comunicados.length} comunicados</span>
                  )}
                </div>
              </div>
            </div>

            {comunicados.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay comunicados</h3>
                <p className="mt-1 text-sm text-gray-500">Comienza enviando un nuevo comunicado.</p>
              </div>
            ) : (
              <>
                {/* Vista de tabla para desktop */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr style={{ backgroundColor: '#ffffff' }}>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Fecha
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Asunto
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Destinatarios
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Enviados
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {currentComunicados.map((comunicado, index) => (
                        <tr
                          key={comunicado.ID}
                          className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(comunicado.CreatedAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: '#4ade80' }}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {comunicado.asunto}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-gray-900">
                                {getDestinatarioLabel(comunicado.destinatarios)}
                              </span>
                              {(() => {
                                try {
                                  const dest = JSON.parse(comunicado.destinatarios);
                                  if ((dest.tipo === 'instituciones' || dest.tipo === 'estudiantes') && dest.ids?.length > 0) {
                                    return (
                                      <button
                                        onClick={() => handleViewDestinatarios(comunicado)}
                                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                                        title="Ver lista de destinatarios"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                      </button>
                                    );
                                  }
                                  return null;
                                } catch { return null; }
                              })()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {comunicado.enviado_a} correo(s)
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => handleViewComunicado(comunicado)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 transition-all duration-200 hover:shadow-md"
                                title="Ver Comunicado"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                Ver
                              </button>
                              <button
                                onClick={() => handleDeleteClick(comunicado)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 transition-all duration-200 hover:shadow-md"
                                title="Eliminar Comunicado"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Eliminar
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
                  {currentComunicados.map((comunicado) => (
                    <div key={comunicado.ID} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#4ade80' }}>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">
                              {comunicado.asunto}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              {formatDate(comunicado.CreatedAt)}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {comunicado.enviado_a} enviados
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Destinatarios</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-gray-900">
                              {getDestinatarioLabel(comunicado.destinatarios)}
                            </p>
                            {(() => {
                              try {
                                const dest = JSON.parse(comunicado.destinatarios);
                                if ((dest.tipo === 'instituciones' || dest.tipo === 'estudiantes') && dest.ids?.length > 0) {
                                  return (
                                    <button
                                      onClick={() => handleViewDestinatarios(comunicado)}
                                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                                      title="Ver lista de destinatarios"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                      </svg>
                                    </button>
                                  );
                                }
                                return null;
                              } catch { return null; }
                            })()}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => handleViewComunicado(comunicado)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 transition-all duration-200"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver
                        </button>
                        <button
                          onClick={() => handleDeleteClick(comunicado)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 transition-all duration-200"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Eliminar
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
                  totalItems={filteredComunicados.length}
                  itemsPerPage={itemsPerPage}
                  totalItemsOriginal={(searchTerm || destinatarioFilter !== 'todos') ? comunicados.length : null}
                  itemName="comunicados"
                />
              </>
            )}
          </div>
        </div>

      )}

      {/* Modal de Vista de Comunicado */}
      {showViewModal && selectedComunicado && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all scale-100 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center" style={{ backgroundColor: '#025a27' }}>
              <h3 className="text-lg font-bold text-white flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Detalle del Comunicado
              </h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Asunto</h4>
                <p className="text-lg font-semibold text-gray-900">{selectedComunicado.asunto}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Fecha de Envío</h4>
                  <p className="text-gray-900 mt-1">{formatDate(selectedComunicado.CreatedAt)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Destinatarios</h4>
                  <p className="text-gray-900 mt-1">{getDestinatarioLabel(selectedComunicado.destinatarios)}</p>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Correos Enviados</h4>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                  {selectedComunicado.enviado_a} correo(s)
                </span>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Mensaje</h4>
                <div
                  className="bg-gray-50 p-4 rounded-xl border border-gray-200 prose prose-sm max-w-none overflow-x-auto"
                  style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                  dangerouslySetInnerHTML={{ __html: selectedComunicado.mensaje }}
                />
              </div>

              {selectedComunicado.adjuntos && selectedComunicado.adjuntos !== '[]' && selectedComunicado.adjuntos !== 'null' && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">Archivos Adjuntos</h4>
                  <div className="space-y-2">
                    {(() => {
                      try {
                        const parsedAdjuntos = JSON.parse(selectedComunicado.adjuntos);
                        if (!Array.isArray(parsedAdjuntos) || parsedAdjuntos.length === 0) return null;
                        return parsedAdjuntos.map((adjunto, index) => {
                          // Extraer el nombre del archivo de la ruta completa
                          const fileName = adjunto.split('/').pop();
                          // Determinar si es imagen o PDF
                          const isImage = /\.(jpg|jpeg|png|gif)$/i.test(adjunto);
                          const isPdf = /\.pdf$/i.test(adjunto);
                          // Construir la URL completa del backend
                          const fileUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${adjunto}`;

                          return (
                            <a
                              key={index}
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center p-3 bg-gray-50 rounded-xl border border-gray-200 hover:bg-gray-100 hover:border-green-300 hover:shadow-md transition-all duration-200 group cursor-pointer"
                            >
                              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-gray-200 mr-3 group-hover:border-green-400 transition-colors duration-200">
                                {isImage ? (
                                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                ) : isPdf ? (
                                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-700 truncate group-hover:text-green-700 transition-colors duration-200">
                                  {fileName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {isImage ? 'Imagen' : isPdf ? 'Documento PDF' : 'Archivo'}
                                </p>
                              </div>
                              <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          );
                        });
                      } catch (e) {
                        return null;
                      }
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Destinatarios */}
      {showDestinatariosModal && comunicadoDestinatarios && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all scale-100 max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center" style={{ backgroundColor: '#025a27' }}>
              <h3 className="text-lg font-bold text-white flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Destinatarios
              </h3>
              <button
                onClick={() => setShowDestinatariosModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Comunicado</h4>
                <p className="text-gray-900 font-semibold">{comunicadoDestinatarios.asunto}</p>
              </div>

              {(() => {
                try {
                  const dest = JSON.parse(comunicadoDestinatarios.destinatarios);
                  if (dest.tipo === 'instituciones' && dest.ids?.length > 0) {
                    const institucionesSeleccionadas = instituciones.filter(i => dest.ids.includes(i.ID));
                    return (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                          Instituciones ({institucionesSeleccionadas.length})
                        </h4>
                        <ul className="space-y-2">
                          {institucionesSeleccionadas.map(inst => (
                            <li key={inst.ID} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-green-100 mr-3">
                                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{inst.nombre}</p>
                                {inst.correo && <p className="text-xs text-gray-500">{inst.correo}</p>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  } else if (dest.tipo === 'estudiantes' && dest.ids?.length > 0) {
                    const estudiantesSeleccionados = estudiantes.filter(e => dest.ids.includes(e.ID));
                    return (
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                          Estudiantes ({estudiantesSeleccionados.length})
                        </h4>
                        <ul className="space-y-2">
                          {estudiantesSeleccionados.map(est => (
                            <li key={est.ID} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 mr-3">
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{est.persona?.nombre || 'Sin nombre'}</p>
                                {est.persona?.correo && <p className="text-xs text-gray-500">{est.persona.correo}</p>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  }
                  return <p className="text-gray-500 text-sm">No hay destinatarios específicos</p>;
                } catch {
                  return <p className="text-gray-500 text-sm">Error al cargar destinatarios</p>;
                }
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminación */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Confirmar Eliminación"
        message={`¿Está seguro de que desea eliminar el comunicado "${comunicadoToDelete?.asunto || 'este comunicado'}"? Esta acción no se puede deshacer.`}
        confirmText={deleting ? "Eliminando..." : "Eliminar"}
        cancelText="Cancelar"
        loading={deleting}
        type="danger"
      />
    </div>

  );
};

export default ComunicadosManager;
