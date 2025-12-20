import React from 'react';

const Paginacion = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  totalItemsOriginal = null,
  itemName = 'elementos'
}) => {
  // Si solo hay una página o no hay items, no mostrar paginación
  if (totalPages <= 1) return null;

  // Cálculos para mostrar "Mostrando X a Y de Z"
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const showingTo = Math.min(indexOfLastItem, totalItems);

  // Funciones de navegación
  const prevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-4 border-t border-gray-200 w-full">
      <div className="text-sm text-gray-700 mb-4 sm:mb-0">
        Mostrando {indexOfFirstItem + 1} a {showingTo} de {totalItems} {itemName}
        {totalItemsOriginal !== null && totalItems !== totalItemsOriginal && (
          <span className="text-gray-500"> (de {totalItemsOriginal} total)</span>
        )}
      </div>
      
      <div className="flex items-center space-x-2 max-w-full">
        <button
          onClick={prevPage}
          disabled={currentPage === 1}
          className="flex-shrink-0 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          aria-label="Anterior"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex space-x-1 overflow-x-auto max-w-[200px] sm:max-w-none px-1 pb-1 sm:pb-0 scrollbar-hide">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 whitespace-nowrap ${
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
          className="flex-shrink-0 px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
           aria-label="Siguiente"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Paginacion;
