import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import ConfirmDialog from './ConfirmDialog';
import GeneracionFormatoExcel from './GeneracionFormatoExcel';

const SystemConfig = ({ onBack }) => {
  // Cliente API centralizado con token

  const [currentSection, setCurrentSection] = useState('provincias');
  const [provincias, setProvincias] = useState([]);
  const [ciudades, setCiudades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Estados para generar Excel
  const [instituciones, setInstituciones] = useState([]);

  // Estados para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Estado para búsqueda
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para WhatsApp
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected');
  const [whatsappQR, setWhatsappQR] = useState(null);
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  // Cargar datos según la sección actual
  useEffect(() => {
    loadData();
  }, [currentSection]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (currentSection) {
        case 'provincias':
          const provinciasRes = await api.get(`/api/provincias`);
          setProvincias(provinciasRes.data);
          break;
        case 'ciudades':
          const [ciudadesRes, provinciasForCities] = await Promise.all([
            api.get(`/api/ciudades`),
            api.get(`/api/provincias`)
          ]);
          setCiudades(ciudadesRes.data);
          setProvincias(provinciasForCities.data);
          break;
        case 'generar_excel':
          const [institucionesRes, ciudadesForExcel] = await Promise.all([
            api.get(`/api/instituciones`),
            api.get(`/api/ciudades`)
          ]);
          setInstituciones(institucionesRes.data);
          setCiudades(ciudadesForExcel.data);
          break;
      }
    } catch (err) {
      setError('Error al cargar los datos: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Funciones de WhatsApp
  const fetchWhatsappStatus = useCallback(async () => {
    try {
      const response = await api.get('/api/whatsapp/status');
      setWhatsappStatus(response.data.status);
      return response.data.status;
    } catch (err) {
      console.error('Error obteniendo estado WhatsApp:', err);
      return 'error';
    }
  }, []);

  const fetchWhatsappQR = useCallback(async () => {
    try {
      const response = await api.get('/api/whatsapp/qr');
      if (response.data.success && response.data.qr) {
        setWhatsappQR(response.data.qr);
      } else {
        setWhatsappQR(null);
      }
      setWhatsappStatus(response.data.status);
    } catch (err) {
      console.error('Error obteniendo QR:', err);
    }
  }, []);

  const handleWhatsappLogout = async () => {
    try {
      await api.post('/api/whatsapp/logout');
      setWhatsappStatus('disconnected');
      setWhatsappQR(null);
      setSuccess('Sesión de WhatsApp cerrada. Espere a que aparezca un nuevo QR.');
    } catch (err) {
      console.error('Error cerrando sesión:', err);
      setError('Error al cerrar sesión de WhatsApp');
    }
  };

  // Polling para WhatsApp cuando la sección está activa
  useEffect(() => {
    let interval;

    if (currentSection === 'whatsapp') {
      const init = async () => {
        setWhatsappLoading(true);
        const status = await fetchWhatsappStatus();
        if (status === 'qr' || status === 'disconnected') {
          await fetchWhatsappQR();
        }
        setWhatsappLoading(false);
      };
      init();

      interval = setInterval(async () => {
        const status = await fetchWhatsappStatus();
        if (status === 'qr') {
          await fetchWhatsappQR();
        } else if (status === 'ready') {
          setWhatsappQR(null);
        }
      }, 3000);
    }

    return () => clearInterval(interval);
  }, [currentSection, fetchWhatsappStatus, fetchWhatsappQR]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'provincia_id' ? parseInt(value) || '' : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const endpoint = currentSection;

      // Preparar datos para enviar - solo enviar los campos necesarios
      let dataToSend = {};

      if (currentSection === 'provincias') {
        if (!formData.provincia || formData.provincia.trim() === '') {
          setError('El nombre de la provincia es requerido');
          return;
        }
        dataToSend = {
          provincia: formData.provincia.trim()
        };
      } else if (currentSection === 'ciudades') {
        if (!formData.ciudad || formData.ciudad.trim() === '') {
          setError('El nombre de la ciudad es requerido');
          return;
        }
        if (!formData.provincia_id || isNaN(parseInt(formData.provincia_id))) {
          setError('Debe seleccionar una provincia válida');
          return;
        }
        dataToSend = {
          ciudad: formData.ciudad.trim(),
          provincia_id: parseInt(formData.provincia_id)
        };
      }

      if (editingItem) {
        await api.put(`/api/${endpoint}/${editingItem.ID}`, dataToSend);
        setSuccess(`${getSectionTitle()} actualizado exitosamente`);
      } else {
        await api.post(`/api/${endpoint}`, dataToSend);
        setSuccess(`${getSectionTitle()} creado exitosamente`);
      }

      await loadData();
      resetForm();
    } catch (err) {
      console.error('Error al guardar:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Error desconocido';
      setError('Error al guardar: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    // Solo copiar los campos necesarios para el formulario
    const cleanFormData = {};

    if (currentSection === 'provincias') {
      cleanFormData.provincia = item.provincia;
    } else if (currentSection === 'ciudades') {
      cleanFormData.ciudad = item.ciudad;
      cleanFormData.provincia_id = item.provincia_id;
    }

    setFormData(cleanFormData);
    setShowForm(true);
  };

  const handleDelete = (item) => {
    setItemToDelete(item);
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (itemToDelete) {
      try {
        setDeleting(true);
        await api.delete(`/api/${currentSection}/${itemToDelete.ID}`);
        setSuccess('Elemento eliminado exitosamente');
        await loadData();
      } catch (err) {
        console.error('Error al eliminar:', err);
        const errorMessage = err.response?.data?.error || err.message || 'Error desconocido';
        setError('Error al eliminar: ' + errorMessage);
      } finally {
        setDeleting(false);
      }
    }
    setShowConfirmDialog(false);
    setItemToDelete(null);
  };

  const handleCancelDelete = () => {
    setShowConfirmDialog(false);
    setItemToDelete(null);
  };

  const resetForm = () => {
    setFormData({});
    setEditingItem(null);
    setShowForm(false);
  };

  const getSectionTitle = () => {
    switch (currentSection) {
      case 'provincias': return 'Provincia';
      case 'ciudades': return 'Ciudad';
      default: return 'Elemento';
    }
  };

  const getProvinciaName = (provinciaId) => {
    const provincia = provincias.find(p => p.ID === provinciaId);
    return provincia ? provincia.provincia : 'N/A';
  };

  const getItemDisplayName = (item) => {
    if (!item) return 'este elemento';

    switch (currentSection) {
      case 'provincias':
        return item.provincia || 'esta provincia';
      case 'ciudades':
        return item.ciudad || 'esta ciudad';
      default:
        return 'este elemento';
    }
  };

  const getCurrentData = () => {
    switch (currentSection) {
      case 'provincias': return provincias;
      case 'ciudades': return ciudades;
      default: return [];
    }
  };

  // Filtrar datos basado en el término de búsqueda
  const getFilteredData = () => {
    const data = getCurrentData();
    if (!searchTerm) return data;

    return data.filter(item => {
      const searchLower = searchTerm.toLowerCase();

      if (currentSection === 'provincias') {
        return (item.provincia || '').toLowerCase().includes(searchLower);
      } else if (currentSection === 'ciudades') {
        return (
          (item.ciudad || '').toLowerCase().includes(searchLower) ||
          getProvinciaName(item.provincia_id).toLowerCase().includes(searchLower)
        );
      }

      return false;
    });
  };

  // Funciones de paginación - sin filtrado ya que no hay búsqueda
  const currentData = getCurrentData();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = currentData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(currentData.length / itemsPerPage);

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

  const renderForm = () => {
    switch (currentSection) {
      case 'provincias':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nombre de la Provincia</label>
              <input
                type="text"
                name="provincia"
                value={formData.provincia || ''}
                onChange={handleInputChange}
                required
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                placeholder="Ej: Cotopaxi"
              />
            </div>
          </div>
        );

      case 'ciudades':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nombre de la Ciudad</label>
              <input
                type="text"
                name="ciudad"
                value={formData.ciudad || ''}
                onChange={handleInputChange}
                required
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                placeholder="Ej: Latacunga"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Provincia</label>
              <select
                name="provincia_id"
                value={formData.provincia_id || ''}
                onChange={handleInputChange}
                required
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
          </div>
        );

      default:
        return null;
    }
  };

  const renderTable = () => {
    switch (currentSection) {
      case 'provincias':
        return (
          <>
            {/* Vista de tabla para desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr style={{ backgroundColor: '#ffffff' }}>
                    <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                      Nombre
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentItems.map((provincia, index) => (
                    <tr
                      key={provincia.ID}
                      className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {provincia.ID}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: '#4ade80' }}>
                              {(provincia.provincia || 'P').charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {provincia.provincia}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleEdit(provincia)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-gray-700 bg-yellow-100 hover:bg-yellow-200 transition-all duration-200 hover:shadow-md"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(provincia)}
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
              {currentItems.map((provincia) => (
                <div
                  key={provincia.ID}
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#4ade80' }}>
                          {(provincia.provincia || 'P').charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">
                          {provincia.provincia}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          ID: {provincia.ID}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleEdit(provincia)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-gray-700 bg-yellow-100 hover:bg-yellow-200 transition-all duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(provincia)}
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
        );

      case 'ciudades':
        return (
          <>
            {/* Vista de tabla para desktop */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr style={{ backgroundColor: '#ffffff' }}>
                    <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                      Ciudad
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                      Provincia
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentItems.map((ciudad, index) => (
                    <tr
                      key={ciudad.ID}
                      className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {ciudad.ID}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs" style={{ backgroundColor: '#4ade80' }}>
                              {(ciudad.ciudad || 'C').charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {ciudad.ciudad}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {getProvinciaName(ciudad.provincia_id)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => handleEdit(ciudad)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg text-gray-700 bg-yellow-100 hover:bg-yellow-200 transition-all duration-200 hover:shadow-md"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(ciudad)}
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
              {currentItems.map((ciudad) => (
                <div
                  key={ciudad.ID}
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#4ade80' }}>
                          {(ciudad.ciudad || 'C').charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">
                          {ciudad.ciudad}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          ID: {ciudad.ID}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Provincia</p>
                    <p className="text-sm text-gray-900">
                      {getProvinciaName(ciudad.provincia_id)}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleEdit(ciudad)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg text-gray-700 bg-yellow-100 hover:bg-yellow-200 transition-all duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(ciudad)}
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
        );

      default:
        return null;
    }
  };



  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra superior con botón de volver */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="flex justify-start items-center mb-4 sm:mb-6">
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


        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar con estilo moderno */}
          <div className="w-full lg:w-64 bg-white shadow-xl rounded-xl p-6 border border-gray-200">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 -mx-6 -mt-6 mb-6" style={{ backgroundColor: '#025a27' }}>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Configuraciones
              </h2>
            </div>
            <nav className="space-y-2">
              <button
                onClick={() => {
                  setCurrentSection('provincias');
                  setShowForm(false);
                  resetForm();
                  setCurrentPage(1);
                  setSearchTerm('');
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${currentSection === 'provincias'
                  ? 'text-white'
                  : 'text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                style={{
                  backgroundColor: currentSection === 'provincias' ? '#025a27' : undefined
                }}
              >
                Provincias
              </button>
              <button
                onClick={() => {
                  setCurrentSection('ciudades');
                  setShowForm(false);
                  resetForm();
                  setCurrentPage(1);
                  setSearchTerm('');
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${currentSection === 'ciudades'
                  ? 'text-white'
                  : 'text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                style={{
                  backgroundColor: currentSection === 'ciudades' ? '#025a27' : undefined
                }}
              >
                Ciudades
              </button>
              <button
                onClick={() => {
                  setCurrentSection('generar_excel');
                  setShowForm(false);
                  resetForm();
                  setCurrentPage(1);
                  setSearchTerm('');
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${currentSection === 'generar_excel'
                  ? 'text-white'
                  : 'text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                style={{
                  backgroundColor: currentSection === 'generar_excel' ? '#025a27' : undefined
                }}
              >
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generar Excel
                </span>
              </button>
              <button
                onClick={() => {
                  setCurrentSection('whatsapp');
                  setShowForm(false);
                  resetForm();
                  setCurrentPage(1);
                  setSearchTerm('');
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${currentSection === 'whatsapp'
                  ? 'text-white'
                  : 'text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                style={{
                  backgroundColor: currentSection === 'whatsapp' ? '#025a27' : undefined
                }}
              >
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  WhatsApp
                </span>
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {currentSection === 'overview' ? (
              <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
                {/* Header del resumen */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200" style={{ backgroundColor: '#025a27' }}>
                  <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Resumen del Sistema
                  </h3>
                </div>

                <div className="px-3 sm:px-6 py-4 sm:py-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <svg className="w-8 h-8 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        <div>
                          <h3 className="font-semibold">Provincias</h3>
                          <p className="text-2xl font-bold text-blue-600">{provincias.length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        <svg className="w-8 h-8 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <div>
                          <h3 className="font-semibold">Ciudades</h3>
                          <p className="text-2xl font-bold text-green-600">{ciudades.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <p className="text-gray-600">
                      Desde aquí puedes gestionar las configuraciones básicas del sistema como provincias y ciudades.
                      Selecciona una opción del menú lateral para comenzar.
                    </p>
                  </div>
                </div>
              </div>
            ) : currentSection === 'generar_excel' ? (
              <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
                {/* Header */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200" style={{ backgroundColor: '#025a27' }}>
                  <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generar formato Excel
                  </h3>
                </div>

                <div className="px-4 sm:px-6 py-6">
                  <p className="text-gray-600 mb-6">
                    Genera un archivo Excel con el formato correcto para cargar estudiantes de forma masiva.
                    El archivo incluirá listas desplegables para seleccionar instituciones y ciudades.
                  </p>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <svg className="animate-spin h-8 w-8 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="ml-3 text-gray-600">Cargando datos...</span>
                    </div>
                  ) : (
                    <>
                      {/* Resumen de datos disponibles */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="flex items-center">
                            <svg className="w-8 h-8 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <div>
                              <h4 className="font-semibold text-blue-700">Instituciones</h4>
                              <p className="text-2xl font-bold text-blue-600">{instituciones.length}</p>
                            </div>
                          </div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="flex items-center">
                            <svg className="w-8 h-8 text-green-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <div>
                              <h4 className="font-semibold text-green-700">Ciudades</h4>
                              <p className="text-2xl font-bold text-green-600">{ciudades.length}</p>
                            </div>
                          </div>
                        </div>
                      </div>


                      {/* Botón de descargar */}
                      <div className="flex justify-center">
                        <GeneracionFormatoExcel
                          instituciones={instituciones}
                          ciudades={ciudades}
                          onGenerated={(filename) => {
                            setSuccess(`Archivo "${filename}" generado exitosamente`);
                            setTimeout(() => setSuccess(''), 5000);
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : currentSection === 'whatsapp' ? (
              <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
                {/* Header */}
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200" style={{ backgroundColor: '#025a27' }}>
                  <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Conexión WhatsApp
                  </h3>
                </div>

                <div className="px-4 sm:px-6 py-6">
                  <p className="text-gray-600 mb-6">
                    Conecta tu cuenta de WhatsApp para poder enviar comunicados.
                    Escanea el código QR con tu aplicación de WhatsApp.
                  </p>

                  {/* Estado de conexión */}
                  <div className="flex items-center justify-center mb-6">
                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${whatsappStatus === 'ready' ? 'bg-green-100 text-green-800' :
                        whatsappStatus === 'qr' ? 'bg-yellow-100 text-yellow-800' :
                          whatsappStatus === 'authenticated' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                      }`}>
                      <span className={`w-2 h-2 rounded-full mr-2 ${whatsappStatus === 'ready' ? 'bg-green-500 animate-pulse' :
                          whatsappStatus === 'qr' ? 'bg-yellow-500 animate-pulse' :
                            whatsappStatus === 'authenticated' ? 'bg-blue-500 animate-pulse' :
                              'bg-red-500'
                        }`}></span>
                      {whatsappStatus === 'ready' ? 'Conectado' :
                        whatsappStatus === 'qr' ? 'Esperando escaneo' :
                          whatsappStatus === 'authenticated' ? 'Autenticado' :
                            'Desconectado'}
                    </span>
                  </div>

                  {whatsappLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
                      <p className="text-gray-500">Conectando con WhatsApp...</p>
                    </div>
                  ) : whatsappStatus === 'ready' ? (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-lg font-medium text-gray-800 mb-2">WhatsApp Conectado</p>
                      <p className="text-gray-500 mb-6">Listo para enviar mensajes desde Comunicados</p>
                      <button
                        onClick={handleWhatsappLogout}
                        className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Cerrar sesión de WhatsApp
                      </button>
                    </div>
                  ) : whatsappQR ? (
                    <div className="text-center">
                      <p className="text-gray-600 mb-4">Escanea este código QR con WhatsApp</p>
                      <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-xl shadow-lg">
                        <img src={whatsappQR} alt="QR Code" className="w-64 h-64" />
                      </div>
                      <p className="text-sm text-gray-500 mt-4">
                        Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-10 h-10 text-yellow-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <p className="text-gray-600">Generando código QR...</p>
                      <p className="text-sm text-gray-400 mt-2">Esto puede tomar unos segundos</p>
                    </div>
                  )}

                  {/* Información */}
                  <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-800">Información importante</p>
                        <ul className="text-sm text-blue-700 mt-1 list-disc list-inside">
                          <li>La sesión permanece activa mientras el servicio esté corriendo</li>
                          <li>Si cierras sesión, deberás escanear el QR nuevamente</li>
                          <li>Los mensajes se envían desde la cuenta de WhatsApp vinculada</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">

                {/* Formulario */}
                {showForm && (
                  <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
                    {/* Header del formulario */}
                    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200" style={{ backgroundColor: '#025a27' }}>
                      <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {editingItem ? `Editar ${getSectionTitle()}` : `Nueva ${getSectionTitle()}`}
                      </h3>
                    </div>

                    <div className="px-3 sm:px-6 py-4 sm:py-6">
                      <form onSubmit={handleSubmit} className="space-y-6">
                        {renderForm()}

                        {/* Botones de acción */}
                        <div className="pt-4 sm:pt-6 border-t border-gray-200">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <button
                              type="submit"
                              disabled={loading}
                              className="flex-1 text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 text-sm sm:text-base"
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
                                  {editingItem ? `Actualizar ${getSectionTitle()}` : `Crear ${getSectionTitle()}`}
                                </div>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={resetForm}
                              disabled={loading}
                              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-2.5 sm:py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 text-sm sm:text-base"
                            >
                              <div className="flex items-center justify-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Cancelar
                              </div>
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Lista de elementos */}
                {!showForm && (
                  <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
                    {/* Header de la tabla */}
                    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex justify-between items-center" style={{ backgroundColor: '#025a27' }}>
                      <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {currentSection === 'provincias' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          )}
                        </svg>
                        Lista de {currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}
                      </h3>
                      <button
                        onClick={() => {
                          setShowForm(!showForm);
                          setEditingItem(null);
                          setFormData({});
                        }}
                        className={`inline-flex items-center text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 text-sm sm:text-base ${showForm
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-white hover:bg-gray-100'
                          }`}
                        style={{
                          backgroundColor: showForm ? '#dc2626' : '#ffffff',
                          color: showForm ? '#ffffff' : '#025a27'
                        }}
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
                            <span className="hidden sm:inline">Nueva {getSectionTitle()}</span>
                            <span className="sm:hidden">Nueva</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="px-3 sm:px-6 py-4 sm:py-6">
                      {getCurrentData().length === 0 ? (
                        <div className="text-center py-8 sm:py-12">
                          <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {currentSection === 'provincias' ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            )}
                          </svg>
                          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay {currentSection}</h3>
                          <p className="mt-1 text-sm text-gray-500">Comienza agregando {currentSection === 'provincias' ? 'una nueva provincia' : 'una nueva ciudad'}.</p>
                        </div>
                      ) : (
                        <>
                          {renderTable()}

                          {/* Paginación */}
                          {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-gray-200">
                              <div className="text-sm text-gray-700 mb-4 sm:mb-0">
                                Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, currentData.length)} de {currentData.length} {currentSection}
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={prevPage}
                                  disabled={currentPage === 1}
                                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                  </svg>
                                </button>

                                <div className="flex space-x-1">
                                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                      key={page}
                                      onClick={() => paginate(page)}
                                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${currentPage === page
                                        ? 'text-white'
                                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                        }`}
                                      style={{
                                        backgroundColor: currentPage === page ? '#025a27' : undefined,
                                        borderColor: currentPage === page ? '#025a27' : undefined
                                      }}
                                    >
                                      {page}
                                    </button>
                                  ))}
                                </div>

                                <button
                                  onClick={nextPage}
                                  disabled={currentPage === totalPages}
                                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>


      </div>

      {/* Modal de confirmación para eliminación */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Confirmar Eliminación"
        message={`¿Está seguro de que desea eliminar "${getItemDisplayName(itemToDelete)}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        loading={deleting}
      />
    </div>
  );
};

export default SystemConfig;
