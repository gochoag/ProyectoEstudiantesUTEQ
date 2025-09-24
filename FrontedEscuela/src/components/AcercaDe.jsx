import React from 'react';

const AcercaDe = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Fondo oscurecido */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Contenido del modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="acercade-title"
        className="relative z-10 max-w-lg w-11/12 md:w-[640px] bg-white rounded-2xl shadow-xl p-6 md:p-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h3 id="acercade-title" className="text-xl md:text-2xl font-bold text-gray-800">
            Acerca de
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="ml-4 text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Cerrar"
            title="Cerrar"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Texto descriptivo */}
        <div className="space-y-3 text-gray-700 leading-relaxed">
          <p>
            Este sistema facilita la gestión y visualización de información
            institucional para autoridades, docentes y estudiantes. Su objetivo es
            ofrecer una experiencia simple, clara y eficiente.
          </p>
          <p>
            Desde aquí podrás acceder a módulos de administración, consulta de datos
            y herramientas de apoyo académico. Si tienes preguntas o sugerencias,
            contáctanos con confianza.
          </p>
          <p className="text-sm text-gray-500">
            Versión 1.0 · FCCDD · UTEQ
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcercaDe;

