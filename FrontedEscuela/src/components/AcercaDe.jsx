import React from 'react';
import imgNata from '../assets/fotos_desarrolladores/Nata.jpg';
import imgOchoa from '../assets/fotos_desarrolladores/Ochoa.jpg';
import imgGualpa from '../assets/fotos_desarrolladores/Gualpa.jpg';
import imgChica from '../assets/fotos_desarrolladores/Chica.jpg';

const DeveloperCard = ({ photo, name, role, email }) => {
  return (
    <div className="flex flex-row items-center bg-white rounded-lg shadow-md p-4 border border-gray-200 h-full">
      <div className="flex-shrink-0 mr-4">
        <img 
          src={photo} 
          alt={name} 
          className="w-16 h-16 object-cover rounded-full"
        />
      </div>
      <div className="flex-grow">
        <h4 className="font-bold text-gray-800 text-sm">{name}</h4>
        <p className="text-xs text-gray-600 font-medium">{role}</p>
        {email && <p className="text-xs text-gray-500">{email}</p>}
      </div>
    </div>
  );
};

const AcercaDe = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
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
        className="relative z-10 max-w-6xl w-11/12 bg-white rounded-2xl shadow-xl p-6 md:p-8 my-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h3 id="acercade-title" className="text-xl md:text-2xl font-bold text-gray-800">
            Equipo de Desarrollo
          </h3>
        </div>
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <DeveloperCard 
              photo={imgNata}
              name="NATA CASTRO DAISY JUDITH"
              role="Directora del Proyecto"
            />
            <DeveloperCard 
              photo={imgOchoa}
              name="GEOVANNY ALEXANDER OCHOA GILCES"
              role="Desarrollador Fullstack / Líder del Proyecto"
              email="geochoa212@gmail.com"
            />
            <DeveloperCard 
              photo={imgGualpa}
              name="JORGE STEVEN GUALPA GIA"
              role="Desarrollador Fullstack"
              email="stevengualpa@gmail.com"
            />
          </div>
          
          {/* Segunda fila - Desarrolladores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DeveloperCard 
              photo={imgChica}
              name="VALESKA SOFIA CHICA VALFRE"
              role="Desarrolladora Frontend"
              email="valeskasofiachica02@gmail.com"
            />
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Versión 1.0 · FCCDD · UTEQ
        </p>

        {/* Footer */}
        <div className="flex justify-end">
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

