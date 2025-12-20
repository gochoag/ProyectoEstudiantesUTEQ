import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Datepicker } from 'flowbite';
import { validarCedulaEcuatoriana } from '../utils/validaciones';

const Profile = ({ usuario, onBack }) => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Estados para cambio de contraseña
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Datos específicos del rol
    const [studentData, setStudentData] = useState(null);
    const [authorityData, setAuthorityData] = useState(null);

    // Listas para selects
    const [ciudades, setCiudades] = useState([]);
    const [ciudadesFiltered, setCiudadesFiltered] = useState([]);
    const [instituciones, setInstituciones] = useState([]);
    const [provincias, setProvincias] = useState([]);

    // Redes sociales
    const [socialNetworks, setSocialNetworks] = useState([]);
    const socialPlatforms = [
        { name: 'Facebook', icon: 'fa-brands fa-facebook', color: '#1877F2' },
        { name: 'X (Twitter)', icon: 'fa-brands fa-square-x-twitter', color: '#000000' },
        { name: 'Instagram', icon: 'fa-brands fa-instagram', color: '#E4405F' },
        { name: 'TikTok', icon: 'fa-brands fa-tiktok', color: '#000000' },
        { name: 'LinkedIn', icon: 'fa-brands fa-linkedin', color: '#0A66C2' },
        { name: 'YouTube', icon: 'fa-brands fa-youtube', color: '#FF0000' },
        { name: 'Otro', icon: 'fa-solid fa-globe', color: '#6B7280' }
    ];
    const [openDropdownIndex, setOpenDropdownIndex] = useState(null);

    const [formData, setFormData] = useState({
        // Datos Personales
        nombre: '',
        cedula: '',
        correo: '',
        telefono: '',
        fecha_nacimiento: '',

        // Datos Estudiante
        institucion_id: '',
        provincia_id: '',
        ciudad_id: '',
        especialidad: '',

        // Datos Autoridad
        cargo: '',
        cargoPersonalizado: ''
    });

    const isStudent = usuario?.tipo_usuario?.nombre?.toLowerCase() === 'estudiante';
    const isAdmin = ['administrador', 'coadministrador'].includes(usuario?.tipo_usuario?.nombre?.toLowerCase());

    useEffect(() => {
        loadProfileData();
    }, [usuario]);

    // Inicializar datepicker cuando se habilita edición
    useEffect(() => {
        if (isEditing) {
            const timer = setTimeout(() => {
                const datepickerElement = document.getElementById('profile-fecha-nacimiento');
                if (datepickerElement && !datepickerElement.hasAttribute('data-datepicker-initialized')) {
                    try {
                        datepickerElement.setAttribute('data-datepicker-initialized', 'true');
                        new Datepicker(datepickerElement, {
                            format: 'yyyy-mm-dd',
                            autohide: true,
                            todayBtn: true,
                            clearBtn: true,
                            maxDate: new Date(),
                            orientation: 'bottom auto',
                            container: 'body'
                        });

                        datepickerElement.addEventListener('changeDate', (event) => {
                            const selectedDate = event.detail.date;
                            if (selectedDate) {
                                const formattedDate = selectedDate.toISOString().split('T')[0];
                                setFormData(prev => ({ ...prev, fecha_nacimiento: formattedDate }));
                            }
                        });
                    } catch (error) {
                        console.error('Error initializing datepicker:', error);
                    }
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isEditing]);

    const loadProfileData = async () => {
        setLoading(true);
        try {
            // Cargar catálogos necesarios
            if (isStudent) {
                const [ciudadesRes, institucionesRes, provinciasRes] = await Promise.all([
                    api.get('/api/ciudades'),
                    api.get('/api/instituciones'),
                    api.get('/api/provincias')
                ]);

                const normalize = (res) => (res.data.success ? res.data.data : res.data) || [];
                setCiudades(normalize(ciudadesRes));
                setInstituciones(normalize(institucionesRes));
                setProvincias(normalize(provinciasRes));

                // Cargar datos del estudiante
                const estudiantesRes = await api.get('/api/estudiantes/all-including-deleted');
                const estudiantes = normalize(estudiantesRes);
                const myStudent = estudiantes.find(e => e.persona_id === usuario.persona_id);

                if (myStudent) {
                    setStudentData(myStudent);

                    // Cargar redes sociales
                    let networks = [];
                    try {
                        const rawSocial = myStudent.RedSocial || myStudent.redsocial;
                        if (rawSocial) {
                            networks = typeof rawSocial === 'string' ? JSON.parse(rawSocial) : rawSocial;
                        }
                    } catch (e) {
                        console.error('Error parsing social networks:', e);
                    }
                    setSocialNetworks(Array.isArray(networks) ? networks : []);

                    // Encontrar provincia basada en ciudad
                    const ciudad = normalize(ciudadesRes).find(c => c.ID === myStudent.ciudad_id);
                    const provinciaId = ciudad ? ciudad.provincia_id : '';

                    if (provinciaId) {
                        const ciudadesProvRes = await api.get(`/api/ciudades/provincia/${provinciaId}`);
                        setCiudadesFiltered(ciudadesProvRes.data || []);
                    }

                    setFormData({
                        nombre: myStudent.persona?.nombre || '',
                        cedula: myStudent.persona?.cedula || '',
                        correo: myStudent.persona?.correo || '',
                        telefono: myStudent.persona?.telefono || '',
                        fecha_nacimiento: myStudent.persona?.fecha_nacimiento?.split('T')[0] || '',
                        institucion_id: myStudent.institucion_id || '',
                        ciudad_id: myStudent.ciudad_id || '',
                        provincia_id: provinciaId || '',
                        especialidad: myStudent.especialidad || ''
                    });
                }
            } else if (isAdmin) {
                // Cargar datos de autoridad
                const autoridadesRes = await api.get('/api/autoridades-uteq/all-including-deleted');
                const autoridades = (autoridadesRes.data.success ? autoridadesRes.data.data : autoridadesRes.data) || [];
                const myAuthority = autoridades.find(a => a.persona_id === usuario.persona_id);

                if (myAuthority) {
                    setAuthorityData(myAuthority);

                    // Verificar si necesitamos cargar datos de persona por separado si no vienen incluidos
                    let personaData = myAuthority.persona;
                    if (!personaData) {
                        const personaRes = await api.get(`/api/personas/${usuario.persona_id}`);
                        personaData = personaRes.data.success ? personaRes.data.data : personaRes.data;
                    }

                    const cargosComunes = ['Rector', 'Vicerrector Académico', 'Vicerrector de Investigación', 'Decano', 'Subdecano', 'Director de Carrera', 'Coordinador/a Académico', 'Secretario General', 'Director de Planificación', 'Docente'];
                    const cargo = myAuthority.cargo || '';
                    const esCargoPersonalizado = !cargosComunes.includes(cargo) && cargo !== 'Otro' && cargo !== '';

                    setFormData({
                        nombre: personaData?.nombre || '',
                        cedula: personaData?.cedula || '',
                        correo: personaData?.correo || '',
                        telefono: personaData?.telefono || '',
                        fecha_nacimiento: personaData?.fecha_nacimiento?.split('T')[0] || '',
                        cargo: esCargoPersonalizado ? 'Otro' : cargo,
                        cargoPersonalizado: esCargoPersonalizado ? cargo : ''
                    });
                }
            }
        } catch (err) {
            console.error('Error loading profile:', err);
            setError('Error al cargar los datos del perfil');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'provincia_id') {
            setFormData(prev => ({ ...prev, [name]: value, ciudad_id: '' }));
            loadCiudadesByProvincia(value);
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const loadCiudadesByProvincia = async (provinciaId) => {
        if (!provinciaId) {
            setCiudadesFiltered([]);
            return;
        }
        try {
            const response = await api.get(`/api/ciudades/provincia/${provinciaId}`);
            setCiudadesFiltered(response.data || []);
        } catch (error) {
            console.error('Error loading cities:', error);
        }
    };

    // Manejo de Redes Sociales
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            // Validaciones básicas
            if (!formData.nombre.trim()) throw new Error('El nombre es requerido');
            if (!formData.cedula.trim()) throw new Error('La cédula es requerida');

            const personaData = {
                nombre: formData.nombre,
                cedula: formData.cedula,
                correo: formData.correo,
                telefono: formData.telefono,
                fecha_nacimiento: formData.fecha_nacimiento ? formData.fecha_nacimiento + 'T00:00:00Z' : null
            };

            // Actualizar Persona
            await api.put(`/api/personas/${usuario.persona_id}`, personaData);

            if (isStudent && studentData) {
                // Actualizar Estudiante (Redes Sociales)
                const estudianteData = {
                    institucion_id: studentData.institucion_id, // Mantener original
                    ciudad_id: studentData.ciudad_id, // Mantener original
                    especialidad: studentData.especialidad, // Mantener original
                    redsocial: JSON.stringify(socialNetworks)
                };
                await api.put(`/api/estudiantes/${studentData.ID}`, estudianteData);
            } else if (isAdmin && authorityData) {
                // Actualizar Autoridad
                const autoridadData = {
                    persona_id: usuario.persona_id,
                    cargo: formData.cargo === 'Otro' ? formData.cargoPersonalizado : formData.cargo
                };
                await api.put(`/api/autoridades-uteq/${authorityData.ID}`, autoridadData);
            }

            setSuccess('Perfil actualizado exitosamente');
            setIsEditing(false);
            await loadProfileData(); // Recargar datos
        } catch (err) {
            console.error('Error updating profile:', err);
            setError(err.message || 'Error al actualizar el perfil');
        } finally {
            setSaving(false);
        }
    };

    // Funciones para cambio de contraseña
    const handlePasswordInputChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
        setPasswordError('');
    };

    const handleOpenPasswordModal = () => {
        setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
        setPasswordError('');
        setPasswordSuccess('');
        setShowOldPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
        setShowPasswordModal(true);
    };

    const handleClosePasswordModal = () => {
        setShowPasswordModal(false);
        setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
        setPasswordError('');
        setPasswordSuccess('');
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');

        // Validaciones
        if (!passwordData.old_password.trim()) {
            setPasswordError('La contraseña actual es requerida');
            return;
        }
        if (!passwordData.new_password.trim()) {
            setPasswordError('La nueva contraseña es requerida');
            return;
        }
        if (passwordData.new_password.length < 6) {
            setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
            return;
        }
        if (passwordData.new_password !== passwordData.confirm_password) {
            setPasswordError('Las contraseñas no coinciden');
            return;
        }
        if (passwordData.old_password === passwordData.new_password) {
            setPasswordError('La nueva contraseña debe ser diferente a la actual');
            return;
        }

        setSavingPassword(true);
        try {
            await api.post('/api/auth/change-password', {
                old_password: passwordData.old_password,
                new_password: passwordData.new_password
            });
            setPasswordSuccess('Contraseña cambiada exitosamente');
            setTimeout(() => {
                handleClosePasswordModal();
            }, 2000);
        } catch (err) {
            console.error('Error changing password:', err);
            const errorMsg = err.response?.data?.error || 'Error al cambiar la contraseña';
            setPasswordError(errorMsg);
        } finally {
            setSavingPassword(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <button
                        onClick={onBack}
                        className="text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 flex items-center gap-2 text-sm sm:text-base"
                        title="Volver"
                    >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span className="">Volver</span>
                    </button>

                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 text-sm sm:text-base bg-green-800 hover:bg-green-900"
                            style={{ backgroundColor: '#025a27' }}
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5a2.5 2.5 0 10-3.536-3.536L4 16v4z" />
                            </svg>
                            Modificar
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                loadProfileData(); // Revertir cambios
                            }}
                            className="inline-flex items-center text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 text-sm sm:text-base bg-red-600 hover:bg-red-700"
                            style={{ backgroundColor: '#dc2626' }}
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancelar
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                        {success}
                    </div>
                )}

                <div className="bg-white shadow-xl rounded-xl border border-gray-200">
                    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 rounded-t-xl" style={{ backgroundColor: '#025a27' }}>
                        <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Mi Perfil
                        </h3>
                    </div>

                    <div className="px-3 sm:px-6 py-4 sm:py-6 rounded-b-xl">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Sección Datos Personales (Común) */}
                            <div>
                                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 flex items-center">
                                    <svg className="w-5 h-5 mr-2" style={{ color: '#025a27' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0c0 .884-.5 2-2 2h4c-1.5 0-2-1.116-2-2z" />
                                    </svg>
                                    Datos Personales
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                        <input
                                            type="text"
                                            name="nombre"
                                            value={formData.nombre}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200 disabled:bg-gray-100 disabled:text-gray-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Cédula</label>
                                        <input
                                            type="text"
                                            name="cedula"
                                            value={formData.cedula}
                                            onChange={handleInputChange}
                                            disabled={true}
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200 disabled:bg-gray-100 disabled:text-gray-500 cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                                        <input
                                            type="email"
                                            name="correo"
                                            value={formData.correo}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200 disabled:bg-gray-100 disabled:text-gray-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                        <input
                                            type="tel"
                                            name="telefono"
                                            value={formData.telefono}
                                            onChange={handleInputChange}
                                            disabled={!isEditing}
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200 disabled:bg-gray-100 disabled:text-gray-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Fecha de Nacimiento</label>
                                        <div className="relative">
                                            <input
                                                id="profile-fecha-nacimiento"
                                                type="text"
                                                name="fecha_nacimiento"
                                                value={formData.fecha_nacimiento}
                                                onChange={handleInputChange}
                                                disabled={!isEditing}
                                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200 disabled:bg-gray-100 disabled:text-gray-500"
                                                placeholder="YYYY-MM-DD"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sección Específica Estudiante */}
                            {isStudent && (
                                <>
                                    <div className="pt-4 border-t border-gray-200">
                                        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 flex items-center">
                                            <svg className="w-5 h-5 mr-2" style={{ color: '#025a27' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                            </svg>
                                            Datos Académicos (Solo Lectura)
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Institución</label>
                                                <select
                                                    name="institucion_id"
                                                    value={formData.institucion_id}
                                                    disabled={true}
                                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-500 cursor-not-allowed"
                                                >
                                                    <option value="">Seleccione una institución</option>
                                                    {instituciones.map(i => (
                                                        <option key={i.ID} value={i.ID}>{i.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Provincia</label>
                                                <select
                                                    name="provincia_id"
                                                    value={formData.provincia_id}
                                                    disabled={true}
                                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-500 cursor-not-allowed"
                                                >
                                                    <option value="">Seleccione una provincia</option>
                                                    {provincias.map(p => (
                                                        <option key={p.ID} value={p.ID}>{p.provincia}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                                                <select
                                                    name="ciudad_id"
                                                    value={formData.ciudad_id}
                                                    disabled={true}
                                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-500 cursor-not-allowed"
                                                >
                                                    <option value="">Seleccione una ciudad</option>
                                                    {ciudades.map(c => (
                                                        <option key={c.ID} value={c.ID}>{c.ciudad}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                                                <input
                                                    type="text"
                                                    name="especialidad"
                                                    value={formData.especialidad}
                                                    disabled={true}
                                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-100 text-gray-500 cursor-not-allowed"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Redes Sociales */}
                                    <div className="pt-4 border-t border-gray-200">
                                        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 flex items-center">
                                            <svg className="w-5 h-5 mr-2" style={{ color: '#025a27' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                            </svg>
                                            Redes Sociales
                                        </h3>

                                        {isEditing && (
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
                                        )}

                                        <div className="space-y-3">
                                            {socialNetworks.map((network, index) => (
                                                <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                    <div className="w-full sm:w-1/3 relative">
                                                        {isEditing ? (
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
                                                        ) : (
                                                            <div className="flex items-center px-3 py-2 border border-gray-200 rounded-md bg-gray-100">
                                                                <i className={`${socialPlatforms.find(p => p.name === network.platform)?.icon || 'fa-solid fa-globe'} mr-2`} style={{ color: socialPlatforms.find(p => p.name === network.platform)?.color }}></i>
                                                                <span>{network.platform}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="w-full sm:w-1/2">
                                                        <input
                                                            type="text"
                                                            value={network.url}
                                                            onChange={(e) => handleSocialNetworkChange(index, 'url', e.target.value)}
                                                            disabled={!isEditing}
                                                            placeholder="Usuario o URL del perfil"
                                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200 disabled:bg-gray-100 disabled:text-gray-500"
                                                        />
                                                    </div>

                                                    {isEditing && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveSocialNetwork(index)}
                                                            className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-100"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {socialNetworks.length === 0 && (
                                                <p className="text-gray-500 text-sm italic">No hay redes sociales registradas.</p>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Sección Específica Autoridad */}
                            {isAdmin && (
                                <div className="pt-4 border-t border-gray-200">
                                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 flex items-center">
                                        <svg className="w-5 h-5 mr-2" style={{ color: '#025a27' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        Información del Cargo
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Cargo</label>
                                            <select
                                                name="cargo"
                                                value={formData.cargo}
                                                onChange={handleInputChange}
                                                disabled={!isEditing}
                                                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200 disabled:bg-gray-100 disabled:text-gray-500"
                                            >
                                                <option value="">Seleccione un cargo</option>
                                                <option value="Rector">Rector</option>
                                                <option value="Vicerrector Académico">Vicerrector Académico</option>
                                                <option value="Vicerrector de Investigación">Vicerrector de Investigación</option>
                                                <option value="Decano">Decano</option>
                                                <option value="Subdecano">Subdecano</option>
                                                <option value="Director de Carrera">Director de Carrera</option>
                                                <option value="Coordinador/a Académico">Coordinador/a Académico</option>
                                                <option value="Secretario General">Secretario General</option>
                                                <option value="Director de Planificación">Director de Planificación</option>
                                                <option value="Docente">Docente</option>
                                                <option value="Otro">Otro</option>
                                            </select>
                                        </div>
                                        {formData.cargo === 'Otro' && (
                                            <div>
                                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Especifique Cargo</label>
                                                <input
                                                    type="text"
                                                    name="cargoPersonalizado"
                                                    value={formData.cargoPersonalizado}
                                                    onChange={handleInputChange}
                                                    disabled={!isEditing}
                                                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 sm:py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base transition-colors duration-200 disabled:bg-gray-100 disabled:text-gray-500"
                                                    placeholder="Ingrese su cargo"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Sección de Seguridad - Cambiar Contraseña */}
                            <div className="pt-4 border-t border-gray-200">
                                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 flex items-center">
                                    <svg className="w-5 h-5 mr-2" style={{ color: '#025a27' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Seguridad
                                </h3>
                                <button
                                    type="button"
                                    onClick={handleOpenPasswordModal}
                                    className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 hover:shadow-md"
                                >
                                    <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                    Cambiar Contraseña
                                </button>
                            </div>

                            {isEditing && (
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
                                        ) : 'Guardar Cambios'}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>

            {/* Modal de Cambio de Contraseña */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto transform transition-all">
                        {/* Header del Modal */}
                        <div className="px-6 py-4 border-b border-gray-200 rounded-t-2xl" style={{ backgroundColor: '#025a27' }}>
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                    </svg>
                                    Cambiar Contraseña
                                </h3>
                                <button
                                    onClick={handleClosePasswordModal}
                                    className="text-white hover:text-gray-200 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Contenido del Modal */}
                        <div className="px-6 py-6">
                            {passwordError && (
                                <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center">
                                    <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {passwordError}
                                </div>
                            )}

                            {passwordSuccess && (
                                <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center">
                                    <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {passwordSuccess}
                                </div>
                            )}

                            <form onSubmit={handleChangePassword} className="space-y-4">
                                {/* Contraseña Actual */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Contraseña Actual
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showOldPassword ? "text" : "password"}
                                            name="old_password"
                                            value={passwordData.old_password}
                                            onChange={handlePasswordInputChange}
                                            className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-colors duration-200"
                                            placeholder="Ingrese su contraseña actual"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowOldPassword(!showOldPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                        >
                                            {showOldPassword ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Nueva Contraseña */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nueva Contraseña
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            name="new_password"
                                            value={passwordData.new_password}
                                            onChange={handlePasswordInputChange}
                                            className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-colors duration-200"
                                            placeholder="Mínimo 6 caracteres"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                        >
                                            {showNewPassword ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">La contraseña debe tener al menos 6 caracteres</p>
                                </div>

                                {/* Confirmar Contraseña */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Confirmar Nueva Contraseña
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirm_password"
                                            value={passwordData.confirm_password}
                                            onChange={handlePasswordInputChange}
                                            className="block w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 pr-10 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-colors duration-200"
                                            placeholder="Repita la nueva contraseña"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                        >
                                            {showConfirmPassword ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Botones */}
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={handleClosePasswordModal}
                                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingPassword}
                                        className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg"
                                        style={{ backgroundColor: '#025a27' }}
                                        onMouseEnter={(e) => !savingPassword && (e.target.style.backgroundColor = '#014a1f')}
                                        onMouseLeave={(e) => !savingPassword && (e.target.style.backgroundColor = '#025a27')}
                                    >
                                        {savingPassword ? (
                                            <div className="flex items-center justify-center">
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Guardando...
                                            </div>
                                        ) : 'Cambiar Contraseña'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
