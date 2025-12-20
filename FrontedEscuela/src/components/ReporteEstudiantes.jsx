import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Componente y funciones para exportar reporte de estudiantes en PDF y Excel
 */

/**
 * Obtiene el nombre de una institución por su ID
 */
const getInstitucionNombre = (instituciones, institucionId) => {
  const institucion = instituciones.find(i => i.ID === institucionId);
  return institucion ? institucion.nombre : 'N/A';
};

/**
 * Obtiene el nombre de una ciudad por su ID
 */
const getCiudadNombre = (ciudades, ciudadId) => {
  const ciudad = ciudades.find(c => c.ID === ciudadId);
  return ciudad ? ciudad.ciudad : 'N/A';
};

/**
 * Exporta la lista de estudiantes a un archivo PDF
 * @param {Array} estudiantes - Lista de estudiantes a exportar
 * @param {Array} instituciones - Lista de instituciones para obtener nombres
 * @param {Array} ciudades - Lista de ciudades para obtener nombres
 */
export const exportarEstudiantesPDF = (estudiantes, instituciones, ciudades) => {
  // Crear documento PDF en orientación horizontal para más espacio
  const doc = new jsPDF('landscape', 'mm', 'a4');
  
  // Colores institucionales
  const colorPrimario = [2, 90, 39]; // #025a27
  
  // Título del documento
  doc.setFontSize(20);
  doc.setTextColor(...colorPrimario);
  doc.text('Reporte de Estudiantes', 14, 20);
  
  // Fecha de generación
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const fecha = new Date().toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Generado el: ${fecha}`, 14, 28);
  doc.text(`Total de estudiantes: ${estudiantes.length}`, 14, 34);
  
  // Preparar datos para la tabla
  const datosTabla = estudiantes.map((estudiante, index) => [
    index + 1,
    estudiante.persona?.cedula || 'N/A',
    estudiante.persona?.nombre || 'N/A',
    estudiante.persona?.correo || 'N/A',
    estudiante.persona?.telefono || 'N/A',
    estudiante.persona?.fecha_nacimiento 
      ? new Date(estudiante.persona.fecha_nacimiento).toLocaleDateString('es-EC') 
      : 'N/A',
    getInstitucionNombre(instituciones, estudiante.institucion_id),
    getCiudadNombre(ciudades, estudiante.ciudad_id),
    estudiante.especialidad || 'N/A',
    estudiante.DeletedAt ? 'Inactivo' : 'Activo'
  ]);
  
  // Generar tabla con autoTable
  autoTable(doc, {
    startY: 40,
    head: [[
      '#',
      'Cédula',
      'Nombre',
      'Correo',
      'Teléfono',
      'F. Nacimiento',
      'Institución',
      'Ciudad',
      'Especialidad',
      'Estado'
    ]],
    body: datosTabla,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: colorPrimario,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [240, 248, 245]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 22 },
      2: { cellWidth: 40 },
      3: { cellWidth: 40 },
      4: { cellWidth: 22 },
      5: { cellWidth: 22 },
      6: { cellWidth: 45 },
      7: { cellWidth: 25 },
      8: { cellWidth: 30 },
      9: { halign: 'center', cellWidth: 18 }
    },
    didDrawCell: (data) => {
      // Colorear el estado según su valor
      if (data.section === 'body' && data.column.index === 9) {
        const estado = data.cell.raw;
        if (estado === 'Activo') {
          doc.setTextColor(22, 163, 74); // Verde
        } else {
          doc.setTextColor(220, 38, 38); // Rojo
        }
      }
    },
    didParseCell: (data) => {
      // Colorear el badge de estado
      if (data.section === 'body' && data.column.index === 9) {
        const estado = data.cell.raw;
        if (estado === 'Activo') {
          data.cell.styles.textColor = [22, 163, 74];
        } else {
          data.cell.styles.textColor = [220, 38, 38];
        }
      }
    }
  });
  
  // Pie de página
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Guardar archivo
  const fechaArchivo = new Date().toISOString().split('T')[0];
  doc.save(`reporte_estudiantes_${fechaArchivo}.pdf`);
};

/**
 * Exporta la lista de estudiantes a un archivo Excel
 * Usa el mismo formato de encabezados que GeneracionFormatoExcel.jsx
 * @param {Array} estudiantes - Lista de estudiantes a exportar
 * @param {Array} instituciones - Lista de instituciones para obtener nombres
 * @param {Array} ciudades - Lista de ciudades para obtener nombres
 */
export const exportarEstudiantesExcel = async (estudiantes, instituciones, ciudades) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema Escuela';
  workbook.created = new Date();
  
  // HOJA 1: Estudiantes
  const wsEstudiantes = workbook.addWorksheet('Estudiantes');
  
  // Definir columnas con encabezados (mismo formato que GeneracionFormatoExcel.jsx)
  wsEstudiantes.columns = [
    { header: 'Cédula', key: 'cedula', width: 15 },
    { header: 'Nombre', key: 'nombre', width: 35 },
    { header: 'Correo', key: 'correo', width: 30 },
    { header: 'Teléfono', key: 'telefono', width: 15 },
    { header: 'Fecha Nacimiento', key: 'fecha_nacimiento', width: 18 },
    { header: 'Institución', key: 'institucion', width: 40 },
    { header: 'Ciudad', key: 'ciudad', width: 25 },
    { header: 'Especialidad', key: 'especialidad', width: 25 },
    { header: 'Estado', key: 'estado', width: 15 }
  ];
  
  // Estilo para encabezados (fila 1) - Mismo estilo que GeneracionFormatoExcel.jsx
  const headerRow = wsEstudiantes.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF025A27' } // Color verde institucional
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
  
  // Agregar datos de estudiantes
  estudiantes.forEach((estudiante) => {
    const row = wsEstudiantes.addRow({
      cedula: estudiante.persona?.cedula || '',
      nombre: estudiante.persona?.nombre || '',
      correo: estudiante.persona?.correo || '',
      telefono: estudiante.persona?.telefono || '',
      fecha_nacimiento: estudiante.persona?.fecha_nacimiento 
        ? new Date(estudiante.persona.fecha_nacimiento)
        : '',
      institucion: getInstitucionNombre(instituciones, estudiante.institucion_id),
      ciudad: getCiudadNombre(ciudades, estudiante.ciudad_id),
      especialidad: estudiante.especialidad || '',
      estado: estudiante.DeletedAt ? 'Inactivo' : 'Activo'
    });
    
    // Aplicar bordes a cada celda de datos
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
      };
    });
    
    // Colorear la columna de estado según el valor
    const estadoCell = row.getCell('estado');
    if (estudiante.DeletedAt) {
      estadoCell.font = { color: { argb: 'FFDC2626' }, bold: true }; // Rojo
      estadoCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFEE2E2' }
      };
    } else {
      estadoCell.font = { color: { argb: 'FF16A34A' }, bold: true }; // Verde
      estadoCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDCFCE7' }
      };
    }
    estadoCell.alignment = { horizontal: 'center' };
  });
  
  // Generar archivo y descargar
  const fecha = new Date().toISOString().split('T')[0];
  const nombreArchivo = `reporte_estudiantes_${fecha}.xlsx`;
  
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  saveAs(blob, nombreArchivo);
};

/**
 * Componente modal para exportar estudiantes
 */
const ReporteEstudiantes = ({ 
  isOpen, 
  onClose, 
  estudiantes = [], 
  instituciones = [], 
  ciudades = [] 
}) => {
  
  const handleExportPDF = () => {
    exportarEstudiantesPDF(estudiantes, instituciones, ciudades);
    onClose();
  };
  
  const handleExportExcel = async () => {
    await exportarEstudiantesExcel(estudiantes, instituciones, ciudades);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all scale-100">
        {/* Header del modal */}
        <div 
          className="px-6 py-4 border-b border-gray-200 flex justify-between items-center rounded-t-2xl" 
          style={{ backgroundColor: '#025a27' }}
        >
          <h3 className="text-lg font-bold text-white flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar Estudiantes
          </h3>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Contenido del modal */}
        <div className="p-6">
          <p className="text-gray-600 mb-6 text-center">
            Seleccione el formato en el que desea exportar el reporte de <strong>{estudiantes.length}</strong> estudiantes.
          </p>
          
          <div className="space-y-3">
            {/* Botón Exportar en PDF */}
            <button
              onClick={handleExportPDF}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all duration-200 group"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-500 text-white group-hover:scale-110 transition-transform duration-200">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10.92,12.31C10.68,11.54 10.15,9.08 11.55,9.04C12.95,9 12.03,12.16 12.03,12.16C12.42,13.65 14.05,14.72 14.05,14.72C14.55,14.57 17.4,14.24 17,15.72C16.57,17.2 13.5,15.81 13.5,15.81C11.55,15.95 10.09,16.47 10.09,16.47C8.96,18.58 7.64,19.5 7.1,18.61C6.43,17.5 9.23,16.07 9.23,16.07C10.68,13.72 10.9,12.35 10.92,12.31Z" />
                </svg>
              </div>
              <div className="text-left">
                <span className="block font-bold text-red-700 text-lg">Exportar en PDF</span>
                <span className="text-sm text-red-500">Documento portable (.pdf)</span>
              </div>
            </button>
            
            {/* Botón Exportar en Excel */}
            <button
              onClick={handleExportExcel}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl border-2 border-green-200 bg-green-50 hover:bg-green-100 hover:border-green-300 transition-all duration-200 group"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-green-600 text-white group-hover:scale-110 transition-transform duration-200">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M12.9,14.5L15.8,19H14L12,15.6L10,19H8.2L11.1,14.5L8.2,10H10L12,13.4L14,10H15.8L12.9,14.5Z" />
                </svg>
              </div>
              <div className="text-left">
                <span className="block font-bold text-green-700 text-lg">Exportar en Excel</span>
                <span className="text-sm text-green-500">Hoja de cálculo (.xlsx)</span>
              </div>
            </button>
          </div>
        </div>
        
        {/* Footer del modal */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200 font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReporteEstudiantes;
