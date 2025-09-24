import { useState, useEffect } from 'react';
import ConfirmDialog from './ConfirmDialog';
import api from '../api/client';

const UsuariosManager = ({ onBack }) => {
  const [usuarios, setUsuarios] = useState([]);
  const [personas, setPersonas] = useState([]);
  const [tiposUsuario, setTiposUsuario] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDialog, setConfirmDialog] = useState({ show: false, usuario: null, action: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actioningUserId, setActioningUserId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('todos'); // 'todos', 'habilitados', 'deshabilitados'
  const [userTypeFilter, setUserTypeFilter] = useState('todos'); // 'todos' o ID del tipo de usuario
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Estados del formulario
  const [formData, setFormData] = useState({
    // Datos del usuario
    usuario: '',
    contraseña: '',
    tipo_usuario_id: '',
    confirmar_contraseña: '',
    // Datos de la persona
    nombre: '',
    fecha_nacimiento: '',
    correo: '',
    telefono: '',
    cedula: ''
  });

  // Cliente API centralizado maneja el token

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [usuariosRes, personasRes, tiposRes] = await Promise.all([
        api.get(`/api/usuarios/all-including-deleted`),
        api.get(`/api/personas`),
        api.get(`/api/tipos-usuario`),
      ]);

      const usuariosData = usuariosRes.data;
      const personasData = personasRes.data;
      const tiposData = tiposRes.data;

      setUsuarios(usuariosData || []);
      setPersonas(personasData || []);
      setTiposUsuario(tiposData || []);
    } catch (error) {
      setError('Error al cargar los datos: ' + error.message);
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

  const resetForm = () => {
    setFormData({
      // Datos del usuario
      usuario: '',
      contraseña: '',
      tipo_usuario_id: '',
      confirmar_contraseña: '',
      // Datos de la persona
      nombre: '',
      fecha_nacimiento: '',
      correo: '',
      telefono: '',
      cedula: ''
    });
    setEditingUsuario(null);
    setShowForm(false);
    setSubmitting(false);
    setActioningUserId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (editingUsuario) {
      // Solo validar campos de usuario en modo edición (no se pueden modificar datos de persona)
      if (!formData.usuario || !formData.tipo_usuario_id) {
        setError('Por favor, complete todos los campos obligatorios (nombre de usuario y tipo de usuario)');
        return;
      }
    } else {
      // Validar todos los campos para usuarios nuevos
      if (!formData.usuario || !formData.nombre || !formData.cedula || !formData.tipo_usuario_id) {
        setError('Por favor, complete todos los campos obligatorios (marcados con *)');
        return;
      }
      
      // Validar cédula ecuatoriana (10 dígitos) solo para usuarios nuevos
      if (!/^\d{10}$/.test(formData.cedula)) {
        setError('La cédula debe tener exactamente 10 dígitos');
        return;
      }
      
      // Validar email si se proporciona (solo para usuarios nuevos)
      if (formData.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
        setError('El formato del correo electrónico no es válido');
        return;
      }
    }

    // Validaciones de contraseña para nuevos usuarios
    if (!editingUsuario) {
      if (!formData.contraseña || !formData.confirmar_contraseña) {
        setError('La contraseña es obligatoria para nuevos usuarios');
        return;
      }
      if (formData.contraseña.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (formData.contraseña !== formData.confirmar_contraseña) {
        setError('Las contraseñas no coinciden');
        return;
      }
    }

    // Validaciones de contraseña para usuarios existentes
    if (editingUsuario && formData.contraseña) {
      if (formData.contraseña.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (formData.contraseña !== formData.confirmar_contraseña) {
        setError('Las contraseñas no coinciden');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError(''); // Limpiar errores anteriores
      
      if (editingUsuario) {
        // Preparar datos para actualización - solo los campos permitidos
        const submitData = {
          usuario: formData.usuario,
          tipo_usuario_id: parseInt(formData.tipo_usuario_id)
        };

        // Solo incluir contraseña si se proporciona una nueva
        if (formData.contraseña && formData.contraseña.trim() !== '') {
          submitData.contraseña = formData.contraseña.trim();
        }

        await api.put(`/api/usuarios/${editingUsuario.ID}`, submitData);

        // Obtener el usuario actualizado para refrescar la lista
        try {
          const usuarioActualizadoResponse = await api.get(`/api/usuarios/${editingUsuario.ID}`);
          const usuarioActualizado = usuarioActualizadoResponse.data;
          setUsuarios(prevUsuarios => 
            prevUsuarios.map(u => 
              u.ID === editingUsuario.ID ? usuarioActualizado : u
            )
          );
        } catch (e) {
          // Si falla la consulta específica, recargar todos los datos como fallback
          await fetchData();
        }
      } else {
        // Crear nueva persona primero
        const personaData = {
          nombre: formData.nombre,
          cedula: formData.cedula
        };

        // Solo agregar campos opcionales si tienen valor
        if (formData.fecha_nacimiento) {
          // Convertir fecha a formato ISO que Go puede parsear (con timezone UTC)
          const fecha = new Date(formData.fecha_nacimiento + 'T00:00:00.000Z');
          personaData.fecha_nacimiento = fecha.toISOString();
        }
        if (formData.correo && formData.correo.trim()) {
          personaData.correo = formData.correo.trim();
        }
        if (formData.telefono && formData.telefono.trim()) {
          personaData.telefono = formData.telefono.trim();
        }

        const personaResponse = await api.post(`/api/personas`, personaData);
        const personaCreada = personaResponse.data;

        // Crear el usuario con la persona creada
        const usuarioData = {
          usuario: formData.usuario,
          contraseña: formData.contraseña,
          persona_id: personaCreada.ID,
          tipo_usuario_id: parseInt(formData.tipo_usuario_id)
        };

        try {
          await api.post(`/api/usuarios`, usuarioData);
        } catch (e) {
          throw e;
        }

        // Solo recargar todos los datos si es un usuario nuevo
        await fetchData();
      }

      resetForm();
      setError('');
    } catch (error) {
      setError('Error al procesar: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (usuario) => {
    setActioningUserId(usuario.ID);
    setEditingUsuario(usuario);
    setFormData({
      // Datos del usuario
      usuario: usuario.usuario,
      contraseña: '',
      tipo_usuario_id: usuario.tipo_usuario_id.toString(),
      confirmar_contraseña: '',
      // Datos de la persona
      nombre: usuario.persona?.nombre || '',
      fecha_nacimiento: usuario.persona?.fecha_nacimiento ? 
        new Date(usuario.persona.fecha_nacimiento).toISOString().split('T')[0] : '',
      correo: usuario.persona?.correo || '',
      telefono: usuario.persona?.telefono || '',
      cedula: usuario.persona?.cedula || ''
    });
    setShowForm(true);
    setError('');
    setActioningUserId(null); // Limpiar el estado al abrir el formulario
  };

  const handleDeleteClick = (usuario) => {
    setActioningUserId(usuario.ID);
    const isDisabled = usuario.deleted_at || usuario.DeletedAt;
    setConfirmDialog({ 
      show: true, 
      usuario,
      action: isDisabled ? 'habilitar' : 'deshabilitar'
    });
  };

  const handleDeleteConfirm = async () => {
    try {
      setDeleting(true);
      const isDisabled = confirmDialog.usuario.deleted_at || confirmDialog.usuario.DeletedAt;
      
      if (isDisabled) {
        await api.put(`/api/usuarios/${confirmDialog.usuario.ID}/restore`);
      } else {
        await api.delete(`/api/usuarios/${confirmDialog.usuario.ID}`);
      }

      await fetchData();
      setConfirmDialog({ show: false, usuario: null, action: '' });
    } catch (error) {
      setError('Error al procesar: ' + error.message);
    } finally {
      setDeleting(false);
      setActioningUserId(null);
    }
  };

  const filteredUsuarios = usuarios.filter(usuario => {
    const matchesSearch = usuario.usuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (usuario.persona?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (usuario.tipo_usuario?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const isDisabled = usuario.deleted_at || usuario.DeletedAt;
    
    let matchesStatus = true;
    if (statusFilter === 'habilitados') {
      matchesStatus = !isDisabled;
    } else if (statusFilter === 'deshabilitados') {
      matchesStatus = isDisabled;
    }
    // Si es 'todos', no filtramos por estado
    
    let matchesUserType = true;
    if (userTypeFilter !== 'todos') {
      matchesUserType = usuario.tipo_usuario_id === parseInt(userTypeFilter);
    }
    
    return matchesSearch && matchesStatus && matchesUserType;
  });

  // Resetear página cuando cambian filtros/búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, userTypeFilter]);

  // Cálculos de paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsuarios = filteredUsuarios.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsuarios.length / itemsPerPage) || 1;

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };
  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const getPersonaName = (personaId) => {
    const persona = personas.find(p => p.ID === personaId);
    return persona ? persona.nombre : 'Persona no encontrada';
  };

  const getTipoUsuarioName = (tipoId) => {
    const tipo = tiposUsuario.find(t => t.ID === tipoId);
    return tipo ? tipo.nombre : 'Tipo no encontrado';
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
        <div className="flex justify-start items-center mb-4 sm:mb-6">
          <button 
            onClick={showForm ? resetForm : onBack}
            className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 flex items-center gap-2 text-sm sm:text-base"
            title={showForm ? "Cancelar" : "Volver al Dashboard"}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="sm:hidden">{showForm ? "Cancelar" : "Volver"}</span>
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        </div>
      )}

        {/* Formulario */}
      {showForm && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 pb-6 sm:pb-8">
          <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
            {/* Header del formulario */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200" style={{ backgroundColor: '#025a27' }}>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {editingUsuario ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}
              </h3>
            </div>

            <div className="px-3 sm:px-6 py-4 sm:py-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Datos del usuario */}
                <div>
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#025a27' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Datos de Usuario
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nombre de Usuario *</label>
                      <input
                        type="text"
                        name="usuario"
                        value={formData.usuario}
                        onChange={handleInputChange}
                        required
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                        placeholder="Ingrese el nombre de usuario"
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Tipo de Usuario *</label>
                      <select
                        name="tipo_usuario_id"
                        value={formData.tipo_usuario_id}
                        onChange={handleInputChange}
                        required
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                      >
                        <option value="">Seleccione un tipo</option>
                        {tiposUsuario.map(tipo => (
                          <option key={tipo.ID} value={tipo.ID}>
                            {tipo.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Contraseña {!editingUsuario && '*'}
                      </label>
                      <input
                        type="password"
                        name="contraseña"
                        value={formData.contraseña}
                        onChange={handleInputChange}
                        required={!editingUsuario}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                        placeholder={editingUsuario ? "Dejar vacío para mantener actual" : "Ingrese la contraseña"}
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Confirmar Contraseña {formData.contraseña && '*'}
                      </label>
                      <input
                        type="password"
                        name="confirmar_contraseña"
                        value={formData.confirmar_contraseña}
                        onChange={handleInputChange}
                        required={formData.contraseña !== ''}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200"
                        placeholder="Confirme la contraseña"
                      />
                    </div>
                  </div>
                </div>

                {/* Datos personales */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#025a27' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Datos Personales {editingUsuario && <span className="text-sm font-normal text-gray-500 ml-2">(Solo lectura)</span>}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                      <input
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleInputChange}
                        required={!editingUsuario}
                        disabled={editingUsuario}
                        className={`block w-full border rounded-md shadow-sm py-2 sm:py-2.5 px-3 text-sm sm:text-base transition-colors duration-200 ${
                          editingUsuario 
                            ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed' 
                            : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500'
                        }`}
                        placeholder={editingUsuario ? "" : "Ingrese el nombre completo"}
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Cédula *</label>
                      <input
                        type="text"
                        name="cedula"
                        value={formData.cedula}
                        onChange={handleInputChange}
                        required={!editingUsuario}
                        disabled={editingUsuario}
                        maxLength="10"
                        className={`block w-full border rounded-md shadow-sm py-2 sm:py-2.5 px-3 text-sm sm:text-base transition-colors duration-200 ${
                          editingUsuario 
                            ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed' 
                            : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500'
                        }`}
                        placeholder={editingUsuario ? "" : "Ingrese la cédula (10 dígitos)"}
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                      <input
                        type="email"
                        name="correo"
                        value={formData.correo}
                        onChange={handleInputChange}
                        disabled={editingUsuario}
                        className={`block w-full border rounded-md shadow-sm py-2 sm:py-2.5 px-3 text-sm sm:text-base transition-colors duration-200 ${
                          editingUsuario 
                            ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed' 
                            : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500'
                        }`}
                        placeholder={editingUsuario ? "" : "ejemplo@correo.com"}
                      />
                    </div>

                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                      <input
                        type="tel"
                        name="telefono"
                        value={formData.telefono}
                        onChange={handleInputChange}
                        disabled={editingUsuario}
                        className={`block w-full border rounded-md shadow-sm py-2 sm:py-2.5 px-3 text-sm sm:text-base transition-colors duration-200 ${
                          editingUsuario 
                            ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed' 
                            : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500'
                        }`}
                        placeholder={editingUsuario ? "" : "Ingrese el teléfono"}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                      <input
                        type="date"
                        name="fecha_nacimiento"
                        value={formData.fecha_nacimiento}
                        onChange={handleInputChange}
                        disabled={editingUsuario}
                        className={`block w-full border rounded-md shadow-sm py-2 sm:py-2.5 px-3 text-sm sm:text-base transition-colors duration-200 ${
                          editingUsuario 
                            ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed' 
                            : 'border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Botón de envío */}
                <div className="pt-4 sm:pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 text-sm sm:text-base"
                    style={{ backgroundColor: '#025a27' }}
                    onMouseEnter={(e) => !submitting && (e.target.style.backgroundColor = '#014a1f')}
                    onMouseLeave={(e) => !submitting && (e.target.style.backgroundColor = '#025a27')}
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {editingUsuario ? 'Actualizando...' : 'Creando...'}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {editingUsuario ? 'Actualizar Usuario' : 'Registrar Usuario'}
                      </div>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

        {/* Lista de usuarios */}
      {!showForm && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 pb-6 sm:pb-8">
          <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
            {/* Header de la tabla */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200" style={{ backgroundColor: '#025a27' }}>
              <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Lista de Usuarios del Sistema
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
                    placeholder="Buscar usuarios..."
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
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Tipo:</label>
                      <select
                        value={userTypeFilter}
                        onChange={(e) => setUserTypeFilter(e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="todos">Todos los tipos</option>
                        {tiposUsuario.map(tipo => (
                          <option key={tipo.ID} value={tipo.ID}>
                            {tipo.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {searchTerm || statusFilter !== 'todos' || userTypeFilter !== 'todos' ? (
                      <span>
                        Mostrando {filteredUsuarios.length} de {usuarios.length} usuarios
                        {filteredUsuarios.length !== usuarios.length && (
                          <span className="text-green-600 font-medium"> (filtrados)</span>
                        )}
                      </span>
                    ) : (
                      <span>Total: {usuarios.length} usuarios ({usuarios.filter(u => u.deleted_at || u.DeletedAt).length} deshabilitados)</span>
                    )}
                  </div>
                </div>
              </div>

              {filteredUsuarios.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay usuarios</h3>
                  <p className="mt-1 text-sm text-gray-500">Comienza agregando un nuevo usuario al sistema.</p>
                </div>
              ) : (
                <>
                  {/* Vista de tabla para desktop */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr style={{ backgroundColor: '#ffffff' }}>
                          <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                            Usuario
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                            Persona
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                            Tipo
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
                        {currentUsuarios.map((usuario, index) => (
                          <tr 
                            key={usuario.ID} 
                            className={`hover:bg-gray-50 transition-colors duration-200 ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            } ${usuario.deleted_at || usuario.DeletedAt ? 'opacity-60' : ''}`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-8 w-8">
                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                                    usuario.deleted_at || usuario.DeletedAt ? 'bg-red-400' : 'bg-green-400'
                                  }`}>
                                    {(usuario.usuario || 'U').charAt(0).toUpperCase()}
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {usuario.usuario}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {usuario.persona ? usuario.persona.nombre : getPersonaName(usuario.persona_id)}
                              </div>
                              <div className="text-sm text-gray-500">
                                {usuario.persona ? usuario.persona.cedula : ''}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                usuario.deleted_at || usuario.DeletedAt 
                                  ? 'bg-gray-100 text-gray-800' 
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {usuario.tipo_usuario ? usuario.tipo_usuario.nombre : getTipoUsuarioName(usuario.tipo_usuario_id)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                usuario.deleted_at || usuario.DeletedAt 
                                  ? 'bg-red-100 text-red-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {(usuario.deleted_at || usuario.DeletedAt) ? 'Deshabilitado' : 'Habilitado'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex justify-center space-x-2">
                                <button
                                  onClick={() => handleEdit(usuario)}
                                  disabled={actioningUserId === usuario.ID || submitting || deleting || (usuario.deleted_at || usuario.DeletedAt)}
                                  className={`inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                                    (usuario.deleted_at || usuario.DeletedAt)
                                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                      : 'text-gray-700 bg-yellow-100 hover:bg-yellow-200'
                                  }`}
                                >
                                  {actioningUserId === usuario.ID ? (
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
                                <button
                                  onClick={() => handleDeleteClick(usuario)}
                                  disabled={actioningUserId === usuario.ID || submitting || deleting}
                                  className={`inline-flex items-center px-3 py-2 border border-transparent text-xs font-medium rounded-lg transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                                    usuario.deleted_at || usuario.DeletedAt 
                                      ? 'text-green-700 bg-green-100 hover:bg-green-200' 
                                      : 'text-red-700 bg-red-100 hover:bg-red-200'
                                  }`}
                                >
                                  {actioningUserId === usuario.ID && deleting ? (
                                    <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${
                                      usuario.deleted_at || usuario.DeletedAt ? 'border-green-600' : 'border-red-600'
                                    }`}></div>
                                  ) : (
                                    <>
                                      {usuario.deleted_at || usuario.DeletedAt ? (
                                        <>
                                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          Habilitar
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728M12 2.25c5.385 0 9.75 4.365 9.75 9.75s-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12 6.615 2.25 12 2.25z" />
                                          </svg>
                                          Deshabilitar
                                        </>
                                      )}
                                    </>
                                  )}
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
                    {currentUsuarios.map((usuario, index) => (
                      <div 
                        key={usuario.ID} 
                        className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 ${
                          usuario.deleted_at || usuario.DeletedAt ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12">
                              <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                usuario.deleted_at || usuario.DeletedAt ? 'bg-red-400' : 'bg-green-400'
                              }`}>
                                {(usuario.usuario || 'U').charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div className="ml-3">
                              <h4 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">
                                {usuario.usuario}
                              </h4>
                              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                                {usuario.persona ? usuario.persona.nombre : getPersonaName(usuario.persona_id)}
                              </p>
                            </div>
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            usuario.deleted_at || usuario.DeletedAt 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {(usuario.deleted_at || usuario.DeletedAt) ? 'Deshabilitado' : 'Habilitado'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cédula</p>
                            <p className="text-sm text-gray-900 mt-1">
                              {usuario.persona ? usuario.persona.cedula : 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tipo Usuario</p>
                            <p className="text-sm text-gray-900 mt-1">
                              {usuario.tipo_usuario ? usuario.tipo_usuario.nombre : getTipoUsuarioName(usuario.tipo_usuario_id)}
                            </p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Fecha de Creación</p>
                          <p className="text-sm text-gray-900">
                            {new Date(usuario.CreatedAt).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => handleEdit(usuario)}
                            disabled={actioningUserId === usuario.ID || submitting || deleting || (usuario.deleted_at || usuario.DeletedAt)}
                            className={`flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                              (usuario.deleted_at || usuario.DeletedAt)
                                ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                                : 'text-gray-700 bg-yellow-100 hover:bg-yellow-200'
                            }`}
                          >
                            {actioningUserId === usuario.ID ? (
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
                          <button
                            onClick={() => handleDeleteClick(usuario)}
                            disabled={actioningUserId === usuario.ID || submitting || deleting}
                            className={`flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                              usuario.deleted_at || usuario.DeletedAt 
                                ? 'text-green-700 bg-green-100 hover:bg-green-200' 
                                : 'text-red-700 bg-red-100 hover:bg-red-200'
                            }`}
                          >
                            {actioningUserId === usuario.ID && deleting ? (
                              <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${
                                usuario.deleted_at || usuario.DeletedAt ? 'border-green-600' : 'border-red-600'
                              }`}></div>
                            ) : (
                              <>
                                {usuario.deleted_at || usuario.DeletedAt ? (
                                  <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Habilitar
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728M12 2.25c5.385 0 9.75 4.365 9.75 9.75s-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12 6.615 2.25 12 2.25z" />
                                    </svg>
                                    Deshabilitar
                                  </>
                                )}
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-700 mb-4 sm:mb-0">
                        Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredUsuarios.length)} de {filteredUsuarios.length} usuarios
                        {(searchTerm || statusFilter !== 'todos' || userTypeFilter !== 'todos') && filteredUsuarios.length !== usuarios.length && (
                          <span className="text-gray-500"> (de {usuarios.length} total)</span>
                        )}
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
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                                currentPage === page
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
        </div>
      )}

      {/* Diálogo de confirmación */}
      <ConfirmDialog
        isOpen={confirmDialog.show}
        onClose={() => !deleting && setConfirmDialog({ show: false, usuario: null, action: '' })}
        onConfirm={handleDeleteConfirm}
        title={confirmDialog.action === 'habilitar' ? "Habilitar Usuario" : "Deshabilitar Usuario"}
        message={confirmDialog.action === 'habilitar' 
          ? `¿Está seguro que desea habilitar el usuario "${confirmDialog.usuario?.usuario}"? El usuario podrá acceder al sistema nuevamente.`
          : `¿Está seguro que desea deshabilitar el usuario "${confirmDialog.usuario?.usuario}"? El usuario no podrá acceder al sistema.`
        }
        confirmText={deleting 
          ? (confirmDialog.action === 'habilitar' ? "Habilitando..." : "Deshabilitando...") 
          : (confirmDialog.action === 'habilitar' ? "Habilitar" : "Deshabilitar")
        }
        cancelText="Cancelar"
        type={confirmDialog.action === 'habilitar' ? "success" : "danger"}
        loading={deleting}
      />
    </div>
  );
};

export default UsuariosManager;
