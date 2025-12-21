import { useState, useEffect } from 'react';
import api from '../api/client';
import ConfirmDialog from './ConfirmDialog';
import Paginacion from './Paginacion';

const InstitucionesManager = ({ onBack }) => {
  // Cliente API centralizado con token

  const [instituciones, setInstituciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInstitucion, setEditingInstitucion] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para el modal de confirmación
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [institucionToDelete, setInstitucionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const [formData, setFormData] = useState({
    nombre: '',
    autoridad: '',
    contacto: '',
    correo: '',
    direccion: ''
  });

  // Estados para errores de validación
  const [validationErrors, setValidationErrors] = useState({});

  // Cargar datos iniciales
  useEffect(() => {
    loadInstituciones();
  }, []);

  const loadInstituciones = async () => {
    try {
      const response = await api.get(`/api/instituciones`);
      setInstituciones(response.data.success ? response.data.data : response.data);
    } catch (err) {
      setError('Error al cargar los datos: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Limpiar errores de validación cuando el usuario empiece a escribir
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: ''
      });
    }

    // Validación especial para el campo contacto
    if (name === 'contacto') {
      // Si el valor parece ser un teléfono (solo números), validar que tenga máximo 10 dígitos
      if (/^\d+$/.test(value)) {
        // Solo números: limitar a 10 dígitos
        const numericValue = value.slice(0, 10);
        setFormData({
          ...formData,
          [name]: numericValue
        });

        // Validar longitud si hay contenido
        if (numericValue && numericValue.length !== 10) {
          setValidationErrors({
            ...validationErrors,
            contacto: 'El teléfono debe tener exactamente 10 dígitos'
          });
        }
      } else {
        // Permitir otros tipos de contacto (email, etc.)
        setFormData({
          ...formData,
          [name]: value
        });

        // Si contiene @ probablemente es email, validar formato básico
        if (value.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          setValidationErrors({
            ...validationErrors,
            contacto: 'Ingrese un email válido o un teléfono de 10 dígitos'
          });
        }
      }
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validación de campos obligatorios
    const errors = {};
    const nombre = (formData.nombre || '').trim();
    const autoridad = (formData.autoridad || '').trim();
    const contacto = (formData.contacto || '').trim();
    const direccion = (formData.direccion || '').trim();

    if (!nombre) errors.nombre = 'El nombre de la institución es obligatorio';
    if (!autoridad) errors.autoridad = 'La autoridad es obligatoria';
    if (!contacto) errors.contacto = 'El contacto es obligatorio';
    if (!direccion) errors.direccion = 'La dirección es obligatoria';

    if (Object.keys(errors).length > 0) {
      setValidationErrors((prev) => ({ ...prev, ...errors }));
      setError('Por favor complete los campos obligatorios.');
      return;
    }

    setLoading(true);

    try {
      if (editingInstitucion) {
        await api.put(`/api/instituciones/${editingInstitucion.ID}`, formData);
        setSuccess('Institución actualizada exitosamente');
      } else {
        await api.post(`/api/instituciones`, formData);
        setSuccess('Institución registrada exitosamente');
      }

      // Recargar la lista
      await loadInstituciones();

      // Resetear formulario
      setFormData({
        nombre: '',
        autoridad: '',
        contacto: '',
        correo: '',
        direccion: ''
      });
      setShowForm(false);
      setEditingInstitucion(null);

    } catch (err) {
      console.error('Error completo:', err);

      let errorMessage = 'Error al guardar la institución: ';
      if (err.response?.data?.error) {
        errorMessage += err.response.data.error;
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

  const handleEdit = (institucion) => {
    setEditingInstitucion(institucion);
    setFormData({
      nombre: institucion.nombre || '',
      autoridad: institucion.autoridad || '',
      contacto: institucion.contacto || '',
      correo: institucion.correo || '',
      direccion: institucion.direccion || ''
    });
    setShowForm(true);
  };

  const handleDeleteClick = (institucion) => {
    setInstitucionToDelete(institucion);
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (institucionToDelete) {
      try {
        setDeleting(true);
        await api.delete(`/api/instituciones/${institucionToDelete.ID}`);
        setSuccess('Institución eliminada exitosamente');
        await loadInstituciones();
        setError('');
      } catch (err) {
        setError('Error al eliminar la institución: ' + (err.response?.data?.error || err.message));
      } finally {
        setDeleting(false);
      }
    }
    setShowConfirmDialog(false);
    setInstitucionToDelete(null);
  };

  const handleCancelDelete = () => {
    setShowConfirmDialog(false);
    setInstitucionToDelete(null);
  };

  // Funciones de paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInstituciones = instituciones.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(instituciones.length / itemsPerPage);

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
    <div className="min-h-screen bg-gray-100">
      {/* Barra de botones */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6">
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
              setEditingInstitucion(null);
              setValidationErrors({});
              setFormData({
                nombre: '',
                autoridad: '',
                contacto: '',
                correo: '',
                direccion: ''
              });
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
                <span className="hidden sm:inline">Nueva Institución</span>
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
          <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
            {/* Header del formulario */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200" style={{ backgroundColor: '#025a27' }}>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                {editingInstitucion ? 'Editar Institución' : 'Registrar Nueva Institución'}
              </h3>
            </div>

            <div className="px-3 sm:px-6 py-4 sm:py-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Datos de la institución */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#025a27' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Información de la Institución
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nombre de la Institución</label>
                      <input
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleInputChange}
                        required
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                        placeholder="Ingrese el nombre completo de la institución"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Autoridad</label>
                      <input
                        type="text"
                        name="autoridad"
                        value={formData.autoridad}
                        onChange={handleInputChange}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                        required
                        placeholder="Nombre de la autoridad principal"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Contacto</label>
                      <input
                        type="tel"
                        name="contacto"
                        value={formData.contacto}
                        onChange={handleInputChange}
                        className={`block w-full border rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 text-sm sm:text-base transition-colors duration-200 ${validationErrors.contacto
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                          }`}
                        placeholder="Teléfono (10 dígitos)"
                      />
                      {validationErrors.contacto && (
                        <p className="mt-1 text-xs text-red-600 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {validationErrors.contacto}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                      <input
                        type="email"
                        name="correo"
                        value={formData.correo}
                        onChange={handleInputChange}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                        placeholder="correo@institucion.edu.ec"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Dirección</label>
                      <textarea
                        name="direccion"
                        value={formData.direccion}
                        onChange={handleInputChange}
                        rows={3}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                        placeholder="Dirección completa de la institución"
                      />
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
                    onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#014a1f')}
                    onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = '#025a27')}
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
                        {editingInstitucion ? 'Actualizar Institución' : 'Registrar Institución'}
                      </div>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lista de instituciones */}
        {!showForm && (
          <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
            {/* Header de la tabla */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200" style={{ backgroundColor: '#025a27' }}>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Lista de Instituciones Educativas
              </h3>
            </div>

            <div className="px-3 sm:px-6 py-4 sm:py-6">
              {instituciones.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay instituciones</h3>
                  <p className="mt-1 text-sm text-gray-500">Comienza agregando una nueva institución educativa.</p>
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
                            Autoridad
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                            Contacto
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                            Correo
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                            Dirección
                          </th>
                          <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {currentInstituciones.map((institucion, index) => (
                          <tr
                            key={institucion.ID}
                            className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: '#4ade80' }}>
                                    {(institucion.nombre || 'I').charAt(0).toUpperCase()}
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {institucion.nombre || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {institucion.autoridad || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {institucion.contacto || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {institucion.correo || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900 max-w-xs truncate">
                                {institucion.direccion || 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => handleEdit(institucion)}
                                  className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-gray-700 bg-yellow-100 hover:bg-yellow-200 transition-all duration-200 hover:shadow-md"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(institucion)}
                                  className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 transition-all duration-200 hover:shadow-md"
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
                    {currentInstituciones.map((institucion, index) => (
                      <div
                        key={institucion.ID}
                        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
                              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#4ade80' }}>
                                {(institucion.nombre || 'I').charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div className="ml-3">
                              <h4 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">
                                {institucion.nombre || 'N/A'}
                              </h4>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Autoridad</p>
                            <p className="text-sm text-gray-900 mt-1">
                              {institucion.autoridad || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contacto</p>
                            <p className="text-sm text-gray-900 mt-1">
                              {institucion.contacto || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Correo</p>
                            <p className="text-sm text-gray-900 mt-1">
                              {institucion.correo || 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Dirección</p>
                          <p className="text-sm text-gray-900">
                            {institucion.direccion || 'N/A'}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => handleEdit(institucion)}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-gray-700 bg-yellow-100 hover:bg-yellow-200 transition-all duration-200"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteClick(institucion)}
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
                    totalItems={instituciones.length}
                    itemsPerPage={itemsPerPage}
                    itemName="instituciones"
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmación para eliminación */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Confirmar Eliminación"
        message={`¿Está seguro de que desea eliminar la institución "${institucionToDelete?.nombre || 'esta institución'}"? Esta acción no se puede deshacer.`}
        confirmText={deleting ? "Eliminando..." : "Eliminar"}
        cancelText="Cancelar"
        loading={deleting}
      />
    </div>
  );
};

export default InstitucionesManager;
