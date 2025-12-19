import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const getId = (obj) => (obj?.id ?? obj?.ID ?? null);

// Normalizar respuesta de API para manejar tanto arrays como objetos individuales
const normalizeApiResponse = (responseData, expectArray = true) => {
  if (Array.isArray(responseData)) {
    return responseData;
  } else if (responseData && Array.isArray(responseData.data)) {
    return responseData.data;
  } else if (responseData && responseData.data && !Array.isArray(responseData.data)) {
    // Para objetos individuales, devolver el objeto directamente
    return expectArray ? [responseData.data] : responseData.data;
  } else if (responseData && !Array.isArray(responseData)) {
    // Si es un objeto individual sin estructura {data: ...}
    return expectArray ? [responseData] : responseData;
  } else {
    console.warn('La respuesta de la API no es válida:', responseData);
    return expectArray ? [] : null;
  }
};

// Normaliza texto (sin acentos, minúsculas) para búsquedas
const normalize = (s) =>
  (s ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

// Intenta resolver el nombre completo del estudiante desde distintas formas posibles
const getStudentName = (d) => {
  try {
    const persona = d?.estudiante?.persona || d?.persona || {};
    const estudiante = d?.estudiante || {};

    // Construir nombre completo desde nombres y apellidos
    const nombreCompleto = [
      persona.nombres || persona.nombre,
      persona.apellidos || persona.apellido
    ].filter(Boolean).join(' ').trim();

    // Intentar diferentes campos donde puede estar el nombre
    return (
      nombreCompleto ||
      persona.nombre_completo ||
      estudiante.nombre_completo ||
      estudiante.nombre ||
      d?.estudiante_nombre ||
      d?.nombre_estudiante ||
      d?.estudianteNombres ||
      d?.estudiante?.persona?.nombre ||
      'Estudiante'
    );
  } catch (error) {
    return 'Estudiante';
  }
};

// Intenta resolver el nombre de quien respondió (autoridad)
const getResponderName = (d) => {
  try {
    const autoridad = d?.autoridad_uteq || d?.autoridad || {};
    const persona = autoridad?.persona || {};

    // Construir nombre completo desde nombres y apellidos
    const nombreCompleto = [
      persona.nombres || persona.nombre,
      persona.apellidos || persona.apellido
    ].filter(Boolean).join(' ').trim();

    // Intentar diferentes campos donde puede estar el nombre
    return (
      nombreCompleto ||
      persona.nombre_completo ||
      autoridad.nombre_completo ||
      autoridad.nombre ||
      d?.autoridad_nombre ||
      d?.nombre_autoridad ||
      d?.respondido_por ||
      d?.respondidoPor ||
      'Autoridad'
    );
  } catch (error) {
    return 'Autoridad';
  }
};

// Extrae de forma robusta el estudiante_id de una duda (soporta distintas claves)
const getEstudianteIdFromDuda = (d) => {
  const v =
    d?.estudiante_id ??
    d?.EstudianteID ??
    d?.estudianteId ??
    d?.estudiante?.id ??
    d?.estudiante?.ID ??
    null;
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
};

function useUsuario() {
  const [usuario, setUsuario] = useState(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem('usuario');
      if (raw) setUsuario(JSON.parse(raw));
    } catch { }
  }, []);
  const isAutoridad = useMemo(() => {
    const nombre = (usuario?.tipo_usuario?.nombre || '').toLowerCase();
    return (
      nombre.includes('autoridad') ||
      nombre.includes('coadministrador') ||
      nombre.includes('administrador')
    );
  }, [usuario]);
  return { usuario, isAutoridad };
}

export default function BancoDudas({ onBack }) {
  const { usuario, isAutoridad } = useUsuario();
  const [activeTab, setActiveTab] = useState('publico'); // 'publico' | 'privado'

  const [estudiante, setEstudiante] = useState(null);
  const [autoridad, setAutoridad] = useState(null);

  const [loadingIds, setLoadingIds] = useState(true);
  const [errorIds, setErrorIds] = useState('');

  useEffect(() => {
    const fetchIds = async () => {
      setLoadingIds(true);
      setErrorIds('');
      try {
        if (usuario?.persona_id) {
          // Resolver estudiante por persona obteniendo todos y filtrando (no cambiamos API)
          const estRes = await api.get(`/api/estudiantes`);
          const estudiantesData = normalizeApiResponse(estRes.data);
          const upid = Number(usuario.persona_id);
          const match = estudiantesData.find((e) => Number(e.persona_id) === upid);
          if (match) setEstudiante(match);

          // Determinar si se debe resolver autoridad (evitar 404 en estudiantes)
          const roleName = (usuario?.tipo_usuario?.nombre || '').toLowerCase();
          // Solo intentar resolver autoridad para roles que incluyen explícitamente "autoridad"
          const __shouldFetchAutoridad = (
            roleName.includes('autoridad') ||
            roleName.includes('coadministrador') ||
            roleName.includes('administrador')
          );

          // Intentar obtener autoridad por persona si no se detecta por el tipo de usuario
          if (__shouldFetchAutoridad && !isAutoridad) {
            try {
              const respAuto = await api.get(`/api/autoridades-uteq/persona/${usuario.persona_id}`);
              const autoridadData = normalizeApiResponse(respAuto.data, false); // No esperar array
              setAutoridad(autoridadData);
            } catch (_) {
              // Ignorar si no es autoridad
            }
          }

          // Resolver autoridad por persona (la API sí expone esta ruta)
          if (__shouldFetchAutoridad && isAutoridad) {
            try {
              const autRes = await api.get(`/api/autoridades-uteq/persona/${usuario.persona_id}`);
              const autoridadData = normalizeApiResponse(autRes.data, false); // No esperar array
              setAutoridad(autoridadData);
            } catch (e) {
              // Si no existe como autoridad aún, lo ignoramos
              setAutoridad(null);
            }
          }
        }
      } catch (e) {
        setErrorIds('No se pudieron obtener los datos del usuario.');
      } finally {
        setLoadingIds(false);
      }
    };
    fetchIds();
  }, [usuario, isAutoridad]);

  // Pantalla de carga inicial (similar a Estudiantes)
  if (loadingIds) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6">
      {/* Barra superior con botón Volver */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
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


      <div className="flex flex-wrap gap-2 mb-4">
        <button
          className={`w-full sm:w-auto text-sm sm:text-base px-4 py-2 rounded-lg border ${activeTab === 'publico' ? 'bg-[#025a27] text-white border-[#025a27]' : 'bg-white text-gray-700 border-gray-300'}`}
          onClick={() => setActiveTab('publico')}
        >
          Público
        </button>
        <button
          className={`w-full sm:w-auto text-sm sm:text-base px-4 py-2 rounded-lg border ${activeTab === 'privado' ? 'bg-[#025a27] text-white border-[#025a27]' : 'bg-white text-gray-700 border-gray-300'}`}
          onClick={() => setActiveTab('privado')}
        >
          Privado
        </button>
      </div>

      {errorIds && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{errorIds}</div>
      )}
      {activeTab === 'publico' ? (
        <DudasPublicas
          estudianteId={getId(estudiante)}
          isAutoridad={isAutoridad}
          autoridadId={getId(autoridad)}
        />
      ) : (
        <DudasPrivadas
          estudianteId={getId(estudiante)}
          isAutoridad={isAutoridad}
          autoridadId={getId(autoridad)}
        />
      )}
    </div>
  );
}

function DudasPublicas({ estudianteId, isAutoridad, autoridadId }) {
  const [dudas, setDudas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pregunta, setPregunta] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('todas'); // 'todas' | 'sin-responder' | 'respondidas'
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Normalización de IDs (compatibilidad con distintas claves del backend)
  const getEstudianteIdFromDuda = (d) => {
    const v =
      d?.estudiante_id ??
      d?.EstudianteID ??
      d?.estudianteId ??
      d?.estudiante?.id ??
      d?.estudiante?.ID ??
      null;
    const n = Number(v);
    return Number.isFinite(n) ? n : v;
  };
  // Nota: ya no usamos autoridadId para filtrar dudas privadas

  const isAuthorityContext = !estudianteId && isAutoridad;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/api/dudas/privacidad/publico`);
      const dudasData = normalizeApiResponse(res.data);
      setDudas(dudasData);
    } catch (e) {
      setError('Error al cargar dudas públicas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = dudas;
    if (filter === 'sin-responder') list = list.filter((d) => !d.respuesta || d.respuesta === '');
    else if (filter === 'respondidas') list = list.filter((d) => d.respuesta && d.respuesta !== '');
    const q = normalize(search.trim());
    if (q) list = list.filter((d) => normalize(d?.pregunta).includes(q));
    // Ordenar por más recientes primero
    const toTime = (d) => {
      const fp = d?.fecha_pregunta ? new Date(d.fecha_pregunta).getTime() : 0;
      const ca = d?.created_at ? new Date(d.created_at).getTime() : 0;
      return Math.max(fp || 0, ca || 0);
    };
    return [...list].sort((a, b) => {
      const tb = toTime(b);
      const ta = toTime(a);
      if (tb !== ta) return tb - ta;
      const ib = Number((b?.id ?? b?.ID) || 0);
      const ia = Number((a?.id ?? a?.ID) || 0);
      return ib - ia; // fallback por id
    });
  }, [dudas, filter, search]);

  // Ajustar página al cambiar filtros/datos/tamaño de página
  useEffect(() => { setPage(1); }, [filter, dudas.length, pageSize, search]);
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paged = filtered.slice(startIndex, endIndex);

  const canSend = !!estudianteId && pregunta.trim().length > 0;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSend) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/api/dudas`, {
        pregunta: pregunta.trim(),
        privacidad: 'publico',
        estudiante_id: estudianteId,


      });
      setPregunta('');
      await load();
    } catch (e) {
      setError('No se pudo enviar la duda');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Formulario enviar duda pública */}
      <div className="bg-white rounded-2xl shadow p-3 sm:p-4 mb-4" style={{ display: isAutoridad ? 'none' : undefined }}>
        <h2 className="text-lg font-semibold mb-2">Enviar duda pública</h2>
        {!estudianteId && (
          <div className="mb-2 text-yellow-700 bg-yellow-50 border border-yellow-300 p-2 rounded">
            Debes iniciar sesión como estudiante para enviar dudas.
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-2">
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#025a27]"
            rows={3}
            placeholder="Escribe tu pregunta..."
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={!canSend || submitting}
              className="w-full sm:w-auto px-4 py-2 rounded-lg text-white font-semibold disabled:opacity-50 text-center"
              style={{ backgroundColor: submitting ? '#9ca3af' : '#025a27' }}
            >
              {submitting ? 'Enviando...' : 'Enviar'}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-700">Filtrar:</span>
              <div className="flex flex-wrap rounded-md overflow-hidden border border-gray-300">
                <button type="button" className={`px-3 py-1 text-xs sm:text-sm ${filter === 'todas' ? 'bg-[#025a27] text-white' : 'bg-white text-gray-700'}`} onClick={() => setFilter('todas')}>Todas</button>
                <button type="button" className={`px-3 py-1 text-xs sm:text-sm border-l border-gray-300 ${filter === 'sin-responder' ? 'bg-[#025a27] text-white' : 'bg-white text-gray-700'}`} onClick={() => setFilter('sin-responder')}>Sin responder</button>
                <button type="button" className={`px-3 py-1 text-xs sm:text-sm border-l border-gray-300 ${filter === 'respondidas' ? 'bg-[#025a27] text-white' : 'bg-white text-gray-700'}`} onClick={() => setFilter('respondidas')}>Respondidas</button>
              </div>

            </div>
          </div>
        </form>
      </div>
      {(isAuthorityContext) && (
        <div className="bg-white rounded-2xl shadow p-3 sm:p-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-700">Filtrar:</span>
            <div className="flex flex-wrap rounded-md overflow-hidden border border-gray-300">
              <button type="button" className={`px-3 py-1 text-xs sm:text-sm ${filter === 'todas' ? 'bg-[#025a27] text-white' : 'bg-white text-gray-700'}`} onClick={() => setFilter('todas')}>Todas</button>
              <button type="button" className={`px-3 py-1 text-xs sm:text-sm border-l border-gray-300 ${filter === 'sin-responder' ? 'bg-[#025a27] text-white' : 'bg-white text-gray-700'}`} onClick={() => setFilter('sin-responder')}>Sin responder</button>
              <button type="button" className={`px-3 py-1 text-xs sm:text-sm border-l border-gray-300 ${filter === 'respondidas' ? 'bg-[#025a27] text-white' : 'bg-white text-gray-700'}`} onClick={() => setFilter('respondidas')}>Respondidas</button>
            </div>

          </div>
        </div>
      )}

      {/* Listado dudas públicas */}
      <div className="space-y-3">
        {/* Paginación superior (públicas) */}
        {!loading && !error && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-700">
            <div>
              Mostrando <span className="font-semibold">{totalItems === 0 ? 0 : startIndex + 1}-{endIndex}</span> de <span className="font-semibold">{totalItems}</span>
            </div>
            <div className="relative w-full sm:w-64">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 10.5a7.5 7.5 0 0013.15 6.15z" />
                </svg>
              </span>
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#025a27] focus:border-[#025a27] placeholder-gray-400 shadow-sm"
                placeholder="Buscar preguntas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Por página:</label>
              <select className="border border-gray-300 rounded-md px-3 py-1 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#025a27] focus:border-[#025a27]" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value) || 10)}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        )}
        {loading ? (
          <div className="text-gray-600">Cargando dudas...</div>
        ) : error ? (
          <div className="text-red-700 bg-red-50 border border-red-300 p-2 rounded">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-600">No hay dudas para mostrar.</div>
        ) : (
          paged.map((d) => (
            <DudaCard
              key={d.id ?? d.ID}
              duda={d}
              isAutoridad={isAutoridad}
              autoridadId={autoridadId}
              onUpdated={load}
            />
          ))
        )}
      </div>
      {/* Paginación inferior (públicas) */}
      {!loading && !error && totalItems > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
          <div className="text-sm text-gray-700">Página {currentPage} de {totalPages}</div>
          <div className="flex items-center gap-2">
            <button type="button" className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 disabled:opacity-50 bg-white" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} title="Anterior">Anterior</button>
            <button type="button" className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 disabled:opacity-50 bg-white" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} title="Siguiente">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DudasPrivadas({ estudianteId, isAutoridad, autoridadId }) {
  const [dudas, setDudas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pregunta, setPregunta] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterPriv, setFilterPriv] = useState('todas');
  // Buscador (privadas)
  const [searchPriv, setSearchPriv] = useState('');

  // Paginación (privadas)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async () => {
    if (!estudianteId) {
      setDudas([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Usar un único endpoint por privacidad (privado) y filtrar por estudiante en cliente
      const res = await api.get(`/api/dudas/privacidad/privado`);
      const allData = normalizeApiResponse(res.data);
      const data = allData.filter((d) => Number(getEstudianteIdFromDuda(d)) === Number(estudianteId));
      setDudas(data);
    } catch (e) {
      setError('Error al cargar dudas privadas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estudianteId]);

  // Vista de autoridad: cargar dudas privadas (sin depender de autoridadId)
  useEffect(() => {
    const loadForAuthority = async () => {
      if (estudianteId || !isAutoridad) return;
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/api/dudas/privacidad/privado`);
        const all = normalizeApiResponse(res.data);
        setDudas(all);
      } catch (e) {
        setError('Error al cargar dudas privadas');
      } finally {
        setLoading(false);
      }
    };
    loadForAuthority();
  }, [estudianteId, isAutoridad]);

  // Filtrar por estado de respuesta (privado)
  const filteredPriv = useMemo(() => {
    let list = dudas;
    if (filterPriv === 'sin-responder') list = list.filter((d) => !d.respuesta || d.respuesta === '');
    else if (filterPriv === 'respondidas') list = list.filter((d) => d.respuesta && d.respuesta !== '');
    const q = normalize(searchPriv.trim());
    if (q) list = list.filter((d) => normalize(d?.pregunta).includes(q));
    const toTime = (d) => {
      const fp = d?.fecha_pregunta ? new Date(d.fecha_pregunta).getTime() : 0;
      const ca = d?.created_at ? new Date(d.created_at).getTime() : 0;
      return Math.max(fp || 0, ca || 0);
    };
    return [...list].sort((a, b) => {
      const tb = toTime(b);
      const ta = toTime(a);
      if (tb !== ta) return tb - ta;
      const ib = Number((b?.id ?? b?.ID) || 0);
      const ia = Number((a?.id ?? a?.ID) || 0);
      return ib - ia;
    });
  }, [dudas, filterPriv, searchPriv]);

  // Ajustar página al cambiar filtros/datos/tamaño de página
  useEffect(() => { setPage(1); }, [filterPriv, dudas.length, pageSize, searchPriv]);
  const totalItemsPriv = filteredPriv.length;
  const totalPagesPriv = Math.max(1, Math.ceil(totalItemsPriv / pageSize));
  const currentPagePriv = Math.min(page, totalPagesPriv);
  const startIndexPriv = (currentPagePriv - 1) * pageSize;
  const endIndexPriv = Math.min(startIndexPriv + pageSize, totalItemsPriv);
  const pagedPriv = filteredPriv.slice(startIndexPriv, endIndexPriv);

  // Recarga adecuada segun contexto (estudiante vs autoridad)
  const reload = async () => {
    if (estudianteId) {
      await load();
      return;
    }
    if (isAutoridad) {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/api/dudas/privacidad/privado`);
        const all = normalizeApiResponse(res.data);
        setDudas(all);
      } catch (e) {
        setError('Error al cargar dudas privadas');
      } finally {
        setLoading(false);
      }
    }
  };

  const canSend = !!estudianteId && pregunta.trim().length > 0;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSend) return;
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/api/dudas`, {
        pregunta: pregunta.trim(),
        privacidad: 'privado',
        estudiante_id: estudianteId,
      });
      setPregunta('');
      await load();
    } catch (e) {
      setError('No se pudo enviar la duda');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="bg-white rounded-2xl shadow p-3 sm:p-4 mb-4" style={{ display: isAutoridad ? 'none' : undefined }}>
        <h2 className="text-base sm:text-lg font-semibold mb-2">Enviar duda privada</h2>
        {!estudianteId && (
          <div className="mb-2 text-yellow-700 bg-yellow-50 border border-yellow-300 p-2 rounded">
            Debes iniciar sesión como estudiante para enviar dudas.
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-2">
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#025a27]"
            rows={3}
            placeholder="Escribe tu pregunta..."
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={!canSend || submitting}
              className="w-full sm:w-auto px-4 py-2 rounded-lg text-white font-semibold disabled:opacity-50 text-center"
              style={{ backgroundColor: submitting ? '#9ca3af' : '#025a27' }}
            >
              {submitting ? 'Enviando...' : 'Enviar'}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-700">Filtrar:</span>
              <div className="flex flex-wrap rounded-md overflow-hidden border border-gray-300">
                <button type="button" className={`px-3 py-1 text-xs sm:text-sm ${filterPriv === 'todas' ? 'bg-[#025a27] text-white' : 'bg-white text-gray-700'}`} onClick={() => setFilterPriv('todas')}>Todas</button>
                <button type="button" className={`px-3 py-1 text-xs sm:text-sm border-l border-gray-300 ${filterPriv === 'sin-responder' ? 'bg-[#025a27] text-white' : 'bg-white text-gray-700'}`} onClick={() => setFilterPriv('sin-responder')}>Sin responder</button>
                <button type="button" className={`px-3 py-1 text-xs sm:text-sm border-l border-gray-300 ${filterPriv === 'respondidas' ? 'bg-[#025a27] text-white' : 'bg-white text-gray-700'}`} onClick={() => setFilterPriv('respondidas')}>Respondidas</button>
              </div>

            </div>
          </div>
        </form>
      </div>

      {/* Filtro de estado (botones) - solo autoridad */}
      {isAutoridad && (
        <div className="bg-white rounded-2xl shadow p-3 sm:p-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-700">Filtrar:</span>
            <div className="flex flex-wrap rounded-md overflow-hidden border border-gray-300">
              <button type="button" className={`px-3 py-1 text-xs sm:text-sm ${filterPriv === 'todas' ? 'bg-[#025a27] text-white' : 'bg-white text-gray-700'}`} onClick={() => setFilterPriv('todas')}>Todas</button>
              <button type="button" className={`px-3 py-1 text-xs sm:text-sm border-l border-gray-300 ${filterPriv === 'sin-responder' ? 'bg-[#025a27] text-white' : 'bg-white text-gray-700'}`} onClick={() => setFilterPriv('sin-responder')}>Sin responder</button>
              <button type="button" className={`px-3 py-1 text-xs sm:text-sm border-l border-gray-300 ${filterPriv === 'respondidas' ? 'bg-[#025a27] text-white' : 'bg-white text-gray-700'}`} onClick={() => setFilterPriv('respondidas')}>Respondidas</button>
            </div>

          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Paginación superior (privadas) */}
        {!loading && !error && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm text-gray-700">
            <div>
              Mostrando <span className="font-semibold">{totalItemsPriv === 0 ? 0 : startIndexPriv + 1}-{endIndexPriv}</span> de <span className="font-semibold">{totalItemsPriv}</span>
            </div>
            <div className="relative w-full sm:w-64">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 10.5a7.5 7.5 0 0013.15 6.15z" />
                </svg>
              </span>
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#025a27] focus:border-[#025a27] placeholder-gray-400 shadow-sm"
                placeholder="Buscar preguntas..."
                value={searchPriv}
                onChange={(e) => setSearchPriv(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Por página:</label>
              <select className="border border-gray-300 rounded-md px-3 py-1 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-[#025a27] focus:border-[#025a27]" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value) || 10)}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        )}
        {loading ? (
          <div className="text-gray-600">Cargando dudas...</div>
        ) : error ? (
          <div className="text-red-700 bg-red-50 border border-red-300 p-2 rounded">{error}</div>
        ) : filteredPriv.length === 0 ? (
          <div className="text-gray-600">No hay dudas privadas aún.</div>
        ) : (
          pagedPriv.map((d) => (
            <DudaCard
              key={d.id ?? d.ID}
              duda={d}
              isAutoridad={isAutoridad}
              autoridadId={autoridadId}
              onUpdated={reload}
            />
          ))
        )}
      </div>
      {/* Paginación inferior (privadas) */}
      {!loading && !error && dudas.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
          <div className="text-sm text-gray-700">Página {currentPagePriv} de {totalPagesPriv}</div>
          <div className="flex items-center gap-2">
            <button type="button" className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 disabled:opacity-50 bg-white" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPagePriv <= 1} title="Anterior">Anterior</button>
            <button type="button" className="px-3 py-1 rounded-md border border-gray-300 text-gray-700 disabled:opacity-50 bg-white" onClick={() => setPage((p) => Math.min(totalPagesPriv, p + 1))} disabled={currentPagePriv >= totalPagesPriv} title="Siguiente">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}

function DudaCard({ duda, isAutoridad, autoridadId, onUpdated }) {
  const [answering, setAnswering] = useState(false);
  const [respuesta, setRespuesta] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const dudaId = duda?.id ?? duda?.ID;
  const canModerate = !!isAutoridad;
  const studentName = useMemo(() => getStudentName(duda), [duda]);
  const responderName = useMemo(() => getResponderName(duda), [duda]);
  const hasAutoridadId = useMemo(() => {
    const n = Number(autoridadId);
    return Number.isFinite(n) && n > 0;
  }, [autoridadId]);

  const responder = async () => {
    if (!respuesta.trim()) return;
    setBusy(true);
    setError('');
    try {
      if (!hasAutoridadId) {
        setError('No se detectó un ID de autoridad válido. Inicie sesión como autoridad para responder.');
        setBusy(false);
        return;
      }
      const payload = { respuesta: respuesta.trim() };
      const aid = Number(autoridadId);
      if (Number.isFinite(aid) && aid > 0) {
        payload.autoridad_uteq_id = aid;
      }
      await api.put(`/api/dudas/${dudaId}/responder`, payload);
      setRespuesta('');
      setAnswering(false);
      await onUpdated?.();
    } catch (e) {
      setError('No se pudo enviar la respuesta');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-5">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div>
          {/* Chips */}
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${duda.privacidad === 'privado' ? '' : 'bg-green-50 text-green-700 border-green-200'
                }`}
              style={
                duda.privacidad === 'privado'
                  ? { backgroundColor: '#fff6db', color: '#e0ae27', borderColor: '#f1d48a' }
                  : undefined
              }
            >
              {duda.privacidad === 'privado' ? 'Privada' : 'Pública'}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${duda.respuesta && duda.respuesta !== ''
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
              {duda.respuesta && duda.respuesta !== '' ? 'Respondida' : 'Pendiente'}
            </span>
          </div>

          {/* Pregunta */}
          <div className="text-base sm:text-lg font-semibold text-gray-900 break-words whitespace-pre-wrap">{duda.pregunta}</div>

          {/* Metadatos: hora, estudiante, respondido por */}
          <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {duda.fecha_pregunta && (
              <span className="inline-flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {new Date(duda.fecha_pregunta).toLocaleString()}
              </span>
            )}
            {studentName && (
              <span className="inline-flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {studentName}
              </span>
            )}
            {/* Se eliminó el nombre de la autoridad en metadatos de la pregunta */}
          </div>
        </div>

        {/* Acciones moderaci�n */}
        {canModerate && !duda.respuesta && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAnswering((v) => !v)}
              className={`px-3 py-1.5 rounded-md text-sm text-white disabled:opacity-50 ${answering ? 'bg-red-600 hover:bg-red-700' : 'bg-[#025a27] hover:bg-[#024a20]'}`}
              title={answering ? 'Cancelar respuesta' : (hasAutoridadId ? 'Responder a la duda' : 'Bloqueado: se requiere ID de autoridad')}
              disabled={busy || !hasAutoridadId}
            >
              {answering ? 'Cancelar' : 'Responder'}
            </button>
            {isAutoridad && !hasAutoridadId && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                Bloqueado: no se detectó ID de autoridad
              </span>
            )}
          </div>
        )}
      </div>

      {/* Respuesta o editor */}
      {duda.respuesta ? (
        <div className="mt-3 sm:mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 sm:p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 mb-1.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            Respuesta
          </div>
          <div className="text-gray-900 break-words whitespace-pre-wrap">{duda.respuesta}</div>
          <div className="text-xs text-gray-600 mt-2 flex items-center gap-2 flex-wrap">
            {duda.fecha_respuesta && (
              <>
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {new Date(duda.fecha_respuesta).toLocaleString()}
                </span>
                {responderName && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      {responderName}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        answering && (
          <div className="mt-3 sm:mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
            {error && (
              <div className="mb-2 text-red-700 bg-red-50 border border-red-300 p-2 rounded">{error}</div>
            )}
            <textarea
              className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-[#025a27]"
              rows={3}
              placeholder="Escribe tu respuesta..."
              value={respuesta}
              onChange={(e) => setRespuesta(e.target.value)}
            />
            <div className="mt-3 flex gap-2 sm:justify-end">
              <button
                onClick={responder}
                disabled={busy || !respuesta.trim()}
                className="px-4 py-2 rounded-md text-white font-semibold disabled:opacity-50"
                style={{ backgroundColor: busy ? '#9ca3af' : '#025a27' }}
              >
                Enviar respuesta
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

