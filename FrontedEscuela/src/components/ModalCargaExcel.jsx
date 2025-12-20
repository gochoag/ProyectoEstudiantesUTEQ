import { useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../api/client';
import { validarCedulaEcuatoriana } from '../utils/validaciones';

const ModalCargaExcel = ({ isOpen, onClose, onSuccess, onError, instituciones = [], ciudades = [], estudiantes = [] }) => {
  // Estados internos del modal
  const [excelStep, setExcelStep] = useState('upload'); // 'upload', 'mapping', 'results'
  const [excelFile, setExcelFile] = useState(null);
  const [excelData, setExcelData] = useState([]);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    cedula: '',
    nombre: '',
    correo: '',
    telefono: '',
    fecha_nacimiento: '',
    institucion_id: '',
    ciudad_id: '',
    especialidad: ''
  });
  const [bulkResults, setBulkResults] = useState({ exitosos: [], fallidos: [] });
  const [processingBulk, setProcessingBulk] = useState(false);
  const [localError, setLocalError] = useState('');

  // Manejar la carga del archivo Excel
  const handleExcelUpload = (file) => {
    setExcelFile(file);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convertir a JSON con encabezados
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          setLocalError('El archivo Excel debe tener al menos una fila de encabezados y una fila de datos');
          return;
        }
        
        // Primera fila son los encabezados
        const headers = jsonData[0].map((h, i) => ({ index: i, name: String(h || `Columna ${i + 1}`) }));
        // El resto son los datos
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''));
        
        setExcelHeaders(headers);
        setExcelData(rows);
        setExcelStep('mapping');
        setLocalError('');
      } catch (err) {
        console.error('Error al leer Excel:', err);
        setLocalError('Error al leer el archivo Excel. Asegúrese de que sea un archivo válido.');
      }
    };
    
    reader.readAsArrayBuffer(file);
  };
  
  // Manejar el envío del mapeo y registrar estudiantes
  const handleMappingSubmit = async () => {
    // Validar que los campos obligatorios estén mapeados
    if (!columnMapping.cedula || !columnMapping.nombre || !columnMapping.institucion_id || !columnMapping.ciudad_id || !columnMapping.correo) {
      setLocalError('Debe mapear al menos: Cédula, Nombre, Institución, Ciudad y Correo');
      return;
    }
    
    setProcessingBulk(true);
    setLocalError('');
    
    try {
      // Crear mapa de correos del Excel para detectar duplicados internos
      const correoIndexMap = {}; // correo -> array de índices donde aparece
      const correoColIndex = parseInt(columnMapping.correo, 10);
      
      excelData.forEach((row, index) => {
        const correo = String(row[correoColIndex] || '').trim().toLowerCase();
        if (correo) {
          if (!correoIndexMap[correo]) {
            correoIndexMap[correo] = [];
          }
          correoIndexMap[correo].push(index + 2); // +2 porque fila 1 es encabezado
        }
      });
      
      // Crear Set de correos existentes en la base de datos (normalizados a minúsculas)
      const correosExistentes = new Set(
        estudiantes
          .filter(e => e.persona?.correo)
          .map(e => e.persona.correo.toLowerCase().trim())
      );
      
      // Crear mapa de cédulas del Excel para detectar duplicados internos
      const cedulaIndexMap = {}; // cedula -> array de índices donde aparece
      const cedulaColIndex = parseInt(columnMapping.cedula, 10);
      
      excelData.forEach((row, index) => {
        const cedula = String(row[cedulaColIndex] || '').trim().replace(/\D/g, '');
        if (cedula) {
          if (!cedulaIndexMap[cedula]) {
            cedulaIndexMap[cedula] = [];
          }
          cedulaIndexMap[cedula].push(index + 2); // +2 porque fila 1 es encabezado
        }
      });
      
      // Crear Set de cédulas existentes en la base de datos
      const cedulasExistentes = new Set(
        estudiantes
          .filter(e => e.persona?.cedula)
          .map(e => String(e.persona.cedula).trim().replace(/\D/g, ''))
      );
      
      // Preparar los datos mapeados
      const estudiantesData = excelData.map((row, rowIndex) => {
        const getCell = (key) => {
          const mapping = columnMapping[key];
          if (mapping === '') return '';
          const colIndex = parseInt(mapping, 10);
          return String(row[colIndex] || '').trim();
        };
        
        // Función para convertir fecha de varios formatos a YYYY-MM-DD
        const convertirFecha = (fechaStr) => {
          if (!fechaStr || String(fechaStr).trim() === '') return '';
          
          const fecha = String(fechaStr).trim();
          
          // Si ya está en formato YYYY-MM-DD, retornar como está
          if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return fecha;
          }
          
          // Formato DD/MM/YYYY o DD-MM-YYYY (más común en Ecuador/Latinoamérica)
          const matchDMY = fecha.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (matchDMY) {
            const [, dia, mes, anio] = matchDMY;
            return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
          }
          
          // Formato de número de Excel (días desde 1900-01-01)
          // Nota: Excel tiene un bug donde considera 1900 como año bisiesto, por eso restamos 2 días
          if (/^\d+$/.test(fecha) || /^\d+\.\d+$/.test(fecha)) {
            const diasExcel = parseFloat(fecha);
            // Excel epoch es 1 de enero de 1900, pero hay que ajustar por el bug del año bisiesto
            // y usamos UTC para evitar problemas de zona horaria
            const milisegundosPorDia = 24 * 60 * 60 * 1000;
            // Fecha base: 30 de diciembre de 1899 (para compensar el bug de Excel)
            const fechaBase = Date.UTC(1899, 11, 30);
            const fechaMs = fechaBase + diasExcel * milisegundosPorDia;
            const fechaDate = new Date(fechaMs);
            
            const anio = fechaDate.getUTCFullYear();
            const mes = String(fechaDate.getUTCMonth() + 1).padStart(2, '0');
            const dia = String(fechaDate.getUTCDate()).padStart(2, '0');
            return `${anio}-${mes}-${dia}`;
          }
          
          // Formato YYYY/MM/DD
          const matchYMD = fecha.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
          if (matchYMD) {
            const [, anio, mes, dia] = matchYMD;
            return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
          }
          
          // Si no se pudo convertir con los formatos conocidos, retornar el valor original
          // (el backend devolverá error si el formato no es válido)
          return fecha;
        };
        
        // Función para validar formato de email
        const esEmailValido = (email) => {
          if (!email || email.trim() === '') return false;
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email.trim());
        };
        
        // Buscar institución por nombre (case-insensitive, con normalización)
        const institucionNombreRaw = getCell('institucion_id');
        const institucionNombre = institucionNombreRaw.toLowerCase().trim().replace(/\s+/g, ' ');
        let institucionEncontrada = null;
        if (institucionNombre) {
          institucionEncontrada = instituciones.find(i => {
            const nombreInst = (i.nombre || '').toLowerCase().trim().replace(/\s+/g, ' ');
            return nombreInst === institucionNombre ||
                   nombreInst.includes(institucionNombre) ||
                   institucionNombre.includes(nombreInst);
          });
        }
        
        // Buscar ciudad por nombre (case-insensitive, con normalización)
        // Las ciudades usan el campo 'ciudad' para el nombre, no 'nombre'
        const ciudadNombreRaw = getCell('ciudad_id');
        const ciudadNombre = ciudadNombreRaw.toLowerCase().trim().replace(/\s+/g, ' ');
        let ciudadEncontrada = null;
        if (ciudadNombre) {
          ciudadEncontrada = ciudades.find(c => {
            const nombreCiudad = (c.ciudad || c.nombre || '').toLowerCase().trim().replace(/\s+/g, ' ');
            return nombreCiudad === ciudadNombre ||
                   nombreCiudad.includes(ciudadNombre) ||
                   ciudadNombre.includes(nombreCiudad);
          });
        }
        
        // Validaciones
        const errores = [];
        const correo = getCell('correo');
        
        // Validar correo obligatorio y formato válido
        if (!correo || correo.trim() === '') {
          errores.push('El correo es obligatorio');
        } else if (!esEmailValido(correo)) {
          errores.push('El correo no tiene un formato válido');
        } else {
          const correoNormalizado = correo.trim().toLowerCase();
          
          // Verificar si el correo está duplicado dentro del Excel
          const filasConEsteCorreo = correoIndexMap[correoNormalizado] || [];
          if (filasConEsteCorreo.length > 1) {
            const otrasFilas = filasConEsteCorreo.filter(f => f !== (rowIndex + 2));
            errores.push(`El correo está duplicado en el Excel (también en fila${otrasFilas.length > 1 ? 's' : ''} ${otrasFilas.join(', ')})`);
          }
          
          // Verificar si el correo ya existe en la base de datos
          if (correosExistentes.has(correoNormalizado)) {
            errores.push('El correo ya está registrado en el sistema');
          }
        }
        
        // Validar institución obligatoria y que exista
        if (!institucionNombreRaw || institucionNombreRaw.trim() === '') {
          errores.push('La institución es obligatoria');
        } else if (!institucionEncontrada) {
          errores.push(`Institución "${institucionNombreRaw}" no encontrada en el sistema`);
        }
        
        // Validar ciudad obligatoria y que exista
        if (!ciudadNombreRaw || ciudadNombreRaw.trim() === '') {
          errores.push('La ciudad es obligatoria');
        } else if (!ciudadEncontrada) {
          errores.push(`Ciudad "${ciudadNombreRaw}" no encontrada en el sistema`);
        }
        
        // Validar cédula obligatoria y formato ecuatoriano
        const cedula = getCell('cedula');
        if (!cedula || cedula.trim() === '') {
          errores.push('La cédula es obligatoria');
        } else {
          const validacionCedula = validarCedulaEcuatoriana(cedula);
          if (!validacionCedula.esValida) {
            errores.push(validacionCedula.mensaje);
          } else {
            // Si la cédula tiene formato válido, verificar duplicados
            const cedulaNormalizada = String(cedula).trim().replace(/\D/g, '');
            
            // Verificar si la cédula está duplicada dentro del Excel
            const filasConEstaCedula = cedulaIndexMap[cedulaNormalizada] || [];
            if (filasConEstaCedula.length > 1) {
              const otrasFilas = filasConEstaCedula.filter(f => f !== (rowIndex + 2));
              errores.push(`La cédula está duplicada en el Excel (también en fila${otrasFilas.length > 1 ? 's' : ''} ${otrasFilas.join(', ')})`);
            }
            
            // Verificar si la cédula ya existe en la base de datos
            if (cedulasExistentes.has(cedulaNormalizada)) {
              errores.push('La cédula ya está registrada en el sistema');
            }
          }
        }
        
        return {
          cedula: cedula,
          nombre: getCell('nombre'),
          correo: correo,
          telefono: getCell('telefono'),
          fecha_nacimiento: convertirFecha(getCell('fecha_nacimiento')),
          institucion_id: institucionEncontrada?.ID || institucionEncontrada?.id || 0,
          institucion_nombre_excel: institucionNombreRaw,
          ciudad_id: ciudadEncontrada?.ID || ciudadEncontrada?.id || 0,
          ciudad_nombre_excel: ciudadNombreRaw,
          especialidad: getCell('especialidad'),
          _erroresValidacion: errores // Campo interno para tracking de errores
        };
      });
      
      // Separar filas válidas de inválidas
      const filasValidas = [];
      const filasInvalidas = [];
      
      estudiantesData.forEach((estudiante, index) => {
        if (estudiante._erroresValidacion && estudiante._erroresValidacion.length > 0) {
          filasInvalidas.push({
            fila: index + 2, // +2 porque fila 1 es encabezado y los arrays empiezan en 0
            cedula: estudiante.cedula,
            nombre: estudiante.nombre,
            error: estudiante._erroresValidacion.join('; ')
          });
        } else {
          // Eliminar el campo interno antes de enviar al backend
          const { _erroresValidacion, ...estudianteLimpio } = estudiante;
          filasValidas.push({
            ...estudianteLimpio,
            _filaOriginal: index + 2 // Para tracking
          });
        }
      });
      
      // Si no hay filas válidas para enviar
      if (filasValidas.length === 0) {
        setBulkResults({
          exitosos: [],
          fallidos: filasInvalidas,
          total: estudiantesData.length,
          total_exitosos: 0,
          total_fallidos: filasInvalidas.length
        });
        setExcelStep('results');
        return;
      }
      
      // Enviar solo las filas válidas al backend
      const response = await api.post('/api/estudiantes/bulk', { estudiantes: filasValidas });
      
      // Combinar resultados del backend con las filas inválidas del frontend
      const exitososBackend = (response.data.exitosos || []).map(item => ({
        ...item,
        // Usar el número de fila original si está disponible
        fila: item.fila || filasValidas.find(f => f.cedula === item.cedula)?._filaOriginal || item.fila
      }));
      
      const fallidosBackend = (response.data.fallidos || []).map(item => ({
        ...item,
        fila: item.fila || filasValidas.find(f => f.cedula === item.cedula)?._filaOriginal || item.fila
      }));
      
      // Combinar fallidos del frontend (validación) con fallidos del backend
      const todosFallidos = [...filasInvalidas, ...fallidosBackend];
      
      setBulkResults({
        exitosos: exitososBackend,
        fallidos: todosFallidos,
        total: estudiantesData.length,
        total_exitosos: exitososBackend.length,
        total_fallidos: todosFallidos.length
      });
      
      setExcelStep('results');
      
      // Notificar éxito al padre solo si hubo registros exitosos
      if (onSuccess && exitososBackend.length > 0) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error al procesar carga masiva:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Error al procesar la carga masiva';
      setLocalError(errorMsg);
      if (onError) {
        onError(errorMsg);
      }
    } finally {
      setProcessingBulk(false);
    }
  };
  
  // Resetear el modal
  const resetModal = () => {
    setExcelStep('upload');
    setExcelFile(null);
    setExcelData([]);
    setExcelHeaders([]);
    setColumnMapping({
      cedula: '',
      nombre: '',
      correo: '',
      telefono: '',
      fecha_nacimiento: '',
      institucion_id: '',
      ciudad_id: '',
      especialidad: ''
    });
    setBulkResults({ exitosos: [], fallidos: [] });
    setLocalError('');
  };

  // Cerrar y resetear
  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Fondo oscurecido */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={handleClose}
      />

      {/* Contenido del modal */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-w-2xl w-11/12 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100" style={{ backgroundColor: '#025a27' }}>
          <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Registro de estudiantes con Excel
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-white hover:text-gray-200 focus:outline-none"
            aria-label="Cerrar"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="px-6 py-2 text-xs text-gray-500 border-b border-gray-100">Importa estudiantes desde un archivo Excel (.xlsx, .xls)</p>
        
        {/* Mensaje de error local */}
        {localError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {localError}
          </div>
        )}
        
        {/* Indicador de progreso */}
        <div className="px-6 py-4 flex items-center justify-center space-x-4">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              excelStep === 'upload' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-600'
            }`}>
              1
            </div>
            <span className="ml-2 text-xs text-gray-600">Cargar</span>
          </div>
          <div className={`flex-1 h-0.5 ${excelStep !== 'upload' ? 'bg-green-600' : 'bg-gray-200'}`}></div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              excelStep === 'mapping' ? 'bg-green-600 text-white' : excelStep === 'results' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
            <span className="ml-2 text-xs text-gray-600">Mapear</span>
          </div>
          <div className={`flex-1 h-0.5 ${excelStep === 'results' ? 'bg-green-600' : 'bg-gray-200'}`}></div>
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              excelStep === 'results' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              3
            </div>
            <span className="ml-2 text-xs text-gray-600">Resultados</span>
          </div>
        </div>

        {/* Contenido según fase */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {/* Fase 1: Cargar Excel */}
          {excelStep === 'upload' && (
            <div className="space-y-4">
              <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-500 transition-colors cursor-pointer"
                onClick={() => document.getElementById('excel-file-input').click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-green-500', 'bg-green-50'); }}
                onDragLeave={(e) => { e.currentTarget.classList.remove('border-green-500', 'bg-green-50'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-green-500', 'bg-green-50');
                  const file = e.dataTransfer.files[0];
                  if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                    handleExcelUpload(file);
                  } else {
                    setLocalError('Solo se permiten archivos Excel (.xlsx, .xls)');
                  }
                }}
              >
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">Arrastra un archivo Excel aquí o haz clic para seleccionar</p>
                <p className="mt-1 text-xs text-gray-500">Formatos aceptados: .xlsx, .xls</p>
              </div>
              <input
                id="excel-file-input"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                      setLocalError('');
                      handleExcelUpload(file);
                    } else {
                      setLocalError('Solo se permiten archivos Excel (.xlsx, .xls). Por favor, seleccione un archivo válido.');
                      e.target.value = ''; // Limpiar el input
                    }
                  }
                }}
              />
              
              {excelFile && (
                <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-green-700">{excelFile.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Fase 2: Mapeo de columnas */}
          {excelStep === 'mapping' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700">
                  <strong>Archivo:</strong> {excelFile?.name} | <strong>Filas:</strong> {excelData.length}
                </p>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">Selecciona qué columna del Excel corresponde a cada campo:</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cédula - Requerido */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cédula <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={columnMapping.cedula}
                    onChange={(e) => setColumnMapping({ ...columnMapping, cedula: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- Seleccionar columna --</option>
                    {excelHeaders.map((h) => (
                      <option key={h.index} value={h.index}>{h.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Nombre - Requerido */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={columnMapping.nombre}
                    onChange={(e) => setColumnMapping({ ...columnMapping, nombre: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- Seleccionar columna --</option>
                    {excelHeaders.map((h) => (
                      <option key={h.index} value={h.index}>{h.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Institución */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Institución <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={columnMapping.institucion_id}
                    onChange={(e) => setColumnMapping({ ...columnMapping, institucion_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- Seleccionar columna --</option>
                    {excelHeaders.map((h) => (
                      <option key={h.index} value={h.index}>{h.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">El nombre de la institución (se buscará automáticamente)</p>
                </div>
                
                {/* Ciudad */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={columnMapping.ciudad_id}
                    onChange={(e) => setColumnMapping({ ...columnMapping, ciudad_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- Seleccionar columna --</option>
                    {excelHeaders.map((h) => (
                      <option key={h.index} value={h.index}>{h.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">El nombre de la ciudad (se buscará automáticamente)</p>
                </div>
                
                {/* Correo - Obligatorio en carga masiva */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={columnMapping.correo}
                    onChange={(e) => setColumnMapping({ ...columnMapping, correo: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- Seleccionar columna --</option>
                    {excelHeaders.map((h) => (
                      <option key={h.index} value={h.index}>{h.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Debe ser un correo electrónico válido</p>
                </div>
                
                {/* Teléfono - Opcional */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <select
                    value={columnMapping.telefono}
                    onChange={(e) => setColumnMapping({ ...columnMapping, telefono: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- No mapear --</option>
                    {excelHeaders.map((h) => (
                      <option key={h.index} value={h.index}>{h.name}</option>
                    ))}
                  </select>
                </div>
                
                {/* Fecha de nacimiento - Opcional */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Nacimiento</label>
                  <select
                    value={columnMapping.fecha_nacimiento}
                    onChange={(e) => setColumnMapping({ ...columnMapping, fecha_nacimiento: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- No mapear --</option>
                    {excelHeaders.map((h) => (
                      <option key={h.index} value={h.index}>{h.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Formato: YYYY-MM-DD</p>
                </div>
                
                {/* Especialidad - Opcional */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                  <select
                    value={columnMapping.especialidad}
                    onChange={(e) => setColumnMapping({ ...columnMapping, especialidad: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- No mapear --</option>
                    {excelHeaders.map((h) => (
                      <option key={h.index} value={h.index}>{h.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Fase 3: Resultados */}
          {excelStep === 'results' && (
            <div className="space-y-4">
              {/* Resumen */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{bulkResults.total || 0}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{bulkResults.total_exitosos || 0}</p>
                  <p className="text-xs text-green-600">Exitosos</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{bulkResults.total_fallidos || 0}</p>
                  <p className="text-xs text-red-600">Fallidos</p>
                </div>
              </div>
              
              {/* Lista de fallidos */}
              {bulkResults.fallidos && bulkResults.fallidos.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-700 mb-2">Registros con errores:</h4>
                  <div className="max-h-48 overflow-y-auto border border-red-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-red-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-red-700">Fila</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-red-700">Cédula</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-red-700">Nombre</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-red-700">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100">
                        {bulkResults.fallidos.map((item, idx) => (
                          <tr key={idx} className="hover:bg-red-50">
                            <td className="px-3 py-2 text-red-600">{item.fila}</td>
                            <td className="px-3 py-2 text-gray-700">{item.cedula || '-'}</td>
                            <td className="px-3 py-2 text-gray-700">{item.nombre || '-'}</td>
                            <td className="px-3 py-2 text-red-600">{item.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Lista de exitosos */}
              {bulkResults.exitosos && bulkResults.exitosos.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-700 mb-2">Registros exitosos:</h4>
                  <div className="max-h-48 overflow-y-auto border border-green-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-green-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-green-700">Fila</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-green-700">Cédula</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-green-700">Nombre</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-green-700">Usuario</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-green-100">
                        {bulkResults.exitosos.map((item, idx) => (
                          <tr key={idx} className="hover:bg-green-50">
                            <td className="px-3 py-2 text-green-600">{item.fila}</td>
                            <td className="px-3 py-2 text-gray-700">{item.cedula}</td>
                            <td className="px-3 py-2 text-gray-700">{item.nombre}</td>
                            <td className="px-3 py-2 text-green-600 font-mono">{item.usuario}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer con botones */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between">
          {excelStep === 'mapping' && (
            <button
              onClick={() => {
                setExcelStep('upload');
                setExcelFile(null);
                setExcelData([]);
                setExcelHeaders([]);
                setLocalError('');
              }}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Volver
            </button>
          )}
          
          {excelStep === 'upload' && (
            <div></div>
          )}
          
          {excelStep === 'results' && (
            <div></div>
          )}
          
          <div className="flex gap-2">
            {excelStep !== 'results' && (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
            )}
            
            {excelStep === 'mapping' && (
              <button
                onClick={handleMappingSubmit}
                disabled={processingBulk || !columnMapping.cedula || !columnMapping.nombre || !columnMapping.institucion_id || !columnMapping.ciudad_id || !columnMapping.correo}
                className="px-4 py-2 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: '#025a27' }}
              >
                {processingBulk ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Procesando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Registrar Estudiantes
                  </>
                )}
              </button>
            )}
            
            {excelStep === 'results' && (
              <button
                onClick={handleClose}
                className="px-4 py-2 text-white rounded-lg"
                style={{ backgroundColor: '#025a27' }}
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModalCargaExcel;
