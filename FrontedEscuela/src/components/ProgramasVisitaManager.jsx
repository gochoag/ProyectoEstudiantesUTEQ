import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import ConfirmDialog from './ConfirmDialog';
import Paginacion from './Paginacion';
import { Datepicker } from 'flowbite';
import { validarCedulaEcuatoriana } from '../utils/validaciones';

// Cliente API centralizado con token

const ProgramasVisitaManager = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [programas, setProgramas] = useState([]);
  const [instituciones, setInstituciones] = useState([]);
  const [autoridades, setAutoridades] = useState([]);
  const [estudiantesUniv, setEstudiantesUniv] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [showActModal, setShowActModal] = useState(false);
  const [actProgramId, setActProgramId] = useState(null);
  const [actSelected, setActSelected] = useState([]);
  const [actLoading, setActLoading] = useState(false);
  const [actSaving, setActSaving] = useState(false);
  const [actError, setActError] = useState('');
  const [actSearch, setActSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingPrograma, setEditingPrograma] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos'); // 'todos' | 'programadas' | 'hoy' | 'finalizadas'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [searchStudent, setSearchStudent] = useState('');
  const [searchAutoridad, setSearchAutoridad] = useState('');
  // Paginación para selectores pequeños
  const [authPage, setAuthPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);
  const smallPageSize = 5;

  const [showConfirm, setShowConfirm] = useState(false);
  const [toCancelId, setToCancelId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    institucion_id: '',
    fecha_inicio: '', // fecha inicio YYYY-MM-DD
    fecha_fin: '', // fecha fin YYYY-MM-DD
    hora: '', // solo hora HH:MM (aplicada a ambas fechas)
    autoridades_ids: [],
    estudiantes_ids: [],
  });

  const [showQuickAddStudent, setShowQuickAddStudent] = useState(false);
  const [quickStudentSaving, setQuickStudentSaving] = useState(false);
  const [quickStudentError, setQuickStudentError] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [quickStudent, setQuickStudent] = useState({
    nombre: '',
    cedula: '',
    correo: '',
    telefono: '',
    fecha_nacimiento: '',
    semestre: '',
  });
  const [cedulaValidation, setCedulaValidation] = useState({ esValida: false, mensaje: '' });
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Al abrir el modal de registro de estudiante, limpiar mensajes previos
  useEffect(() => {
    if (showQuickAddStudent) {
      setQuickStudentError('');
      setAttemptedSubmit(false);
    }
  }, [showQuickAddStudent]);

  // Sanitizar cédula y teléfono en tiempo real: solo dígitos y máx 10
  useEffect(() => {
    if (!showQuickAddStudent) return;
    const sanitize = (s) => (s || '').toString().replace(/\D/g, '').slice(0, 10);
    setQuickStudent((prev) => {
      const ced = sanitize(prev.cedula);
      const tel = sanitize(prev.telefono);
      if (ced !== prev.cedula || tel !== prev.telefono) {
        return { ...prev, cedula: ced, telefono: tel };
      }
      return prev;
    });
  }, [quickStudent.cedula, quickStudent.telefono, showQuickAddStudent]);

  // Validar cédula ecuatoriana en tiempo real
  useEffect(() => {
    if (!showQuickAddStudent) return;

    // Solo validar si hay algo escrito
    if (quickStudent.cedula && quickStudent.cedula.length > 0) {
      const validacion = validarCedulaEcuatoriana(quickStudent.cedula);
      setCedulaValidation(validacion);
    } else {
      // Resetear validación si está vacío
      setCedulaValidation({ esValida: false, mensaje: '' });
    }
  }, [quickStudent.cedula, showQuickAddStudent]);

  // Ocultar alerta de validación automáticamente después de 5 segundos
  useEffect(() => {
    if (attemptedSubmit) {
      const timer = setTimeout(() => {
        setAttemptedSubmit(false);
      }, 5000); // 5 segundos

      return () => clearTimeout(timer);
    }
  }, [attemptedSubmit]);

  useEffect(() => {
    loadInitial();
  }, []);

  // Inicializar date range picker cuando se muestre el formulario
  useEffect(() => {
    if (showForm) {
      // Pequeño delay para asegurar que el DOM esté listo
      const timer = setTimeout(() => {
        const dateRangePickerElement = document.getElementById('date-range-picker');
        if (dateRangePickerElement && !dateRangePickerElement.hasAttribute('data-datepicker-initialized')) {
          try {
            dateRangePickerElement.setAttribute('data-datepicker-initialized', 'true');

            // Inicializar el date range picker de Flowbite
            const dateRangePicker = new Datepicker(dateRangePickerElement, {
              format: 'yyyy-mm-dd',
              autohide: true,
              todayBtn: true,
              clearBtn: true,
              minDate: new Date(),
              orientation: 'bottom auto',
              container: 'body',
              rangePicker: true // Habilitar modo range picker
            });

            // Manejar eventos de cambio de fecha para ambos inputs
            const startInput = document.getElementById('datepicker-range-start');
            const endInput = document.getElementById('datepicker-range-end');

            if (startInput) {
              startInput.addEventListener('changeDate', (event) => {
                const selectedDate = event.detail.date;
                if (selectedDate) {
                  const formattedDate = selectedDate.toISOString().split('T')[0];
                  setForm(prev => ({
                    ...prev,
                    fecha_inicio: formattedDate,
                    // Si no hay fecha fin o es anterior a la nueva fecha inicio, actualizarla
                    fecha_fin: !prev.fecha_fin || new Date(prev.fecha_fin) < selectedDate ? formattedDate : prev.fecha_fin
                  }));
                }
              });
            }

            if (endInput) {
              endInput.addEventListener('changeDate', (event) => {
                const selectedDate = event.detail.date;
                if (selectedDate) {
                  const formattedDate = selectedDate.toISOString().split('T')[0];
                  setForm(prev => ({
                    ...prev,
                    fecha_fin: formattedDate
                  }));
                }
              });
            }
          } catch (error) {
            console.error('Error al inicializar el date range picker:', error);
          }
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [showForm]);

  // Inicializar datepicker del modal de estudiante
  useEffect(() => {
    if (showQuickAddStudent) {
      // Pequeño delay para asegurar que el DOM esté listo
      const timer = setTimeout(() => {
        const datepickerElement = document.getElementById('fecha-nacimiento-quick-student-datepicker');
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
              maxDate: new Date(), // No permitir fechas futuras para nacimiento
              orientation: 'bottom auto',
              container: 'body'
            });

            // Manejar el evento de selección de fecha
            datepickerElement.addEventListener('changeDate', (event) => {
              const selectedDate = event.detail.date;
              if (selectedDate) {
                const formattedDate = selectedDate.toISOString().split('T')[0];
                setQuickStudent(prev => ({
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
            console.error('Error al inicializar el datepicker del modal:', error);
          }
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [showQuickAddStudent]);

  const loadInitial = async () => {
    setLoading(true);
    setError('');
    if (false) {
      // Validaciones requeridas y de formato
      const nombre = (quickStudent.nombre || '').trim();
      const cedulaRaw = (quickStudent.cedula || '').toString();
      const telefonoRaw = (quickStudent.telefono || '').toString();
      const correo = (quickStudent.correo || '').trim();
      const semestreStr = (quickStudent.semestre || '').toString().trim();
      const fechaNac = quickStudent.fecha_nacimiento || '';

      const onlyDigits = (s) => s.replace(/\D/g, '');
      const cedula = onlyDigits(cedulaRaw).slice(0, 10);
      const telefono = onlyDigits(telefonoRaw).slice(0, 10);
      const semestreNum = Number(onlyDigits(semestreStr));
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Actualizar estado con valores saneados (para reflejar en UI)
      if (cedula !== quickStudent.cedula || telefono !== quickStudent.telefono || String(semestreNum || '') !== quickStudent.semestre) {
        setQuickStudent((p) => ({
          ...p,
          cedula,
          telefono,
          semestre: semestreNum ? String(semestreNum) : '',
        }));
      }

      if (!nombre || !cedula || !semestreNum || !telefono || !correo || !fechaNac) {
        setQuickStudentError('Nombre, cédula, semestre, teléfono, correo y fecha de nacimiento son obligatorios');
        return;
      }

      // Validación de cédula ecuatoriana
      const validacionCedula = validarCedulaEcuatoriana(cedula.toString());
      if (!validacionCedula.esValida) {
        setQuickStudentError(validacionCedula.mensaje);
        return;
      }
      if (telefono.length > 10) {
        setQuickStudentError('El teléfono debe contener solo números (máximo 10 dígitos)');
        return;
      }
      if (!emailRegex.test(correo)) {
        setQuickStudentError('Ingrese un correo electrónico válido');
        return;
      }
      if (!Number.isFinite(semestreNum) || semestreNum < 1) {
        setQuickStudentError('El semestre debe ser un número válido mayor o igual a 1');
        return;
      }
    }
    try {
      const [programasRes, institucionesRes, autoridadesRes, estudiantesRes, actividadesRes] = await Promise.all([
        api.get(`/api/programas-visita`),
        api.get(`/api/instituciones`),
        api.get(`/api/autoridades-uteq`),
        api.get(`/api/estudiantes-universitarios`),
        api.get(`/api/actividades`),
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

      setProgramas(normalizeApiResponse(programasRes.data));
      setInstituciones(normalizeApiResponse(institucionesRes.data));
      setAutoridades(normalizeApiResponse(autoridadesRes.data));
      setEstudiantesUniv(normalizeApiResponse(estudiantesRes.data));
      setActividades(normalizeApiResponse(actividadesRes.data));

    } catch (err) {
      setError('Error al cargar datos: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ institucion_id: '', fecha_inicio: '', fecha_fin: '', hora: '', autoridades_ids: [], estudiantes_ids: [] });
    setEditingPrograma(null);
    setEditingStudent(null);
    setShowForm(false);
    setSearchAutoridad('');
    setSearchStudent('');
    setActSearch('');
  };

  // Helpers
  const dateTimeToSeparate = (isoString) => {
    if (!isoString) return { fecha: '', hora: '' };
    const d = new Date(isoString);
    // Fecha local en formato YYYY-MM-DD
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const fecha = `${yyyy}-${mm}-${dd}`;
    // Hora local en formato HH:MM
    const hora = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return { fecha, hora };
  };

  const combineDateTime = (fecha, hora) => {
    // Combinar fecha (YYYY-MM-DD) y hora (HH:MM) -> RFC3339 con zona local
    if (!fecha || !hora) return '';
    const offsetMin = new Date().getTimezoneOffset(); // minutos: UTC - local
    const sign = offsetMin > 0 ? '-' : '+'; // offset positivo => local detrás de UTC => signo '-'
    const abs = Math.abs(offsetMin);
    const oh = String(Math.floor(abs / 60)).padStart(2, '0');
    const om = String(abs % 60).padStart(2, '0');
    const tz = `${sign}${oh}:${om}`;
    return `${fecha}T${hora}:00${tz}`;
  };

  // [MOVED BELOW HOOKS] Pantalla de carga inicial

  const statusForPrograma = (p) => {
    // If backend exposed deleted items, we could check p.DeletedAt
    const now = new Date();
    const fecha = new Date(p.Fecha || p.fecha);
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    if (fecha < startToday) return { label: 'Finalizada', color: 'bg-gray-100 text-gray-800' };
    if (fecha >= startToday && fecha < endToday) return { label: 'Hoy', color: 'bg-yellow-100 text-yellow-800' };
    return { label: 'Programada', color: 'bg-green-100 text-green-800' };
  };

  const institucionesById = useMemo(() => {
    const map = new Map();
    instituciones.forEach((i) => map.set(i.ID || i.id, i));
    return map;
  }, [instituciones]);

  const autoridadesFiltered = useMemo(() => {
    if (!Array.isArray(autoridades)) return [];
    const term = searchAutoridad.trim().toLowerCase();
    if (!term) return autoridades;
    return autoridades.filter((a) => {
      const nombre = a.Persona?.nombre || a.persona?.nombre || '';
      const cargo = a.cargo || '';
      const cedula = a.Persona?.cedula || a.persona?.cedula || '';
      return (
        nombre.toLowerCase().includes(term) ||
        cargo.toLowerCase().includes(term) ||
        (cedula && cedula.toLowerCase().includes(term))
      );
    });
  }, [autoridades, searchAutoridad]);

  // Paginación Autoridades
  const authTotalPages = Math.max(1, Math.ceil(autoridadesFiltered.length / smallPageSize));
  const authIndexOfLast = Math.min(authPage * smallPageSize, autoridadesFiltered.length);
  const authIndexOfFirst = Math.min(authIndexOfLast - smallPageSize, autoridadesFiltered.length);
  const autoridadesPage = useMemo(() => {
    if (!Array.isArray(autoridadesFiltered)) return [];
    return autoridadesFiltered.slice(authIndexOfFirst, authIndexOfLast);
  }, [autoridadesFiltered, authIndexOfFirst, authIndexOfLast]);
  useEffect(() => { setAuthPage(1); }, [searchAutoridad]);

  const estudiantesFiltered = useMemo(() => {
    if (!Array.isArray(estudiantesUniv)) return [];
    const term = searchStudent.trim().toLowerCase();
    if (!term) return estudiantesUniv;
    return estudiantesUniv.filter((e) => {
      // El API devuelve 'persona' (minúscula)
      const nombre = e.persona?.nombre || '';
      const cedula = e.persona?.cedula || '';
      return nombre.toLowerCase().includes(term) || (cedula && cedula.toLowerCase().includes(term));
    });
  }, [estudiantesUniv, searchStudent]);

  // Paginación Estudiantes
  const studentTotalPages = Math.max(1, Math.ceil(estudiantesFiltered.length / smallPageSize));
  const studentIndexOfLast = Math.min(studentPage * smallPageSize, estudiantesFiltered.length);
  const studentIndexOfFirst = Math.min(studentIndexOfLast - smallPageSize, estudiantesFiltered.length);
  const estudiantesPage = useMemo(() => {
    if (!Array.isArray(estudiantesFiltered)) return [];
    return estudiantesFiltered.slice(studentIndexOfFirst, studentIndexOfLast);
  }, [estudiantesFiltered, studentIndexOfFirst, studentIndexOfLast]);
  useEffect(() => { setStudentPage(1); }, [searchStudent]);

  const actividadesFiltered = useMemo(() => {
    if (!Array.isArray(actividades)) return [];
    const term = actSearch.trim().toLowerCase();
    if (!term) return actividades;
    return actividades.filter((a) => {
      const nombre = a.actividad || a.Actividad || '';
      const tematica = a.tematica?.nombre || '';
      return nombre.toLowerCase().includes(term) || tematica.toLowerCase().includes(term);
    });
  }, [actividades, actSearch]);

  const programasFiltered = useMemo(() => {
    if (!Array.isArray(programas)) return [];
    const term = searchTerm.trim().toLowerCase();
    let list = programas;
    if (term) {
      list = list.filter((p) => {
        const inst = p.Institucion?.Nombre || p.institucion?.nombre || '';
        return inst.toLowerCase().includes(term);
      });
    }
    if (statusFilter !== 'todos') {
      list = list.filter((p) => {
        const status = statusForPrograma(p)?.label?.toLowerCase();
        if (statusFilter === 'programadas') return status === 'programada';
        if (statusFilter === 'hoy') return status === 'hoy';
        if (statusFilter === 'finalizadas') return status === 'finalizada';
        return true;
      });
    }
    return list;
  }, [programas, searchTerm, statusFilter]);

  // Paginación de programas
  const totalPages = Math.max(1, Math.ceil(programasFiltered.length / itemsPerPage));
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, programasFiltered.length);
  const indexOfFirstItem = Math.min(indexOfLastItem - itemsPerPage, programasFiltered.length);
  const currentProgramas = useMemo(() => {
    if (!Array.isArray(programasFiltered)) return [];
    return programasFiltered.slice(indexOfFirstItem, indexOfLastItem);
  }, [programasFiltered, indexOfFirstItem, indexOfLastItem]);

  // Funciones de paginación
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const onEdit = async (p) => {
    setError('');
    setSuccess('');
    setEditingPrograma(p);
    // Pre-cargar relaciones actuales (autoridades y estudiantes) para el programa
    try {
      const programaId = p.ID || p.id;
      const [detAutoridadRes, estByProgRes] = await Promise.all([
        api.get(`/api/detalle-autoridad-detalles-visita/programa-visita/${programaId}`),
        api.get(`/api/visita-detalle-estudiantes-universitarios/programa-visita/${programaId}`),
      ]);

      const autoridadIds = (detAutoridadRes.data || []).map((d) => d.AutoridadUTEQID || d.autoridad_uteq_id);
      const estudianteIds = (estByProgRes.data || []).map((r) => r.EstudianteUniversitarioID || r.estudiante_universitario_id);

      const { fecha: fechaInicio, hora } = dateTimeToSeparate(p.Fecha || p.fecha);
      const { fecha: fechaFin } = dateTimeToSeparate(p.Fechafin || p.fechafin);

      setForm({
        institucion_id: p.InstitucionID || p.institucion_id || '',
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin || fechaInicio, // Si no hay fecha fin, usar la fecha inicio
        hora,
        autoridades_ids: autoridadIds,
        estudiantes_ids: estudianteIds,
      });
      setShowForm(true);
    } catch (err) {
      setError('Error al cargar relaciones del programa: ' + (err.response?.data?.error || err.message));
    }
  };

  const onCancelPrograma = (id) => {
    setToCancelId(id);
    setShowConfirm(true);
  };

  // Actividades modal: abrir, cargar seleccionadas y guardar
  const openActivitiesModal = async (programaId) => {
    setActError('');
    setActProgramId(programaId);
    setShowActModal(true);
    setActLoading(true);
    try {
      const res = await api.get(`/api/visita-detalles/programa/${programaId}`);
      const ids = (res.data || []).map((d) => d.ActividadID || d.actividad_id).filter((n) => Number.isFinite(Number(n))).map(Number);
      setActSelected(Array.from(new Set(ids)));
    } catch (err) {
      setActError('Error al cargar actividades asignadas: ' + (err.response?.data?.error || err.message));
      setActSelected([]);
    } finally {
      setActLoading(false);
    }
  };

  const toggleActividadInModal = (id) => {
    setActSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const saveActivitiesModal = async () => {
    if (!actProgramId) return;
    setActSaving(true);
    setActError('');
    try {
      // Borrado masivo y recreación según selección
      await api.delete(`/api/visita-detalles/programa/${actProgramId}`);
      if ((actSelected || []).length > 0) {
        for (const aid of actSelected) {
          const payloadVD = { programa_visita_id: Number(actProgramId), actividad_id: Number(aid) };
          try {
            await api.post(`/api/visita-detalles`, payloadVD);
          } catch (err) {
            if (err?.response?.status === 409) continue;
            const msg = err?.response?.data?.error || err?.message || 'Error creando actividad del programa';
            throw new Error(`${msg} (actividad_id=${aid}, payload=${JSON.stringify(payloadVD)})`);
          }
        }
      }
      setSuccess('Actividades actualizadas');
      setShowActModal(false);
    } catch (err) {
      setActError(err.message || 'Error al guardar actividades');
    } finally {
      setActSaving(false);
    }
  };

  const confirmCancel = async () => {
    if (!toCancelId) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/api/programas-visita/${toCancelId}`);
      setSuccess('Programa cancelado exitosamente');
      await loadInitial();
    } catch (err) {
      setError('Error al cancelar el programa: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeleting(false);
      setShowConfirm(false);
      setToCancelId(null);
    }
  };

  const addAutoridad = (id) => {
    setForm((prev) => ({ ...prev, autoridades_ids: prev.autoridades_ids.includes(id) ? prev.autoridades_ids : [...prev.autoridades_ids, id] }));
  };

  const removeAutoridad = (id) => {
    setForm((prev) => ({ ...prev, autoridades_ids: prev.autoridades_ids.filter((x) => x !== id) }));
  };

  const addActividad = (id) => {
    setForm((prev) => ({ ...prev, actividades_ids: prev.actividades_ids.includes(id) ? prev.actividades_ids : [...prev.actividades_ids, id] }));
  };

  const removeActividad = (id) => {
    setForm((prev) => ({ ...prev, actividades_ids: prev.actividades_ids.filter((x) => x !== id) }));
  };

  const addEstudiante = (id) => {
    setForm((prev) => ({ ...prev, estudiantes_ids: prev.estudiantes_ids.includes(id) ? prev.estudiantes_ids : [...prev.estudiantes_ids, id] }));
  };

  const removeEstudiante = (id) => {
    setForm((prev) => ({ ...prev, estudiantes_ids: prev.estudiantes_ids.filter((x) => x !== id) }));
  };

  const openEditStudent = async (student) => {
    let fullStudent = student;

    // Si no tenemos la información completa de la persona, intentar obtenerla
    if (!student.persona) {
      try {
        const studentId = student.ID || student.id;
        const response = await api.get(`/api/estudiantes-universitarios/${studentId}`);
        fullStudent = response.data || student;
      } catch (err) {
        console.warn('No se pudo obtener información completa del estudiante:', err);
      }
    }

    // El API devuelve 'persona' (minúscula) según el JSON tag en Go
    const persona = fullStudent.persona || {};
    const fechaNac = persona.fecha_nacimiento ? persona.fecha_nacimiento.split('T')[0] : '';

    setEditingStudent(fullStudent);
    setQuickStudent({
      nombre: persona.nombre || '',
      cedula: persona.cedula || '',
      correo: persona.correo || '',
      telefono: persona.telefono || '',
      fecha_nacimiento: fechaNac,
      semestre: String(fullStudent.semestre || ''),
    });
    setQuickStudentError('');
    setShowQuickAddStudent(true);
  };

  const handleSaveQuickStudent = async () => {
    setQuickStudentError('');
    setAttemptedSubmit(true);

    // Validar cédula ecuatoriana primero
    if (!cedulaValidation.esValida) {
      return; // No continuar si la cédula es inválida
    }

    // Normalización y validación de campos requeridos
    const nombre = (quickStudent.nombre || '').trim();
    const cedula = (quickStudent.cedula || '').toString().replace(/\D/g, '').slice(0, 10);
    const telefono = (quickStudent.telefono || '').toString().replace(/\D/g, '').slice(0, 10);
    const correo = (quickStudent.correo || '').trim();
    const semestreNum = Number(quickStudent.semestre || '0');
    const fechaNac = quickStudent.fecha_nacimiento || '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!nombre || !cedula || !telefono || !correo || !fechaNac || !semestreNum) {
      setQuickStudentError('Nombre, cédula, teléfono, correo, fecha de nacimiento y semestre son obligatorios');
      return;
    }
    if (cedula.length < 10) { setQuickStudentError('La cédula debe contener máximo 10 dígitos'); return; }
    if (telefono.length < 10) { setQuickStudentError('El teléfono debe contener máximo 10 dígitos'); return; }
    if (!emailRegex.test(correo)) { setQuickStudentError('Ingrese un correo electrónico válido'); return; }
    if (semestreNum < 1 || semestreNum > 10) { setQuickStudentError('Debe seleccionar un semestre válido (1-10)'); return; }
    try {
      setQuickStudentSaving(true);
      // Convertir fecha_nacimiento (YYYY-MM-DD) a ISO 8601 para compatibilidad con Go time.Time
      const fechaISO = quickStudent.fecha_nacimiento
        ? new Date(`${quickStudent.fecha_nacimiento}T00:00:00.000Z`).toISOString()
        : undefined;

      if (editingStudent) {
        // Modo edición
        const studentId = editingStudent.ID || editingStudent.id;
        // El API devuelve 'persona' (minúscula) según el JSON tag
        const personaId = editingStudent.persona?.ID || editingStudent.persona?.id;

        if (!personaId) {
          setQuickStudentError('Error: No se pudo obtener el ID de la persona');
          return;
        }

        // Actualizar persona
        await api.put(`/api/personas/${personaId}`, {
          nombre,
          cedula,
          correo,
          telefono,
          fecha_nacimiento: fechaISO,
        });

        // Actualizar estudiante universitario
        await api.put(`/api/estudiantes-universitarios/${studentId}`, {
          persona_id: personaId,
          semestre: semestreNum || 1,
        });

        // Obtener el registro actualizado
        let updatedStudent;
        try {
          const fullRes = await api.get(`/api/estudiantes-universitarios/${studentId}`);
          updatedStudent = fullRes.data;
        } catch (_) {
          // Fallback: componer el estudiante actualizado
          updatedStudent = {
            ...editingStudent,
            semestre: semestreNum,
            persona: {
              ...editingStudent.persona,
              nombre,
              cedula,
              correo,
              telefono,
              fecha_nacimiento: fechaISO,
            },
          };
        }

        // Actualizar la lista local
        setEstudiantesUniv((prev) => prev.map((s) =>
          (s.ID || s.id) === studentId ? updatedStudent : s
        ));

        setSuccess('Estudiante universitario actualizado exitosamente');
      } else {
        // Modo creación
        // 1) Create Persona
        const personaRes = await api.post(`/api/personas`, {
          nombre,
          cedula,
          correo,
          telefono,
          fecha_nacimiento: fechaISO,
        });

        // Manejar diferentes estructuras de respuesta del backend
        const personaCreada = personaRes.data.success ? personaRes.data.data : personaRes.data;
        const personaId = personaCreada?.ID || personaCreada?.id;

        if (!personaId) {
          throw new Error('No se pudo obtener el ID de la persona creada');
        }
        // 2) Create Estudiante Universitario linked to persona
        const estRes = await api.post(`/api/estudiantes-universitarios`, {
          persona_id: personaId,
          semestre: semestreNum || 1,
        });

        // Manejar diferentes estructuras de respuesta del backend
        const created = estRes.data.success ? estRes.data.data : estRes.data;
        const newEstId = created?.ID || created?.id;

        if (!newEstId) {
          throw new Error('No se pudo obtener el ID del estudiante universitario creado');
        }
        // Obtener el registro enriquecido con Persona preloaded
        let est = created;
        try {
          const fullRes = await api.get(`/api/estudiantes-universitarios/${newEstId}`);
          est = fullRes.data.success ? fullRes.data.data : fullRes.data;
        } catch (_) { }
        // Fallback: si no viene persona, componerla desde lo ingresado
        if (!est?.persona) {
          est = {
            ...est,
            persona: {
              nombre,
              cedula,
              correo: correo || '',
              telefono: telefono || '',
              fecha_nacimiento: fechaISO || '',
            },
          };
        }
        // Update local list y seleccionar
        setEstudiantesUniv((prev) => [est, ...prev]);
        addEstudiante(newEstId);
        setSuccess('Estudiante universitario creado y agregado');
      }

      // Reset and close
      setQuickStudent({ nombre: '', cedula: '', correo: '', telefono: '', fecha_nacimiento: '', semestre: '' });
      setEditingStudent(null);
      setShowQuickAddStudent(false);
    } catch (err) {
      setQuickStudentError('Error al ' + (editingStudent ? 'actualizar' : 'registrar') + ' estudiante: ' + (err.response?.data?.error || err.message));
    } finally {
      setQuickStudentSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    // Validar institución seleccionada
    if (!form.institucion_id) {
      setError('Debe seleccionar la institución');
      setSaving(false);
      return;
    }

    // Validar que tanto fechas como hora estén seleccionadas
    if (!form.fecha_inicio || !form.fecha_fin || !form.hora) {
      setError('Debe seleccionar fecha de inicio, fecha de fin y hora de la visita');
      setSaving(false);
      return;
    }

    // Validar que fecha fin no sea anterior a fecha inicio
    if (new Date(form.fecha_fin) < new Date(form.fecha_inicio)) {
      setError('La fecha de fin no puede ser anterior a la fecha de inicio');
      setSaving(false);
      return;
    }

    try {
      // Validar IDs seleccionados contra catálogos cargados
      const validAuthIdSet = new Set((autoridades || []).map((a) => Number(a.ID || a.id)).filter((n) => Number.isFinite(n) && n > 0));
      const validEstIdSet = new Set((estudiantesUniv || []).map((s) => Number(s.ID || s.id)).filter((n) => Number.isFinite(n) && n > 0));
      const normalizedAuthIds = Array.from(new Set((form.autoridades_ids || []).map((x) => Number(x)).filter((n) => validAuthIdSet.has(n))));
      const normalizedEstIds = Array.from(new Set((form.estudiantes_ids || []).map((x) => Number(x)).filter((n) => validEstIdSet.has(n))));

      // Validar asignaciones mínimas
      if (normalizedAuthIds.length === 0 && normalizedEstIds.length === 0) {
        setError('Debe seleccionar al menos una autoridad y un estudiante universitario');
        setSaving(false);
        return;
      }
      if (normalizedAuthIds.length === 0) {
        setError('Debe seleccionar al menos una autoridad');
        setSaving(false);
        return;
      }
      if (normalizedEstIds.length === 0) {
        setError('Debe seleccionar al menos un estudiante universitario');
        setSaving(false);
        return;
      }

      const payload = {
        institucion_id: Number(form.institucion_id),
        fecha: combineDateTime(form.fecha_inicio, form.hora),
        fechafin: combineDateTime(form.fecha_fin, form.hora),
      };

      let programa;
      if (editingPrograma) {
        const id = editingPrograma.ID || editingPrograma.id;
        const res = await api.put(`/api/programas-visita/${id}`, payload);
        programa = res.data;
        // Reconciliar relaciones
        // Autoridades: obtener existentes y eliminar las que no estén seleccionadas; agregar nuevas
        const existingDetRes = await api.get(`/api/detalle-autoridad-detalles-visita/programa-visita/${id}`);
        const existing = existingDetRes.data || [];
        // Normalizar IDs a number para comparaciones correctas
        const existingAuthIds = existing.map((d) => Number(d.AutoridadUTEQID || d.autoridad_uteq_id));
        const existingByAuthId = new Map(existingAuthIds.map((aid, idx) => [aid, existing[idx]]));
        const selectedAuthIds = normalizedAuthIds;
        const selectedSet = new Set(selectedAuthIds);
        // Delete removed
        const toRemove = existing.filter((d) => !selectedSet.has(Number(d.AutoridadUTEQID || d.autoridad_uteq_id)));
        await Promise.all(toRemove.map((d) => api.delete(`/api/detalle-autoridad-detalles-visita/${d.ID || d.id}`)));
        // Add new
        const toAdd = selectedAuthIds.filter((aid) => !existingByAuthId.has(aid));
        for (const aid of toAdd) {
          const payloadDetalle = { programa_visita_id: Number(id), autoridad_uteq_id: Number(aid) };
          try {
            await api.post(`/api/detalle-autoridad-detalles-visita`, payloadDetalle);
          } catch (err) {
            if (err?.response?.status === 409) continue; // relación ya existe
            // Adjuntar contexto del fallo para depurar rápido
            const msg = err?.response?.data?.error || err?.message || 'Error creando detalle autoridad';
            throw new Error(`${msg} (aid=${aid}, payload=${JSON.stringify(payloadDetalle)})`);
          }
        }

        // Estudiantes: eliminar todas las relaciones y volver a crearlas (API soporta delete por programa)
        await api.delete(`/api/visita-detalle-estudiantes-universitarios/programa-visita/${id}`);
        if (normalizedEstIds.length > 0) {
          const estIds = normalizedEstIds;
          for (const eid of estIds) {
            const payloadRel = { programa_visita_id: Number(id), estudiante_universitario_id: Number(eid) };
            try {
              await api.post(`/api/visita-detalle-estudiantes-universitarios`, payloadRel);
            } catch (err) {
              if (err?.response?.status === 409) continue;
              const msg = err?.response?.data?.error || err?.message || 'Error creando relación estudiante-programa';
              throw new Error(`${msg} (eid=${eid}, payload=${JSON.stringify(payloadRel)})`);
            }
          }
        }
        // Actividades: gestión separada desde botón "Actividades" (no aquí)
        setSuccess('Programa de visita actualizado');
      } else {
        // Crear
        const res = await api.post(`/api/programas-visita`, payload);
        programa = res.data;
        const id = programa.ID || programa.id;
        // Relaciones
        if (normalizedAuthIds.length > 0) {
          const authIds = normalizedAuthIds;
          for (const aid of authIds) {
            const payloadDetalle = { programa_visita_id: Number(id), autoridad_uteq_id: Number(aid) };
            try {
              await api.post(`/api/detalle-autoridad-detalles-visita`, payloadDetalle);
            } catch (err) {
              if (err?.response?.status === 409) continue;
              const msg = err?.response?.data?.error || err?.message || 'Error creando detalle autoridad';
              throw new Error(`${msg} (aid=${aid}, payload=${JSON.stringify(payloadDetalle)})`);
            }
          }
        }
        if (normalizedEstIds.length > 0) {
          const estIds = normalizedEstIds;
          for (const eid of estIds) {
            const payloadRel = { programa_visita_id: Number(id), estudiante_universitario_id: Number(eid) };
            try {
              await api.post(`/api/visita-detalle-estudiantes-universitarios`, payloadRel);
            } catch (err) {
              if (err?.response?.status === 409) continue;
              const msg = err?.response?.data?.error || err?.message || 'Error creando relación estudiante-programa';
              throw new Error(`${msg} (eid=${eid}, payload=${JSON.stringify(payloadRel)})`);
            }
          }
        }
        // Actividades: gestión separada desde botón "Actividades" (no aquí)
        setSuccess('Programa de visita creado');
      }

      await loadInitial();
      resetForm();
    } catch (err) {
      setError('Error al guardar el programa: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Pantalla de carga inicial (después de declarar todos los hooks)
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
          className="inline-flex items-center px-4 py-2 rounded-lg text-white font-semibold shadow-sm transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5"
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
              <span className="hidden sm:inline">Nuevo Programa</span>
              <span className="inline sm:hidden">Nuevo</span>
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
        <>
          {/* Formulario (estilo Estudiantes) */}
          <div className="px-0">
            <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
              {/* Header del formulario */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 rounded-t-xl" style={{ backgroundColor: '#025a27' }}>
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                  </svg>
                  {editingPrograma ? 'Editar Programa de Visita' : 'Registrar Programa de Visita'}
                </h3>
              </div>

              <div className="px-3 sm:px-6 py-4 sm:py-6 rounded-b-xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Datos del programa */}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#025a27' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                      </svg>
                      Datos del Programa
                    </h3>
                    <div id="date-range-picker" date-rangepicker className="flex flex-col lg:flex-row gap-2 sm:gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Institución</label>
                        <select
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-colors duration-200"
                          value={form.institucion_id}
                          onChange={(e) => setForm((prev) => ({ ...prev, institucion_id: e.target.value }))}
                          required
                        >
                          <option value="">Seleccione...</option>
                          {instituciones.map((i) => (
                            <option key={i.ID || i.id} value={i.ID || i.id}>{i.Nombre || i.nombre}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex lg:flex-row flex-col gap-2 lg:gap-3 lg:ml-auto">
                        <div className="lg:w-40">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Fecha inicio</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                              <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                              </svg>
                            </div>
                            <input
                              id="datepicker-range-start"
                              name="start"
                              type="text"
                              value={form.fecha_inicio}
                              onChange={(e) => setForm((prev) => ({ ...prev, fecha_inicio: e.target.value }))}
                              className="bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-green-500 focus:border-green-500 block w-full pl-8 pr-2 py-2 transition-colors duration-200"
                              placeholder="Fecha inicio"
                              readOnly
                              required
                            />
                          </div>
                        </div>
                        <div className="lg:w-40">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Fecha fin</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                              <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                              </svg>
                            </div>
                            <input
                              id="datepicker-range-end"
                              name="end"
                              type="text"
                              value={form.fecha_fin}
                              onChange={(e) => setForm((prev) => ({ ...prev, fecha_fin: e.target.value }))}
                              className="bg-white border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-green-500 focus:border-green-500 block w-full pl-8 pr-2 py-2 transition-colors duration-200"
                              placeholder="Fecha fin"
                              readOnly
                              required
                            />
                          </div>
                        </div>
                        <div className="lg:w-32">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Hora</label>
                          <div className="relative">
                            <input
                              id="hora-programa-timepicker"
                              type="time"
                              name="hora"
                              value={form.hora}
                              onChange={(e) => setForm((prev) => ({ ...prev, hora: e.target.value }))}
                              className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm transition-colors duration-200 bg-white"
                              min="07:00"
                              max="18:00"
                              required
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                              <svg className="w-4 h-4 text-gray-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm11-4a1 1 0 1 0-2 0v4a1 1 0 0 0 .293.707l3 3a1 1 0 0 0 1.414-1.414L13 11.586V8Z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Asignaciones */}
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-900 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#025a27' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m10-7.13a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Asignaciones
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Autoridades */}
                      <div className="border border-gray-200 rounded-lg p-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <label className="text-sm font-medium text-gray-700">Autoridades UTEQ</label>
                          <div className="relative w-full sm:w-64">
                            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                              </svg>
                            </div>
                            {searchAutoridad && (
                              <button
                                type="button"
                                aria-label="Limpiar búsqueda de autoridad"
                                onClick={() => setSearchAutoridad('')}
                                className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                            <input
                              type="text"
                              aria-label="Buscar autoridad"
                              placeholder="Buscar por autoridad"
                              className="w-full pl-7 pr-7 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              value={searchAutoridad}
                              onChange={(e) => setSearchAutoridad(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="max-h-56 overflow-auto space-y-2">
                          {autoridadesFiltered.map((a) => {
                            const id = a.ID || a.id;
                            const nombre = a.Persona?.nombre || a.persona?.nombre || 'N/A';
                            const cedula = a.Persona?.cedula || a.persona?.cedula || '';
                            const cargo = a.cargo || '';
                            const selected = form.autoridades_ids.includes(id);
                            const initials = (nombre || 'NA').toString().trim().split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
                            return (
                              <button
                                type="button"
                                key={id}
                                onClick={() => (selected ? removeAutoridad(id) : addAutoridad(id))}
                                className={`w-full text-left px-3 py-2.5 text-sm rounded-md border transition-colors duration-200 ${selected ? 'bg-amber-50 border-amber-300' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-semibold">
                                      {initials}
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-800">{nombre}</div>
                                      <div className="text-xs text-gray-500">Cédula: {cedula || 'N/A'}</div>
                                      {cargo && (
                                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">{cargo}</span>
                                      )}
                                    </div>
                                  </div>
                                  <input type="checkbox" readOnly checked={selected} style={{ accentColor: '#e0ae27' }} className="h-4 w-4" />
                                </div>
                              </button>
                            );
                          })}
                          {autoridadesFiltered.length === 0 && (
                            <div className="text-sm text-gray-500 px-2 py-2">Sin resultados</div>
                          )}
                        </div>
                      </div>

                      {/* Estudiantes */}
                      <div className="border border-gray-200 rounded-lg p-3">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <label className="text-sm font-medium text-gray-700">Estudiantes Universitarios</label>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                            <div className="relative w-full sm:flex-1">
                              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </div>
                              {searchStudent && (
                                <button
                                  type="button"
                                  aria-label="Limpiar búsqueda de estudiante"
                                  onClick={() => setSearchStudent('')}
                                  className="absolute inset-y-0 right-0 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                              <input
                                type="text"
                                placeholder="Buscar por estudiante"
                                className="w-full pl-7 pr-7 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                value={searchStudent}
                                onChange={(e) => setSearchStudent(e.target.value)}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStudent(null);
                                setQuickStudent({ nombre: '', cedula: '', correo: '', telefono: '', fecha_nacimiento: '', semestre: '' });
                                setQuickStudentError('');
                                setShowQuickAddStudent(true);
                              }}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white shadow-sm w-full sm:w-auto justify-center"
                              style={{ backgroundColor: '#025a27' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#014a1f'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#025a27'}
                            >
                              Registrar nuevo
                            </button>
                          </div>
                        </div>
                        {false && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            {quickStudentError && (
                              <div className="bg-red-50 text-red-700 border border-red-200 px-3 py-1 rounded mb-2 text-sm">{quickStudentError}</div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
                              <input className="border-gray-300 rounded-md" placeholder="Nombre" value={quickStudent.nombre} onChange={(e) => setQuickStudent((p) => ({ ...p, nombre: e.target.value }))} />
                              <input className="border-gray-300 rounded-md" placeholder="Cédula" value={quickStudent.cedula} onChange={(e) => setQuickStudent((p) => ({ ...p, cedula: e.target.value }))} />
                              <input className="border-gray-300 rounded-md" placeholder="Correo" value={quickStudent.correo} onChange={(e) => setQuickStudent((p) => ({ ...p, correo: e.target.value }))} />
                              <input className="border-gray-300 rounded-md" placeholder="Teléfono" value={quickStudent.telefono} onChange={(e) => setQuickStudent((p) => ({ ...p, telefono: e.target.value }))} />
                              <div>
                                <DatePicker
                                  value={quickStudent.fecha_nacimiento}
                                  onChange={(value) => setQuickStudent((p) => ({ ...p, fecha_nacimiento: value }))}
                                  placeholder="Fecha de nacimiento"
                                  className="border-gray-300 rounded-md"
                                />
                              </div>
                              <input className="border-gray-300 rounded-md" placeholder="Semestre" value={quickStudent.semestre} onChange={(e) => setQuickStudent((p) => ({ ...p, semestre: e.target.value }))} />
                            </div>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={handleSaveQuickStudent} disabled={quickStudentSaving} className="px-3 py-1.5 rounded-md text-white disabled:opacity-60" style={{ backgroundColor: '#025a27' }} onMouseEnter={(e) => { if (!quickStudentSaving) e.currentTarget.style.backgroundColor = '#014a1f'; }} onMouseLeave={(e) => { if (!quickStudentSaving) e.currentTarget.style.backgroundColor = '#025a27'; }}>
                                {quickStudentSaving ? 'Guardando...' : 'Guardar estudiante'}
                              </button>
                              <button type="button" onClick={() => { setShowQuickAddStudent(false); setQuickStudentError(''); }} className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</button>
                            </div>
                          </div>
                        )}
                        <div className="max-h-56 overflow-auto space-y-2">
                          {estudiantesFiltered.map((e) => {
                            const id = e.ID || e.id;
                            // El API devuelve 'persona' (minúscula)
                            const nombre = e.persona?.nombre || 'N/A';
                            const cedula = e.persona?.cedula || '';
                            const selected = form.estudiantes_ids.includes(id);
                            return (
                              <div
                                key={id}
                                className={`w-full px-3 py-2.5 text-sm rounded-md border transition-colors duration-200 ${selected ? 'bg-amber-50 border-amber-300' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
                              >
                                <div className="flex items-center justify-between">
                                  <button
                                    type="button"
                                    onClick={() => (selected ? removeEstudiante(id) : addEstudiante(id))}
                                    className="flex-1 text-left flex items-center gap-3"
                                  >
                                    <div>
                                      <div className="font-medium text-gray-800">{nombre}</div>
                                      <div className="text-gray-500">Cédula: {cedula || 'N/A'}</div>
                                    </div>
                                  </button>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      readOnly
                                      checked={selected}
                                      style={{ accentColor: '#e0ae27' }}
                                      onChange={() => (selected ? removeEstudiante(id) : addEstudiante(id))}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => openEditStudent(e)}
                                      className="p-1 rounded-full hover:bg-green-100 transition-colors duration-200"
                                      title="Editar estudiante"
                                    >
                                      <svg className="w-4 h-4 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#025a27' }}>
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5a2.5 2.5 0 10-3.536-3.536L4 16v4z" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {estudiantesFiltered.length === 0 && (
                            <div className="text-sm text-gray-500 px-2 py-2">Sin resultados</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botón enviar */}
                  <div className="pt-4 sm:pt-6 border-t border-gray-200">
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5 text-sm sm:text-base"
                      style={{ backgroundColor: '#025a27' }}
                      onMouseEnter={(e) => !saving && (e.currentTarget.style.backgroundColor = '#014a1f')}
                      onMouseLeave={(e) => !saving && (e.currentTarget.style.backgroundColor = '#025a27')}
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
                          {editingPrograma ? 'Actualizar Programa' : 'Registrar Programa'}
                        </div>
                      )}
                    </button>

                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
      {/* Listado (estilo Estudiantes) */}
      {!showForm && (
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200" style={{ backgroundColor: '#025a27' }}>
            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
              </svg>
              Lista de Programas de Visita
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
                  placeholder="Buscar por institucion..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Estado:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="todos">Todos</option>
                    <option value="programadas">Programadas</option>
                    <option value="hoy">Hoy</option>
                    <option value="finalizadas">Finalizadas</option>
                  </select>
                </div>
                <div className="text-sm text-gray-500">
                  {searchTerm || statusFilter !== 'todos' ? (
                    <span>
                      Mostrando {programasFiltered.length} de {programas.length} programas
                      {programasFiltered.length !== programas.length && (
                        <span className="text-green-600 font-medium"> (filtrados)</span>
                      )}
                    </span>
                  ) : (
                    <span>Total: {programas.length} programas</span>
                  )}
                </div>
              </div>
            </div>

            {/* Tabla desktop */}
            {loading ? (
              <div className="p-6 text-gray-500">Cargando...</div>
            ) : programas.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay programas</h3>
                <p className="mt-1 text-sm text-gray-500">Crea un nuevo programa para comenzar.</p>
              </div>
            ) : (
              <>
                <div className="hidden lg:block overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr style={{ backgroundColor: '#ffffff' }}>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          ID
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Institución
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Fecha Inicio
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Fecha Fin
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-bold uppercase tracking-wider" style={{ color: '#025a27' }}>
                          Hora
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
                      {currentProgramas.map((p, index) => {
                        const id = p.ID || p.id;
                        const inst = institucionesById.get(p.InstitucionID || p.institucion_id) || p.Institucion || p.institucion;
                        const fechaInicio = new Date(p.Fecha || p.fecha);
                        const fechaFin = p.Fechafin || p.fechafin ? new Date(p.Fechafin || p.fechafin) : null;
                        const horaInicio = `${String(fechaInicio.getHours()).padStart(2, '0')}:${String(fechaInicio.getMinutes()).padStart(2, '0')}`;
                        const status = statusForPrograma(p);
                        return (
                          <tr
                            key={id}
                            className={`hover:bg-gray-50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{inst?.Nombre || inst?.nombre || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{fechaInicio.toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{fechaFin ? fechaFin.toLocaleDateString() : 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-700">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {horaInicio}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                              <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${status.color}`}>{status.label}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => openActivitiesModal(id)}
                                  className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-all duration-200"
                                >
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6M9 16h6M9 8h6M5 6h1m-1 4h1m-1 4h1m-1 4h1M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                                  </svg>
                                  <span>Actividades</span>
                                </button>
                                <button
                                  onClick={() => onEdit(p)}
                                  className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-yellow-800 bg-yellow-100 hover:bg-yellow-200 transition-all duration-200"
                                >
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5a2.5 2.5 0 10-3.536-3.536L4 16v4z" />
                                  </svg>
                                  <span>Editar</span>
                                </button>
                                <button
                                  onClick={() => onCancelPrograma(id)}
                                  className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 transition-all duration-200"
                                >
                                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm4 10a1 1 0 01-1 1H9a1 1 0 110-2h6a1 1 0 011 1z" />
                                  </svg>
                                  <span>Cancelar</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tarjetas móvil/tablet */}
                <div className="lg:hidden space-y-4">
                  {currentProgramas.map((p) => {
                    const id = p.ID || p.id;
                    const inst = institucionesById.get(p.InstitucionID || p.institucion_id) || p.Institucion || p.institucion;
                    const fechaInicio = new Date(p.Fecha || p.fecha);
                    const fechaFin = p.Fechafin || p.fechafin ? new Date(p.Fechafin || p.fechafin) : null;
                    const horaInicio = `${String(fechaInicio.getHours()).padStart(2, '0')}:${String(fechaInicio.getMinutes()).padStart(2, '0')}`;
                    const status = statusForPrograma(p);
                    return (
                      <div key={id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">{inst?.Nombre || inst?.nombre || 'N/A'}</h4>
                            <div className="text-xs text-gray-500">ID: {id}</div>
                          </div>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${status.color}`}>{status.label}</span>
                        </div>
                        <div className="text-sm text-gray-700 mb-3 break-words">
                          <div><strong>Inicio:</strong> {fechaInicio.toLocaleDateString()}</div>
                          {fechaFin && <div><strong>Fin:</strong> {fechaFin.toLocaleDateString()}</div>}
                          <div className="flex items-center mt-1">
                            <strong>Hora:</strong>
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {horaInicio}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => openActivitiesModal(id)}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-all duration-200"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6M9 16h6M9 8h6M5 6h1m-1 4h1m-1 4h1m-1 4h1M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                            </svg>
                            <span>Actividades</span>
                          </button>
                          <button
                            onClick={() => onEdit(p)}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg text-yellow-800 bg-yellow-100 hover:bg-yellow-200 transition-all duration-200"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5a2.5 2.5 0 10-3.536-3.536L4 16v4z" />
                            </svg>
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => onCancelPrograma(id)}
                            className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg text-red-700 bg-red-100 hover:bg-red-200 transition-all duration-200"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 1010 10A10.011 10.011 0 0012 2zm4 10a1 1 0 01-1 1H9a1 1 0 110-2h6a1 1 0 011 1z" />
                            </svg>
                            <span>Cancelar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Paginación */}
                <Paginacion
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={paginate}
                  totalItems={programasFiltered.length}
                  itemsPerPage={itemsPerPage}
                  totalItemsOriginal={(searchTerm || statusFilter !== 'todos') ? programas.length : null}
                  itemName="programas"
                />
              </>
            )}
          </div>
        </div>
      )}
      {/* Confirm Dialog para cancelar programa */}
      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => { setShowConfirm(false); setToCancelId(null); }}
        onConfirm={confirmCancel}
        title="Cancelar Programa"
        message="¿Está seguro que desea cancelar este programa?"
        confirmText="Cancelar"
        cancelText="Volver"
        loading={deleting}
      />

      {/* Modal de Actividades */}
      {showActModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-gray-800">Gestionar Actividades</h4>
              <button onClick={() => setShowActModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            {actError && (
              <div className="mb-3 bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded-lg">{actError}</div>
            )}
            <div className="mb-3">
              <input
                type="text"
                placeholder="Buscar actividad..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                value={actSearch}
                onChange={(e) => setActSearch(e.target.value)}
              />
            </div>
            <div className="max-h-80 overflow-auto space-y-2">
              {actLoading ? (
                <div className="p-3 text-gray-600">Cargando...</div>
              ) : actividadesFiltered.length === 0 ? (
                <div className="p-3 text-gray-500">Sin resultados</div>
              ) : (
                actividadesFiltered.map((a) => {
                  const id = a.ID || a.id;
                  const nombre = a.actividad || a.Actividad || '-';
                  const tematica = a.tematica?.nombre || '';
                  const duracion = a.duracion || a.Duracion || 0;
                  const selected = actSelected.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleActividadInModal(id)}
                      className={`w-full text-left px-4 py-3 text-sm rounded-md border transition-colors duration-200 ${selected ? 'bg-amber-50 border-amber-300' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-800">{nombre}</div>
                          <div className="text-gray-500">{tematica || '—'}{duracion ? ` • ${duracion} min` : ''}</div>
                        </div>
                        <input type="checkbox" readOnly checked={selected} style={{ accentColor: '#e0ae27' }} className="h-4 w-4" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setShowActModal(false)} className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={saveActivitiesModal} disabled={actLoading || actSaving} className="px-5 py-2.5 rounded-md text-white disabled:opacity-60" style={{ backgroundColor: '#025a27' }} onMouseEnter={(e) => { if (!(actLoading || actSaving)) e.currentTarget.style.backgroundColor = '#014a1f'; }} onMouseLeave={(e) => { if (!(actLoading || actSaving)) e.currentTarget.style.backgroundColor = '#025a27'; }}>
                {actSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Estudiante Universitario */}
      {showQuickAddStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-gray-800">
                {editingStudent ? 'Editar Estudiante Universitario' : 'Registrar Estudiante Universitario'}
              </h4>
              <button onClick={() => {
                setShowQuickAddStudent(false);
                setQuickStudentError('');
                setEditingStudent(null);
              }} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            {quickStudentError && (
              <div className="mb-3 bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded">{quickStudentError}</div>
            )}
            {/* Alerta de validación de cédula */}
            {attemptedSubmit && !cedulaValidation.esValida && quickStudent.cedula.length > 0 && (
              <div className="mb-3 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                {cedulaValidation.mensaje}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
              <input required className="border border-gray-300 rounded-md px-3 py-2" placeholder="Nombre" value={quickStudent.nombre} onChange={(e) => setQuickStudent((p) => ({ ...p, nombre: e.target.value }))} />
              <input
                className="border border-gray-300 rounded-md px-3 py-2 w-full"
                placeholder="Cédula"
                value={quickStudent.cedula}
                onChange={(e) => setQuickStudent((p) => ({ ...p, cedula: e.target.value }))}
              />
              <input required type="email" className="border border-gray-300 rounded-md px-3 py-2" placeholder="Correo" value={quickStudent.correo} onChange={(e) => setQuickStudent((p) => ({ ...p, correo: e.target.value }))} />
              <input className="border border-gray-300 rounded-md px-3 py-2" placeholder="Teléfono" value={quickStudent.telefono} onChange={(e) => setQuickStudent((p) => ({ ...p, telefono: e.target.value }))} />
              <div>
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                    </svg>
                  </div>
                  <input
                    id="fecha-nacimiento-quick-student-datepicker"
                    type="text"
                    name="fecha_nacimiento"
                    value={quickStudent.fecha_nacimiento}
                    onChange={(e) => setQuickStudent((p) => ({ ...p, fecha_nacimiento: e.target.value }))}
                    className="border border-gray-300 rounded-md px-3 py-2 pl-10 w-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Fecha de nacimiento (YYYY-MM-DD)"
                    readOnly
                    required
                  />
                </div>
              </div>
              <select
                required
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
                value={quickStudent.semestre}
                onChange={(e) => setQuickStudent((p) => ({ ...p, semestre: e.target.value }))}
              >
                <option value="">Seleccionar semestre</option>
                <option value="1">1er Semestre</option>
                <option value="2">2do Semestre</option>
                <option value="3">3er Semestre</option>
                <option value="4">4to Semestre</option>
                <option value="5">5to Semestre</option>
                <option value="6">6to Semestre</option>
                <option value="7">7mo Semestre</option>
                <option value="8">8vo Semestre</option>
                <option value="9">9no Semestre</option>
                <option value="10">10mo Semestre</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => {
                setShowQuickAddStudent(false);
                setQuickStudentError('');
                setEditingStudent(null);
              }} className="px-3 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSaveQuickStudent} disabled={quickStudentSaving} className="px-4 py-2 rounded-md text-white disabled:opacity-60" style={{ backgroundColor: '#025a27' }} onMouseEnter={(e) => { if (!quickStudentSaving) e.currentTarget.style.backgroundColor = '#014a1f'; }} onMouseLeave={(e) => { if (!quickStudentSaving) e.currentTarget.style.backgroundColor = '#025a27'; }}>
                {quickStudentSaving ? 'Guardando...' : (editingStudent ? 'Actualizar' : 'Guardar')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramasVisitaManager;
