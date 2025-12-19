import { useState, useEffect } from 'react';
import ConfirmDialog from './ConfirmDialog';
import api from '../api/client';

const ActividadesManager = ({ onBack }) => {
  const [actividades, setActividades] = useState([]);
  const [tematicas, setTematicas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingActividad, setEditingActividad] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, id: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [tematicaFilter, setTematicaFilter] = useState('');
  const [deleting, setDeleting] = useState(false);

  const API_URL = `/api/actividades`;
  const TEMATICAS_URL = `/api/tematicas`;

  // Estados para el formulario
  const [formData, setFormData] = useState({
    actividad: '',
    tematica_id: '',
    duracion: ''
  });

  useEffect(() => {
    fetchActividades();
    fetchTematicas();
  }, []);

  const fetchActividades = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_URL);

      // Asegurar que siempre sea un array
      let actividadesData = response.data;
      if (Array.isArray(actividadesData)) {
        setActividades(actividadesData);
      } else if (actividadesData && Array.isArray(actividadesData.data)) {
        // Si la respuesta tiene una estructura { data: [...] }
        setActividades(actividadesData.data);
      } else if (actividadesData && Array.isArray(actividadesData.actividades)) {
        // Si la respuesta tiene una estructura { actividades: [...] }
        setActividades(actividadesData.actividades);
      } else {
        // Si no es un array, inicializar como array vacío
        console.warn('La respuesta de la API no es un array:', actividadesData);
        setActividades([]);
      }
    } catch (error) {
      setError('Error al cargar las actividades: ' + error.message);
      setActividades([]); // Asegurar que siempre sea un array
    } finally {
      setLoading(false);
    }
  };

  const fetchTematicas = async () => {
    try {
      const response = await api.get(TEMATICAS_URL);

      // Asegurar que siempre sea un array
      let tematicasData = response.data;
      if (Array.isArray(tematicasData)) {
        setTematicas(tematicasData);
      } else if (tematicasData && Array.isArray(tematicasData.data)) {
        setTematicas(tematicasData.data);
      } else if (tematicasData && Array.isArray(tematicasData.tematicas)) {
        setTematicas(tematicasData.tematicas);
      } else {
        console.warn('La respuesta de temáticas no es un array:', tematicasData);
        setTematicas([]);
      }
    } catch (error) {
      console.error('Error al cargar temáticas:', error);
      setTematicas([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.actividad.trim()) {
      setError('El nombre de la actividad es obligatorio');
      return;
    }

    if (!formData.tematica_id) {
      setError('Debe seleccionar una temática');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const url = editingActividad ? `${API_URL}/${editingActividad.ID}` : API_URL;

      const dataToSend = {
        ...formData,
        tematica_id: parseInt(formData.tematica_id),
        duracion: formData.duracion ? parseInt(formData.duracion) : 0
      };

      if (editingActividad) {
        await api.put(url, dataToSend);
      } else {
        await api.post(url, dataToSend);
      }

      await fetchActividades();

      setSuccess(editingActividad ? 'Actividad actualizada exitosamente' : 'Actividad registrada exitosamente');

      // Resetear formulario
      setFormData({ actividad: '', tematica_id: '', duracion: '' });
      setShowForm(false);
      setEditingActividad(null);

    } catch (error) {
      setError('Error al guardar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (actividad) => {
    setEditingActividad(actividad);
    setFormData({
      actividad: actividad.actividad,
      tematica_id: actividad.tematica_id?.toString() || '',
      duracion: actividad.duracion?.toString() || ''
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleDelete = (id) => {
    setConfirmDialog({ open: true, id });
  };

  const confirmDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`${API_URL}/${confirmDialog.id}`);

      await fetchActividades();
      setConfirmDialog({ open: false, id: null });
      setSuccess('Actividad eliminada exitosamente');
      setError('');
    } catch (error) {
      setError('Error al eliminar: ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Filtrar actividades basado en el término de búsqueda y temática
  const filteredActividades = Array.isArray(actividades) ? actividades.filter(actividad => {
    const matchesSearch = actividad.actividad?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTematica = !tematicaFilter || actividad.tematica_id?.toString() === tematicaFilter;
    return matchesSearch && matchesTematica;
  }) : [];

  const formatDuration = (minutes) => {
    if (!minutes) return 'No especificada';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const getTematicaNombre = (tematicaId) => {
    const tematica = tematicas.find(t => t.ID === tematicaId);
    return tematica ? tematica.nombre : 'Temática no encontrada';
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
            setEditingActividad(null);
            setFormData({ actividad: '', tematica_id: '', duracion: '' });
            setError('');
            setSuccess('');
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
              <span className="hidden sm:inline">Nueva Actividad</span>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2H9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l10 10m0 0l-10-10m10 10V9m0 10H9" />
              </svg>
              {editingActividad ? 'Editar Actividad' : 'Registrar Nueva Actividad'}
            </h3>
          </div>

          <div className="px-3 sm:px-6 py-4 sm:py-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#025a27' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2H9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l10 10m0 0l-10-10m10 10V9m0 10H9" />
                  </svg>
                  Información de la Actividad
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nombre de la Actividad *</label>
                    <input
                      type="text"
                      name="actividad"
                      value={formData.actividad}
                      onChange={handleInputChange}
                      required
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                      placeholder="Ej: Conferencia sobre IA"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Temática *</label>
                    <select
                      name="tematica_id"
                      value={formData.tematica_id}
                      onChange={handleInputChange}
                      required
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                    >
                      <option value="">Seleccionar temática</option>
                      {tematicas.map((tematica) => (
                        <option key={tematica.ID} value={tematica.ID}>
                          {tematica.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Duración (minutos)</label>
                    <input
                      type="number"
                      name="duracion"
                      value={formData.duracion}
                      onChange={handleInputChange}
                      min="0"
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                      placeholder="Ej: 60"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Opcional: duración en minutos de la actividad
                    </p>
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
                      {editingActividad ? 'Actualizar Actividad' : 'Registrar Actividad'}
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

      )}

      {/* Lista de actividades */}
      {!showForm && (

        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
          {/* Header de la tabla */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200" style={{ backgroundColor: '#025a27' }}>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2H9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l10 10m0 0l-10-10m10 10V9m0 10H9" />
              </svg>
              Lista de Actividades
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
                  placeholder="Buscar actividades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 text-sm"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Temática:</label>
                    <select
                      value={tematicaFilter}
                      onChange={(e) => setTematicaFilter(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">Todas las temáticas</option>
                      {tematicas.map((tematica) => (
                        <option key={tematica.ID} value={tematica.ID}>
                          {tematica.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  Total: {actividades.length} actividades
                </div>
              </div>

              {/* Estadísticas de búsqueda */}
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>
                  {searchTerm || tematicaFilter ? (
                    <span>
                      Mostrando {filteredActividades.length} de {actividades.length} actividades
                      {(filteredActividades.length !== actividades.length) && (
                        <span className="ml-1 text-green-600 font-medium">
                          (filtradas)
                        </span>
                      )}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {actividades.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2H9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9l10 10m0 0l-10-10m10 10V9m0 10H9" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay actividades</h3>
                <p className="mt-1 text-sm text-gray-500">Comienza agregando una nueva actividad.</p>
              </div>
            ) : (
              <>
                {/* Vista de tabla para desktop */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr style={{ backgroundColor: '#ffffff' }}>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Actividad
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Temática
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Duración
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredActividades.map((actividad, index) => (
                        <tr
                          key={actividad.ID}
                          className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: '#4ade80' }}>
                                  {(actividad.actividad || 'A').charAt(0).toUpperCase()}
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {actividad.actividad}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {getTematicaNombre(actividad.tematica_id)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDuration(actividad.duracion)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => handleEdit(actividad)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-gray-700 bg-yellow-100 hover:bg-yellow-200 transition-all duration-200 hover:shadow-md"
                              >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Editar
                              </button>
                              <button
                                onClick={() => handleDelete(actividad.ID)}
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
                  {filteredActividades.map((actividad, index) => (
                    <div
                      key={actividad.ID}
                      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#4ade80' }}>
                              {(actividad.actividad || 'A').charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="ml-3">
                            <h4 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">
                              {actividad.actividad}
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">
                              ID: {actividad.ID}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Temática</p>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mt-1">
                            {getTematicaNombre(actividad.tematica_id)}
                          </span>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Duración</p>
                          <p className="text-sm text-gray-900 mt-1">
                            {formatDuration(actividad.duracion)}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => handleEdit(actividad)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-gray-700 bg-yellow-100 hover:bg-yellow-200 transition-all duration-200"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(actividad.ID)}
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
              </>
            )}
          </div>
        </div>

      )}

      {/* Diálogo de confirmación */}
      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, id: null })}
        onConfirm={confirmDelete}
        title="Eliminar Actividad"
        message="¿Está seguro que desea eliminar esta actividad? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        loading={deleting}
      />
    </div>

  );
};

export default ActividadesManager;
