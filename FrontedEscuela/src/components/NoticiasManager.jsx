import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import ConfirmDialog from './ConfirmDialog';

const NoticiasManager = ({ onBack, usuario }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [noticias, setNoticias] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingNoticia, setEditingNoticia] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [showConfirm, setShowConfirm] = useState(false);
  const [toDeleteId, setToDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({ titulo: '', descripcion: '', url_noticia: '' });

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // Estados para el modal de visualización de archivos
  const [showFileModal, setShowFileModal] = useState(false);
  const [modalFileUrl, setModalFileUrl] = useState('');

  useEffect(() => {
    loadInitial();
  }, []);

  // Efecto para cerrar el modal con la tecla Escape
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && showFileModal) {
        closeFileModal();
      }
    };

    if (showFileModal) {
      document.addEventListener('keydown', handleEscape);
      // Prevenir scroll del body cuando el modal está abierto
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showFileModal]);

  const loadInitial = async () => {
    setLoading(true);
    setError('');
    try {
      const noticiasRes = await api.get(`/api/noticias`);
      setNoticias(noticiasRes.data || []);
    } catch (err) {
      setError('Error al cargar datos: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ titulo: '', descripcion: '', url_noticia: '' });
    setEditingNoticia(null);
    setShowForm(false);
    setSelectedFile(null);
  };

  const noticiasFiltered = useMemo(() => {
    return noticias.filter(n =>
      n.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.descripcion && n.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [noticias, searchTerm]);

  // Paginación de noticias
  const totalPages = Math.max(1, Math.ceil(noticiasFiltered.length / itemsPerPage));
  const indexOfFirstItem = (currentPage - 1) * itemsPerPage;
  const indexOfLastItem = Math.min(indexOfFirstItem + itemsPerPage, noticiasFiltered.length);
  const currentNoticias = useMemo(() => noticiasFiltered.slice(indexOfFirstItem, indexOfLastItem), [noticiasFiltered, indexOfFirstItem, indexOfLastItem]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const onEdit = (n) => {
    setError('');
    setSuccess('');
    setEditingNoticia(n);
    setForm({
      titulo: n.titulo || '',
      descripcion: n.descripcion || '',
      url_noticia: n.url_noticia || '',
    });
    setSelectedFile(null);
    setPreviewUrl(n.url_noticia || '');
    setShowForm(true);
  };

  const onDelete = (id) => {
    setToDeleteId(id);
    setShowConfirm(true);
  };

  const confirmDelete = async () => {
    if (!toDeleteId) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/api/noticias/${toDeleteId}`);
      setSuccess('Noticia eliminada exitosamente');
      await loadInitial();
    } catch (err) {
      setError('Error al eliminar la noticia: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeleting(false);
      setShowConfirm(false);
      setToDeleteId(null);
    }
  };

  // Función para manejar la selección de archivo
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'video/mov', 'video/wmv'];
      if (!allowedTypes.includes(file.type)) {
        setError('Tipo de archivo no válido. Solo se permiten imágenes (JPG, PNG, GIF) y videos (MP4, AVI, MOV, WMV)');
        return;
      }

      // Validar tamaño (50MB máximo)
      if (file.size > 50 * 1024 * 1024) {
        setError('El archivo es demasiado grande. El tamaño máximo es 50MB');
        return;
      }

      setSelectedFile(file);
      setError('');

      // Crear preview para imágenes
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreviewUrl(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl('');
      }
    }
  };

  // Función para subir archivo
  const uploadFile = async () => {
    if (!selectedFile) return null;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await api.post('/api/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setUploading(false);
      return response.data.url;
    } catch (err) {
      setUploading(false);
      setError('Error al subir el archivo: ' + (err.response?.data?.error || err.message));
      return null;
    }
  };

  // Función para eliminar archivo seleccionado
  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setForm(prev => ({ ...prev, url_noticia: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    // Validaciones
    if (!form.titulo.trim()) {
      setError('El título es obligatorio');
      setSaving(false);
      return;
    }

    try {
      let urlNoticia = form.url_noticia;

      // Si hay un archivo seleccionado, subirlo primero
      if (selectedFile) {
        urlNoticia = await uploadFile();
        if (!urlNoticia) {
          setSaving(false);
          return; // Error ya se mostró en uploadFile
        }
      }

      const userId = usuario.ID || usuario.id;
      const payload = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        url_noticia: urlNoticia,
        usuario_id: Number(userId),
      };

      if (editingNoticia) {
        const id = editingNoticia.ID || editingNoticia.id;
        await api.put(`/api/noticias/${id}`, payload);
        setSuccess('Noticia actualizada exitosamente');
      } else {
        await api.post(`/api/noticias`, payload);
        setSuccess('Noticia creada exitosamente');
      }

      await loadInitial();
      resetForm();
    } catch (err) {
      setError('Error al guardar la noticia: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Función para abrir el modal de archivo
  const openFileModal = (fileUrl) => {
    setModalFileUrl(fileUrl);
    setShowFileModal(true);
  };

  // Función para cerrar el modal de archivo
  const closeFileModal = () => {
    setShowFileModal(false);
    setModalFileUrl('');
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
      <div className="flex justify-between items-center mb-4 sm:mb-6">
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

        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className="inline-flex items-center px-4 py-2 rounded-lg text-white font-semibold shadow-sm transition-all duration-200"
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
              </svg>
              <span className="hidden sm:inline">Nueva Noticia</span>
              <span className="inline sm:hidden">Nueva</span>
            </>
          )}
        </button>
      </div>

      {(error || success) && (
        <div className="mb-4">
          {error && <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-2 rounded-lg">{error}</div>}
          {success && <div className="bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg mt-2">{success}</div>}
        </div>
      )}

      {showForm && (
        <div className="px-0">
          <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 rounded-t-xl" style={{ backgroundColor: '#025a27' }}>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                {editingNoticia ? 'Editar Noticia' : 'Crear Noticia'}
              </h3>
            </div>

            <div className="px-3 sm:px-6 py-4 sm:py-6 rounded-b-xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Título */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Título *</label>
                  <input
                    type="text"
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                    value={form.titulo}
                    onChange={(e) => setForm((prev) => ({ ...prev, titulo: e.target.value }))}
                    placeholder="Ingrese el título de la noticia"
                    required
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                    rows={4}
                    value={form.descripcion}
                    onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                    placeholder="Ingrese la descripción de la noticia"
                  />
                </div>

                {/* Subida de archivo */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Archivo multimedia (imagen o video)</label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        id="file-upload"
                        accept="image/*,video/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <label
                        htmlFor="file-upload"
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200 cursor-pointer"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        {selectedFile ? 'Cambiar archivo' : 'Seleccionar archivo'}
                      </label>
                      {selectedFile && (
                        <button
                          type="button"
                          onClick={removeSelectedFile}
                          className="px-3 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {selectedFile && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-blue-900">{selectedFile.name}</p>
                              <p className="text-xs text-blue-700">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          {uploading && (
                            <div className="flex items-center text-blue-600">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span className="text-xs">Subiendo...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {previewUrl && selectedFile?.type.startsWith('image/') && (
                      <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Vista previa:</p>
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-w-full h-48 object-contain rounded-md"
                        />
                      </div>
                    )}

                    {!selectedFile && form.url_noticia && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-green-900">Archivo actual</p>
                            <a
                              href={form.url_noticia}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-green-700 hover:text-green-800 underline"
                            >
                              Ver archivo
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 sm:pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 text-sm sm:text-base"
                    style={{ backgroundColor: '#025a27' }}
                    onMouseEnter={(e) => !saving && (e.target.style.backgroundColor = '#014a1f')}
                    onMouseLeave={(e) => !saving && (e.target.style.backgroundColor = '#025a27')}
                  >
                    {saving ? (
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
                        {editingNoticia ? 'Actualizar Noticia' : 'Crear Noticia'}
                      </div>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {!showForm && (
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200" style={{ backgroundColor: '#025a27' }}>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              Lista de Noticias
            </h3>
          </div>

          <div className="px-3 sm:px-6 py-4 sm:py-6">
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar noticias por título o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-6 text-gray-500">Cargando...</div>
            ) : noticias.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay noticias</h3>
                <p className="mt-1 text-sm text-gray-500">Crea una nueva noticia para comenzar.</p>
              </div>
            ) : (
              <>
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr style={{ backgroundColor: '#ffffff' }}>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Título
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Descripción
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Archivo
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Fecha
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {currentNoticias.map((n, index) => (
                        <tr
                          key={n.ID || n.id}
                          className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 max-w-xs truncate">
                            {n.titulo}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 max-w-md">
                            <div className="truncate" title={n.descripcion}>
                              {n.descripcion || 'Sin descripción'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {n.url_noticia ? (
                              <button
                                onClick={() => openFileModal(n.url_noticia)}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors duration-200"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                Ver archivo
                              </button>
                            ) : (
                              <span className="text-gray-400 text-xs">Sin archivo</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                            {formatDate(n.created_at || n.CreatedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => onEdit(n)}
                                className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-yellow-800 bg-yellow-100 hover:bg-yellow-200 transition-all duration-200"
                              >
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5a2.5 2.5 0 10-3.536-3.536L4 16v4z" />
                                </svg>
                                <span>Editar</span>
                              </button>
                              <button
                                onClick={() => onDelete(n.ID || n.id)}
                                className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 transition-all duration-200"
                              >
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span>Eliminar</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="lg:hidden space-y-4">
                  {currentNoticias.map((n) => (
                    <div key={n.ID || n.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight mb-2">{n.titulo}</h4>
                          <div className="text-sm text-gray-700 mb-2">
                            <div className="break-words line-clamp-2">
                              {n.descripcion || 'Sin descripción'}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div><strong>Fecha:</strong> {formatDate(n.created_at || n.CreatedAt)}</div>
                            {n.url_noticia && (
                              <div className="pt-1">
                                <button
                                  onClick={() => openFileModal(n.url_noticia)}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors duration-200"
                                >
                                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                  </svg>
                                  Ver archivo
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => onEdit(n)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg text-yellow-800 bg-yellow-100 hover:bg-yellow-200 transition-all duration-200"
                        >
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5a2.5 2.5 0 10-3.536-3.536L4 16v4z" />
                          </svg>
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={() => onDelete(n.ID || n.id)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 transition-all duration-200"
                        >
                          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-700 mb-4 sm:mb-0">
                      Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, noticiasFiltered.length)} de {noticiasFiltered.length} noticias
                      {searchTerm && noticiasFiltered.length !== noticias.length && (
                        <span className="text-gray-500"> (de {noticias.length} total)</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                            onClick={() => setCurrentPage(page)}
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
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => { setShowConfirm(false); setToDeleteId(null); }}
        onConfirm={confirmDelete}
        title="Eliminar Noticia"
        message="¿Está seguro que desea eliminar esta noticia? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        loading={deleting}
      />

      {showFileModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={closeFileModal}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl max-h-[90vh] w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 sm:p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Visualizar Archivo</h3>
              <button
                onClick={closeFileModal}
                className="text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 sm:p-6 max-h-[calc(90vh-120px)] overflow-auto">
              {modalFileUrl && (
                <div className="flex justify-center">
                  {modalFileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <img
                      src={modalFileUrl}
                      alt="Archivo adjunto"
                      className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : modalFileUrl.match(/\.(mp4|avi|mov|wmv|webm)$/i) ? (
                    <video
                      src={modalFileUrl}
                      controls
                      className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    >
                      Tu navegador no soporta la reproducción de video.
                    </video>
                  ) : (
                    <div className="text-center p-8">
                      <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <p className="text-gray-600 mb-4">Este tipo de archivo no se puede visualizar directamente</p>
                      <a
                        href={modalFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Descargar archivo
                      </a>
                    </div>
                  )}

                  <div style={{ display: 'none' }} className="text-center p-8">
                    <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-600 mb-4">Error al cargar el archivo</p>
                    <a
                      href={modalFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Intentar descargar
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoticiasManager;