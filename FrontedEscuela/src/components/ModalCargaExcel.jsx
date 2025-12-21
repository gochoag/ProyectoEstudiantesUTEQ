import { useState } from 'react';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import api from '../api/client';
import { validarCedulaEcuatoriana } from '../utils/validaciones';

const ModalCargaExcel = ({ isOpen, onClose, onSuccess, onError, instituciones = [], ciudades = [], estudiantes = [] }) => {
  const [excelStep, setExcelStep] = useState('upload');
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
  const [generatingFormat, setGeneratingFormat] = useState(false);

  const generarFormatoExcel = async () => {
    setGeneratingFormat(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistema Escuela';
      workbook.created = new Date();
      
      const nombresInstituciones = instituciones.map(i => i.nombre);
      const nombresCiudades = ciudades.map(c => c.nombre || c.ciudad);
      
      const wsEstudiantes = workbook.addWorksheet('Estudiantes');
      
      wsEstudiantes.columns = [
        { header: 'Cédula', key: 'cedula', width: 15 },
        { header: 'Nombre', key: 'nombre', width: 35 },
        { header: 'Correo', key: 'correo', width: 30 },
        { header: 'Teléfono', key: 'telefono', width: 15 },
        { header: 'Fecha Nacimiento', key: 'fecha_nacimiento', width: 18 },
        { header: 'Institución', key: 'institucion', width: 40 },
        { header: 'Ciudad', key: 'ciudad', width: 25 },
        { header: 'Especialidad', key: 'especialidad', width: 25 }
      ];
      
      const headerRow = wsEstudiantes.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF025A27' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
      });
      headerRow.height = 25;
      
      wsEstudiantes.getColumn('A').numFmt = '@';
      wsEstudiantes.getColumn('D').numFmt = '@';
      wsEstudiantes.getColumn('E').numFmt = 'dd/mm/yyyy';
      
      for (let i = 0; i < 100; i++) { wsEstudiantes.addRow({}); }
      
      const wsDatos = workbook.addWorksheet('Datos');
      wsDatos.columns = [
        { header: 'Instituciones', key: 'instituciones', width: 50 },
        { header: 'Ciudades', key: 'ciudades', width: 30 }
      ];
      
      const headerRowDatos = wsDatos.getRow(1);
      headerRowDatos.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        cell.alignment = { horizontal: 'center' };
      });
      
      const maxLength = Math.max(nombresInstituciones.length, nombresCiudades.length);
      for (let i = 0; i < maxLength; i++) {
        wsDatos.addRow({ instituciones: nombresInstituciones[i] || '', ciudades: nombresCiudades[i] || '' });
      }
      
      if (nombresInstituciones.length > 0) {
        for (let row = 2; row <= 101; row++) {
          wsEstudiantes.getCell(`F${row}`).dataValidation = {
            type: 'list', allowBlank: true, formulae: [`Datos!$A$2:$A$${nombresInstituciones.length + 1}`], showDropDown: true
          };
        }
      }
      
      if (nombresCiudades.length > 0) {
        for (let row = 2; row <= 101; row++) {
          wsEstudiantes.getCell(`G${row}`).dataValidation = {
            type: 'list', allowBlank: true, formulae: [`Datos!$B$2:$B$${nombresCiudades.length + 1}`], showDropDown: true
          };
        }
      }
      
      const fecha = new Date().toISOString().split('T')[0];
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `formato_estudiantes_${fecha}.xlsx`);
    } catch (err) {
      console.error('Error al generar formato:', err);
      setLocalError('Error al generar el formato Excel');
    } finally {
      setGeneratingFormat(false);
    }
  };

  const handleExcelUpload = (file) => {
    setExcelFile(file);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          setLocalError('El archivo Excel debe tener al menos una fila de encabezados y una fila de datos');
          return;
        }
        
        const headers = jsonData[0].map((h, i) => ({ index: i, name: String(h || `Columna ${i + 1}`) }));
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
  
  const handleMappingSubmit = async () => {
    if (!columnMapping.cedula || !columnMapping.nombre || !columnMapping.institucion_id || !columnMapping.ciudad_id || !columnMapping.correo) {
      setLocalError('Debe mapear al menos: Cédula, Nombre, Institución, Ciudad y Correo');
      return;
    }
    
    setProcessingBulk(true);
    setLocalError('');
    
    try {
      const correoIndexMap = {};
      const correoColIndex = parseInt(columnMapping.correo, 10);
      
      excelData.forEach((row, index) => {
        const correo = String(row[correoColIndex] || '').trim().toLowerCase();
        if (correo) {
          if (!correoIndexMap[correo]) {
            correoIndexMap[correo] = [];
          }
          correoIndexMap[correo].push(index + 2);
        }
      });
      
      const correosExistentes = new Set(
        estudiantes
          .filter(e => e.persona?.correo)
          .map(e => e.persona.correo.toLowerCase().trim())
      );
      
      const cedulaIndexMap = {};
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
      
      const cedulasExistentes = new Set(
        estudiantes
          .filter(e => e.persona?.cedula)
          .map(e => String(e.persona.cedula).trim().replace(/\D/g, ''))
      );
      
      const estudiantesData = excelData.map((row, rowIndex) => {
        const getCell = (key) => {
          const mapping = columnMapping[key];
          if (mapping === '') return '';
          const colIndex = parseInt(mapping, 10);
          return String(row[colIndex] || '').trim();
        };
        
        const convertirFecha = (fechaStr) => {
          if (!fechaStr || String(fechaStr).trim() === '') return '';
          
          const fecha = String(fechaStr).trim();
          
          if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
            return fecha;
          }
          
          const matchDMY = fecha.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (matchDMY) {
            const [, dia, mes, anio] = matchDMY;
            return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
          }
          
          if (/^\d+$/.test(fecha) || /^\d+\.\d+$/.test(fecha)) {
            const diasExcel = parseFloat(fecha);
            const milisegundosPorDia = 24 * 60 * 60 * 1000;
            const fechaBase = Date.UTC(1899, 11, 30);
            const fechaMs = fechaBase + diasExcel * milisegundosPorDia;
            const fechaDate = new Date(fechaMs);
            
            const anio = fechaDate.getUTCFullYear();
            const mes = String(fechaDate.getUTCMonth() + 1).padStart(2, '0');
            const dia = String(fechaDate.getUTCDate()).padStart(2, '0');
            return `${anio}-${mes}-${dia}`;
          }
          
          const matchYMD = fecha.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
          if (matchYMD) {
            const [, anio, mes, dia] = matchYMD;
            return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
          }
          
          return fecha;
        };
        
        const esEmailValido = (email) => {
          if (!email || email.trim() === '') return false;
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email.trim());
        };
        
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
        
        const errores = [];
        const correo = getCell('correo');
        
        if (!correo || correo.trim() === '') {
          errores.push('El correo es obligatorio');
        } else if (!esEmailValido(correo)) {
          errores.push('El correo no tiene un formato válido');
        } else {
          const correoNormalizado = correo.trim().toLowerCase();
          
          const filasConEsteCorreo = correoIndexMap[correoNormalizado] || [];
          if (filasConEsteCorreo.length > 1) {
            const otrasFilas = filasConEsteCorreo.filter(f => f !== (rowIndex + 2));
            errores.push(`El correo está duplicado en el Excel (también en fila${otrasFilas.length > 1 ? 's' : ''} ${otrasFilas.join(', ')})`);
          }
          
          if (correosExistentes.has(correoNormalizado)) {
            errores.push('El correo ya está registrado en el sistema');
          }
        }
        
        if (!institucionNombreRaw || institucionNombreRaw.trim() === '') {
          errores.push('La institución es obligatoria');
        } else if (!institucionEncontrada) {
          errores.push(`Institución "${institucionNombreRaw}" no encontrada en el sistema`);
        }
        
        if (!ciudadNombreRaw || ciudadNombreRaw.trim() === '') {
          errores.push('La ciudad es obligatoria');
        } else if (!ciudadEncontrada) {
          errores.push(`Ciudad "${ciudadNombreRaw}" no encontrada en el sistema`);
        }
        
        const cedula = getCell('cedula');
        if (!cedula || cedula.trim() === '') {
          errores.push('La cédula es obligatoria');
        } else {
          const validacionCedula = validarCedulaEcuatoriana(cedula);
          if (!validacionCedula.esValida) {
            errores.push(validacionCedula.mensaje);
          } else {
            const cedulaNormalizada = String(cedula).trim().replace(/\D/g, '');
            
            const filasConEstaCedula = cedulaIndexMap[cedulaNormalizada] || [];
            if (filasConEstaCedula.length > 1) {
              const otrasFilas = filasConEstaCedula.filter(f => f !== (rowIndex + 2));
              errores.push(`La cédula está duplicada en el Excel (también en fila${otrasFilas.length > 1 ? 's' : ''} ${otrasFilas.join(', ')})`);
            }
            
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
          _erroresValidacion: errores
        };
      });
      
      const filasValidas = [];
      const filasInvalidas = [];
      
      estudiantesData.forEach((estudiante, index) => {
        if (estudiante._erroresValidacion && estudiante._erroresValidacion.length > 0) {
          filasInvalidas.push({
            fila: index + 2,
            cedula: estudiante.cedula,
            nombre: estudiante.nombre,
            error: estudiante._erroresValidacion.join('; ')
          });
        } else {
          const { _erroresValidacion, ...estudianteLimpio } = estudiante;
          filasValidas.push({
            ...estudianteLimpio,
            _filaOriginal: index + 2
          });
        }
      });
      
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
      
      const response = await api.post('/api/estudiantes/bulk', { estudiantes: filasValidas });
      
      const exitososBackend = (response.data.exitosos || []).map(item => ({
        ...item,
        fila: item.fila || filasValidas.find(f => f.cedula === item.cedula)?._filaOriginal || item.fila
      }));
      
      const fallidosBackend = (response.data.fallidos || []).map(item => ({
        ...item,
        fila: item.fila || filasValidas.find(f => f.cedula === item.cedula)?._filaOriginal || item.fila
      }));
      
      const todosFallidos = [...filasInvalidas, ...fallidosBackend];
      
      setBulkResults({
        exitosos: exitososBackend,
        fallidos: todosFallidos,
        total: estudiantesData.length,
        total_exitosos: exitososBackend.length,
        total_fallidos: todosFallidos.length
      });
      
      setExcelStep('results');
      
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

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100" style={{ backgroundColor: '#025a27' }}>
          <h3 className="text-base sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Registro de estudiantes con Excel</span>
            <span className="sm:hidden">Carga Excel</span>
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="text-white hover:text-gray-200 focus:outline-none p-1"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="px-4 sm:px-6 py-2 text-xs text-gray-500 border-b border-gray-100 hidden sm:block">Importa estudiantes desde un archivo Excel (.xlsx, .xls)</p>
        
        {localError && (
          <div className="mx-4 sm:mx-6 mt-3 sm:mt-4 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg text-xs sm:text-sm text-red-700">
            {localError}
          </div>
        )}
        
        <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-start justify-center space-x-2 sm:space-x-4">
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              excelStep === 'upload' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-600'
            }`}>
              1
            </div>
            <span className="mt-1 text-xs text-gray-600 hidden sm:block">Cargar</span>
          </div>
          <div className={`flex-1 h-0.5 mt-3 sm:mt-4 max-w-[40px] sm:max-w-none ${excelStep !== 'upload' ? 'bg-green-600' : 'bg-gray-200'}`}></div>
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              excelStep === 'mapping' ? 'bg-green-600 text-white' : excelStep === 'results' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'
            }`}>
              2
            </div>
            <span className="mt-1 text-xs text-gray-600 hidden sm:block">Mapear</span>
          </div>
          <div className={`flex-1 h-0.5 mt-3 sm:mt-4 max-w-[40px] sm:max-w-none ${excelStep === 'results' ? 'bg-green-600' : 'bg-gray-200'}`}></div>
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
              excelStep === 'results' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
            }`}>
              3
            </div>
            <span className="mt-1 text-xs text-gray-600 hidden sm:block">Resultados</span>
          </div>
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 overflow-y-auto flex-1">
          {excelStep === 'upload' && (
            <div className="space-y-3 sm:space-y-4">
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg sm:rounded-xl p-4 sm:p-8 text-center hover:border-green-500 transition-colors cursor-pointer"
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
                <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2 text-xs sm:text-sm text-gray-600">Arrastra un archivo Excel aquí o haz clic para seleccionar</p>
                <p className="mt-1 text-xs text-gray-500">Extensiones: .xlsx, .xls</p>
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
                <div className="flex items-center p-2 sm:p-3 bg-green-50 rounded-lg border border-green-200">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs sm:text-sm text-green-700 truncate">{excelFile.name}</span>
                </div>
              )}
              
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={generarFormatoExcel}
                  disabled={generatingFormat}
                  className="text-xs sm:text-sm text-green-700 hover:text-green-800 font-medium inline-flex items-center gap-1 hover:underline"
                >
                  {generatingFormat ? (
                    <>
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Generando formato...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      ¿No tienes el formato? Descárgalo aquí
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {excelStep === 'mapping' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
                <p className="text-xs sm:text-sm text-blue-700">
                  <strong>Archivo:</strong> <span className="break-all">{excelFile?.name}</span> | <strong>Filas:</strong> {excelData.length}
                </p>
              </div>
              
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Selecciona qué columna corresponde a cada campo:</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Cédula <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={columnMapping.cedula}
                    onChange={(e) => setColumnMapping({ ...columnMapping, cedula: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- Seleccionar columna --</option>
                    {excelHeaders.map((h) => (
                      <option key={h.index} value={h.index}>{h.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={columnMapping.nombre}
                    onChange={(e) => setColumnMapping({ ...columnMapping, nombre: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- Seleccionar columna --</option>
                    {excelHeaders.map((h) => (
                      <option key={h.index} value={h.index}>{h.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Institución <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={columnMapping.institucion_id}
                    onChange={(e) => setColumnMapping({ ...columnMapping, institucion_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- Seleccionar columna --</option>
                    {excelHeaders.map((h) => (
                      <option key={h.index} value={h.index}>{h.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1 hidden sm:block">Nombre de la institución</p>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Ciudad <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={columnMapping.ciudad_id}
                    onChange={(e) => setColumnMapping({ ...columnMapping, ciudad_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- Seleccionar columna --</option>
                    {excelHeaders.map((h) => (
                      <option key={h.index} value={h.index}>{h.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1 hidden sm:block">Nombre de la ciudad</p>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Correo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={columnMapping.correo}
                    onChange={(e) => setColumnMapping({ ...columnMapping, correo: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- Seleccionar columna --</option>
                    {excelHeaders.map((h) => (
                      <option key={h.index} value={h.index}>{h.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1 hidden sm:block">Correo electrónico válido</p>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <select
                    value={columnMapping.telefono}
                    onChange={(e) => setColumnMapping({ ...columnMapping, telefono: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- No mapear --</option>
                    {excelHeaders.map((h) => (
                      <option key={h.index} value={h.index}>{h.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Fecha Nacimiento</label>
                  <select
                    value={columnMapping.fecha_nacimiento}
                    onChange={(e) => setColumnMapping({ ...columnMapping, fecha_nacimiento: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">-- No mapear --</option>
                    {excelHeaders.map((h) => (
                      <option key={h.index} value={h.index}>{h.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1 hidden sm:block">Formato: YYYY-MM-DD</p>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Especialidad</label>
                  <select
                    value={columnMapping.especialidad}
                    onChange={(e) => setColumnMapping({ ...columnMapping, especialidad: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
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

          {excelStep === 'results' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-4">
                <div className="bg-gray-50 rounded-lg p-2 sm:p-4 text-center">
                  <p className="text-lg sm:text-2xl font-bold text-gray-900">{bulkResults.total || 0}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2 sm:p-4 text-center">
                  <p className="text-lg sm:text-2xl font-bold text-green-600">{bulkResults.total_exitosos || 0}</p>
                  <p className="text-xs text-green-600">Exitosos</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2 sm:p-4 text-center">
                  <p className="text-lg sm:text-2xl font-bold text-red-600">{bulkResults.total_fallidos || 0}</p>
                  <p className="text-xs text-red-600">Fallidos</p>
                </div>
              </div>
              
              {bulkResults.fallidos && bulkResults.fallidos.length > 0 && (
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-red-700 mb-2">Registros con errores:</h4>
                  <div className="max-h-36 sm:max-h-48 overflow-auto border border-red-200 rounded-lg">
                    <div className="hidden sm:block">
                      <table className="w-full text-sm">
                        <thead className="bg-red-50 sticky top-0">
                          <tr>
                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-red-700">Fila</th>
                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-red-700">Cédula</th>
                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-red-700">Nombre</th>
                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-red-700">Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100">
                          {bulkResults.fallidos.map((item, idx) => (
                            <tr key={idx} className="hover:bg-red-50">
                              <td className="px-2 sm:px-3 py-2 text-red-600 text-xs">{item.fila}</td>
                              <td className="px-2 sm:px-3 py-2 text-gray-700 text-xs">{item.cedula || '-'}</td>
                              <td className="px-2 sm:px-3 py-2 text-gray-700 text-xs truncate max-w-[100px]">{item.nombre || '-'}</td>
                              <td className="px-2 sm:px-3 py-2 text-red-600 text-xs">{item.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="sm:hidden divide-y divide-red-100">
                      {bulkResults.fallidos.map((item, idx) => (
                        <div key={idx} className="p-2 text-xs">
                          <div className="flex justify-between mb-1">
                            <span className="text-red-600 font-medium">Fila {item.fila}</span>
                            <span className="text-gray-500">{item.cedula || '-'}</span>
                          </div>
                          <p className="text-gray-700 truncate">{item.nombre || '-'}</p>
                          <p className="text-red-600 mt-1">{item.error}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {bulkResults.exitosos && bulkResults.exitosos.length > 0 && (
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-green-700 mb-2">Registros exitosos:</h4>
                  <div className="max-h-36 sm:max-h-48 overflow-auto border border-green-200 rounded-lg">
                    <div className="hidden sm:block">
                      <table className="w-full text-sm">
                        <thead className="bg-green-50 sticky top-0">
                          <tr>
                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-green-700">Fila</th>
                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-green-700">Cédula</th>
                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-green-700">Nombre</th>
                            <th className="px-2 sm:px-3 py-2 text-left text-xs font-medium text-green-700">Usuario</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-green-100">
                          {bulkResults.exitosos.map((item, idx) => (
                            <tr key={idx} className="hover:bg-green-50">
                              <td className="px-2 sm:px-3 py-2 text-green-600 text-xs">{item.fila}</td>
                              <td className="px-2 sm:px-3 py-2 text-gray-700 text-xs">{item.cedula}</td>
                              <td className="px-2 sm:px-3 py-2 text-gray-700 text-xs truncate max-w-[100px]">{item.nombre}</td>
                              <td className="px-2 sm:px-3 py-2 text-green-600 font-mono text-xs">{item.usuario}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="sm:hidden divide-y divide-green-100">
                      {bulkResults.exitosos.map((item, idx) => (
                        <div key={idx} className="p-2 text-xs">
                          <div className="flex justify-between mb-1">
                            <span className="text-green-600 font-medium">Fila {item.fila}</span>
                            <span className="text-green-600 font-mono">{item.usuario}</span>
                          </div>
                          <p className="text-gray-700 truncate">{item.nombre}</p>
                          <p className="text-gray-500">{item.cedula}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 flex justify-between">
          {excelStep === 'mapping' && (
            <button
              onClick={() => {
                setExcelStep('upload');
                setExcelFile(null);
                setExcelData([]);
                setExcelHeaders([]);
                setLocalError('');
              }}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
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
            {excelStep === 'mapping' && (
              <button
                onClick={handleMappingSubmit}
                disabled={processingBulk || !columnMapping.cedula || !columnMapping.nombre || !columnMapping.institucion_id || !columnMapping.ciudad_id || !columnMapping.correo}
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5 sm:gap-2"
                style={{ backgroundColor: '#025a27' }}
              >
                {processingBulk ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="hidden sm:inline">Procesando...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="hidden sm:inline">Registrar Estudiantes</span>
                    <span className="sm:hidden">Registrar</span>
                  </>
                )}
              </button>
            )}
            
            {excelStep === 'results' && (
              <button
                onClick={handleClose}
                className="px-4 sm:px-6 py-2 text-sm text-white rounded-lg"
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
