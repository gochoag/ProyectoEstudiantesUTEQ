import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const GeneracionFormatoExcel = ({ instituciones = [], ciudades = [], onGenerated }) => {
  
  const generarExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Escuela';
    workbook.created = new Date();
    
    // Obtener nombres para las listas
    const nombresInstituciones = instituciones.map(i => i.nombre);
    const nombresCiudades = ciudades.map(c => c.nombre || c.ciudad);
    
    // HOJA 1: Estudiantes
    const wsEstudiantes = workbook.addWorksheet('Estudiantes');
    
    // Definir columnas con encabezados
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
    
    // Estilo para encabezados (fila 1)
    const headerRow = wsEstudiantes.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF025A27' }
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 12
      };
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    headerRow.height = 25;
    
    // Configurar formato de celdas para las columnas
    // Columna A (Cédula): Formato texto para evitar que Excel lo interprete como número
    wsEstudiantes.getColumn('A').numFmt = '@';
    // Columna D (Teléfono): Formato texto
    wsEstudiantes.getColumn('D').numFmt = '@';
    // Columna E (Fecha Nacimiento): Formato fecha corta
    wsEstudiantes.getColumn('E').numFmt = 'dd/mm/yyyy';
    
    // Agregar filas vacías para llenar
    for (let i = 0; i < 100; i++) {
      wsEstudiantes.addRow({});
    }
    
    // HOJA 2: Datos de referencia
    const wsDatos = workbook.addWorksheet('Datos');
    
    wsDatos.columns = [
      { header: 'Instituciones', key: 'instituciones', width: 50 },
      { header: 'Ciudades', key: 'ciudades', width: 30 }
    ];
    
    // Estilo para encabezados de hoja Datos
    const headerRowDatos = wsDatos.getRow(1);
    headerRowDatos.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true
      };
      cell.alignment = { horizontal: 'center' };
    });
    
    // Agregar datos de instituciones y ciudades
    const maxLength = Math.max(nombresInstituciones.length, nombresCiudades.length);
    for (let i = 0; i < maxLength; i++) {
      wsDatos.addRow({
        instituciones: nombresInstituciones[i] || '',
        ciudades: nombresCiudades[i] || ''
      });
    }
    
    // Configurar validación de datos para columna Institución (F2:F101)
    if (nombresInstituciones.length > 0) {
      for (let row = 2; row <= 101; row++) {
        wsEstudiantes.getCell(`F${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`Datos!$A$2:$A$${nombresInstituciones.length + 1}`],
          showDropDown: true,
          errorTitle: 'Institución inválida',
          error: 'Por favor seleccione una institución de la lista'
        };
      }
    }
    
    // Configurar validación de datos para columna Ciudad (G2:G101)
    if (nombresCiudades.length > 0) {
      for (let row = 2; row <= 101; row++) {
        wsEstudiantes.getCell(`G${row}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [`Datos!$B$2:$B$${nombresCiudades.length + 1}`],
          showDropDown: true,
          errorTitle: 'Ciudad inválida',
          error: 'Por favor seleccione una ciudad de la lista'
        };
      }
    }
    
    // Generar archivo y descargar
    const fecha = new Date().toISOString().split('T')[0];
    const nombreArchivo = `formato_estudiantes_${fecha}.xlsx`;
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, nombreArchivo);
    
    if (onGenerated) {
      onGenerated(nombreArchivo);
    }
  };

  return (
    <button
      onClick={generarExcel}
      className="inline-flex items-center text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5"
      style={{ backgroundColor: '#025a27' }}
      onMouseEnter={(e) => e.target.style.backgroundColor = '#014a1f'}
      onMouseLeave={(e) => e.target.style.backgroundColor = '#025a27'}
    >
      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Descargar Formato Excel
    </button>
  );
};

export default GeneracionFormatoExcel;
