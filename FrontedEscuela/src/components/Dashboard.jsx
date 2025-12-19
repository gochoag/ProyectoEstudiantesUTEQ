import { useState, useEffect } from 'react';
// Cliente API centralizado: los componentes lo usan directamente
import api from '../api/client';
import { clearAuthData } from '../utils/auth';
import EstudiantesManager from './EstudiantesManager';
import SystemConfig from './SystemConfig';
import InstitucionesManager from './InstitucionesManager';
import UsuariosManager from './UsuariosManager';
import TematicasManager from './TematicasManager';
import ActividadesManager from './ActividadesManager';
import ProgramasVisitaManager from './ProgramasVisitaManager';
import AutoridadesManager from './AutoridadesManager';
import BancoDudas from './BancoDudas';
import NoticiasManager from './NoticiasManager';
import Profile from './Profile';
import ComunicadosManager from './ComunicadosManager';

// Importar imágenes QR
import qrComunikids from '../assets/qr_apps_uteq/qr_comunikids.png';
import qrMoneyGame from '../assets/qr_apps_uteq/qr_moneygame.png';
import qrPetFriend from '../assets/qr_apps_uteq/qr_petfriend.png';
import qrInfoSoftw from '../assets/qr_info_softw/qr_info_softw.png';
import qrFacebook from '../assets/qr_redes_sociales_uteq/qr_facebook.png';
import qrInstagram from '../assets/qr_redes_sociales_uteq/qr_instagram.png';
import qrTiktok from '../assets/qr_redes_sociales_uteq/qr_tiktok.png';
import qrYoutube from '../assets/qr_redes_sociales_uteq/qr_youtube.png';

const Dashboard = ({ usuario, onLogout }) => {
  // Recuperar la vista actual del localStorage o usar 'home' como default
  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('currentView') || 'home';
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Estados para los carruseles
  const [currentAppsIndex, setCurrentAppsIndex] = useState(0);
  const [currentSoftwIndex, setCurrentSoftwIndex] = useState(0);
  const [currentSocialIndex, setCurrentSocialIndex] = useState(0);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

  // Estado para las noticias reales
  const [newsData, setNewsData] = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [selectedNews, setSelectedNews] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Función para cargar noticias reales
  const loadNews = async () => {
    try {
      setNewsLoading(true);
      const response = await api.get('/api/noticias');
      const noticias = (response.data.success ? response.data.data : response.data) || [];

      // Transformar las noticias para el formato esperado por el carrusel
      const transformedNews = noticias.map(noticia => {
        const mediaUrl = noticia.url_noticia ? buildMediaUrl(noticia.url_noticia) : null;

        return {
          id: noticia.id,
          title: noticia.titulo,
          content: noticia.descripcion,
          date: noticia.created_at || noticia.updated_at,
          mediaUrl: mediaUrl,
          mediaType: noticia.url_noticia ? getMediaType(noticia.url_noticia) : 'none'
        };
      });

      setNewsData(transformedNews);

      // Si hay noticias, mostrar la primera (más reciente)
      if (transformedNews.length > 0) {
        setCurrentNewsIndex(0);
      }
    } catch (error) {
      console.error('Error al cargar noticias:', error);
      // En caso de error, mantener array vacío
      setNewsData([]);
    } finally {
      setNewsLoading(false);
    }
  };

  // Función para construir la URL completa del media
  const buildMediaUrl = (url) => {
    if (!url) return null;

    // Si ya es una URL completa, devolverla tal como está
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Si empieza con /, agregar la base URL
    if (url.startsWith('/')) {
      return `https://apiescuela.onrender.com${url}`;
    }

    // Si es una ruta relativa, construir la URL completa
    return `https://apiescuela.onrender.com/${url}`;
  };

  // Función para determinar el tipo de archivo multimedia
  const getMediaType = (url) => {
    if (!url) return 'none';

    const imageExtensions = /\.(jpg|jpeg|png|gif|webp)$/i;
    const videoExtensions = /\.(mp4|avi|mov|wmv|webm)$/i;

    if (imageExtensions.test(url)) return 'image';
    if (videoExtensions.test(url)) return 'video';
    return 'none';
  };

  // Función para verificar permisos basados en el tipo de usuario
  const hasPermission = (menuId) => {
    const userType = usuario?.tipo_usuario?.nombre?.toLowerCase();

    // Administrador: Acceso total
    if (userType === 'administrador') {
      return true;
    }

    // CoAdministrador: Acceso a todo menos Usuarios
    if (userType === 'coadministrador') {
      return menuId !== 'usuarios';
    }

    // Estudiante: Solo Home, Dudas y Perfil
    if (userType === 'estudiante') {
      return ['home', 'dudas', 'profile'].includes(menuId);
    }

    // Por defecto, no hay acceso
    return false;
  };

  // Datos para los carruseles
  const appsData = [
    {
      id: 1,
      name: 'ComuniKids',
      image: qrComunikids,
      description: 'Aplicación educativa para comunicación infantil',
      url: 'https://play.google.com/store/apps/details?id=com.appvinculacion'
    },
    {
      id: 2,
      name: 'MoneyGame',
      image: qrMoneyGame,
      description: 'Juego educativo sobre manejo financiero',
      url: 'https://play.google.com/store/apps/details?id=com.DefaultCompany.MoneyGame&pli=1'
    },
    {
      id: 3,
      name: 'PetFriend',
      image: qrPetFriend,
      description: 'Aplicación para el cuidado de mascotas virtuales',
      url: 'https://play.google.com/store/apps/details?id=com.UTEQ.PetFriend21'
    }
  ];

  const softwData = [
    {
      id: 1,
      name: 'Ingeniería en Software',
      image: qrInfoSoftw,
      description: 'Información sobre desarrollo de software en UTEQ',
      url: 'https://www.uteq.edu.ec/es/grado/carrera/software'
    }
  ];

  const socialData = [
    {
      id: 1,
      name: 'Facebook UTEQ',
      image: qrFacebook,
      description: 'Síguenos en Facebook',
      url: 'https://m.facebook.com/@fccdduteq/?locale=es_LA&wtsid=rdr_0j1cw9R4SYPr9JCY3&hr=1'
    },
    {
      id: 2,
      name: 'Instagram UTEQ',
      image: qrInstagram,
      description: 'Síguenos en Instagram',
      url: 'https://www.instagram.com/fccdd_uteq?igsh=dGhpcG53aWZmb2xx'
    },
    {
      id: 3,
      name: 'TikTok UTEQ',
      image: qrTiktok,
      description: 'Síguenos en TikTok',
      url: 'https://www.tiktok.com/@carrerasoftwareuteq?_t=ZM-8zatsbwYIv0&_r=1'
    },
    {
      id: 4,
      name: 'YouTube UTEQ',
      image: qrYoutube,
      description: 'Suscríbete a nuestro canal',
      url: 'https://youtube.com/@orlandoerazo?si=AAaU4GGqjBE9QQgz'
    }
  ];

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // En móvil, el sidebar inicia cerrado
      if (mobile) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cargar noticias al montar el componente
  useEffect(() => {
    loadNews();
  }, []);

  // Recargar noticias cuando se regrese al dashboard o haya cambios
  useEffect(() => {
    const handleStorageChange = () => {
      if (currentView === 'dashboard') {
        loadNews();
      }
    };

    // Escuchar cambios en el localStorage
    window.addEventListener('storage', handleStorageChange);

    // Recargar noticias cuando se regrese al dashboard
    if (currentView === 'dashboard') {
      loadNews();
    }

    // Verificar nuevas noticias cada 30 segundos cuando esté en dashboard
    const interval = setInterval(() => {
      if (currentView === 'dashboard') {
        loadNews();
      }
    }, 30000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [currentView]);

  // Auto-play del carrusel de noticias
  useEffect(() => {
    // Solo auto-play si hay más de 1 noticia y estamos en el dashboard
    if (newsData.length > 1 && currentView === 'dashboard') {
      const autoPlayInterval = setInterval(() => {
        setCurrentNewsIndex((prev) => (prev + 1) % newsData.length);
      }, 10000); // Cambiar noticia cada 10 segundos

      return () => clearInterval(autoPlayInterval);
    }
  }, [newsData.length, currentView]);

  // Guardar la vista actual en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem('currentView', currentView);
  }, [currentView]);

  // Verificar permisos cuando cambie el usuario o la vista actual
  useEffect(() => {
    if (currentView !== 'home' && !hasPermission(currentView)) {
      console.warn(`Usuario ${usuario?.usuario} no tiene permisos para ${currentView}, redirigiendo a home`);
      setCurrentView('home');
    }
  }, [usuario, currentView]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest('.user-dropdown')) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const handleLogout = () => {
    clearAuthData();
    // El interceptor toma el token desde localStorage en cada request
    onLogout();
  };

  // Funciones para manejar carruseles
  const nextSlide = (type) => {
    switch (type) {
      case 'apps':
        setCurrentAppsIndex((prev) => (prev + 1) % appsData.length);
        break;
      case 'softw':
        setCurrentSoftwIndex((prev) => (prev + 1) % softwData.length);
        break;
      case 'social':
        setCurrentSocialIndex((prev) => (prev + 1) % socialData.length);
        break;
    }
  };

  const prevSlide = (type) => {
    switch (type) {
      case 'apps':
        setCurrentAppsIndex((prev) => (prev - 1 + appsData.length) % appsData.length);
        break;
      case 'softw':
        setCurrentSoftwIndex((prev) => (prev - 1 + softwData.length) % softwData.length);
        break;
      case 'social':
        setCurrentSocialIndex((prev) => (prev - 1 + socialData.length) % socialData.length);
        break;
    }
  };

  const goToSlide = (type, index) => {
    switch (type) {
      case 'apps':
        setCurrentAppsIndex(index);
        break;
      case 'softw':
        setCurrentSoftwIndex(index);
        break;
      case 'social':
        setCurrentSocialIndex(index);
        break;
      case 'news':
        setCurrentNewsIndex(index);
        break;
    }
  };

  const nextNewsSlide = () => {
    setCurrentNewsIndex((prev) => (prev + 1) % newsData.length);
  };

  const prevNewsSlide = () => {
    setCurrentNewsIndex((prev) => (prev - 1 + newsData.length) % newsData.length);
  };

  const handleNavigate = (view) => {
    // Verificar permisos antes de navegar
    if (!hasPermission(view)) {
      console.warn(`Usuario ${usuario?.usuario} intentó acceder a ${view} sin permisos`);
      return; // No permitir la navegación
    }

    setCurrentView(view);

    // Si se navega al dashboard, recargar noticias
    if (view === 'dashboard') {
      loadNews();
    }

    // En móvil, cerrar sidebar después de navegar
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  // Función para refrescar noticias (puede ser llamada desde otros componentes)
  const refreshNews = () => {
    loadNews();
  };

  // Funciones para el modal de noticias
  const openNewsModal = (news) => {
    setSelectedNews(news);
    setIsModalOpen(true);
  };

  const closeNewsModal = () => {
    setIsModalOpen(false);
    setSelectedNews(null);
  };

  // Cerrar modal con tecla ESC
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isModalOpen) {
        closeNewsModal();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isModalOpen]);

  // Función para manejar redirecciones a URLs externas
  const handleRedirect = (url) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  // Funciones para manejar swipe/deslizamiento
  const handleTouchStart = (e, setStartX) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e, startX, type) => {
    if (!startX) return;

    const endX = e.changedTouches[0].clientX;
    const diffX = startX - endX;
    const minSwipeDistance = 50;

    if (Math.abs(diffX) > minSwipeDistance) {
      if (diffX > 0) {
        // Swipe left - next slide
        nextSlide(type);
      } else {
        // Swipe right - previous slide
        prevSlide(type);
      }
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Componente de Carrusel Vertical de Noticias
  const NewsCarousel = () => {
    if (newsLoading) {
      return (
        <div className="bg-white rounded-lg shadow-md p-3 hover:shadow-xl transition-shadow duration-300 h-[1000px]">
          <div className="mb-4">
            <h3 className="text-xl sm:text-2xl font-bold text-center bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent mb-2">
              Noticias Software
            </h3>
            <div className="w-16 h-1 bg-gradient-to-r from-green-500 to-green-700 mx-auto rounded-full"></div>
          </div>

          <div className="relative h-[920px] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando noticias...</p>
            </div>
          </div>
        </div>
      );
    }

    if (newsData.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-3 hover:shadow-xl transition-shadow duration-300 h-[1000px]">
          <div className="mb-4">
            <h3 className="text-xl sm:text-2xl font-bold text-center bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent mb-2">
              Noticias Software
            </h3>
            <div className="w-16 h-1 bg-gradient-to-r from-green-500 to-green-700 mx-auto rounded-full"></div>
          </div>

          <div className="relative h-[920px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <p className="text-gray-600">No hay noticias disponibles</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-md p-3 hover:shadow-xl transition-shadow duration-300 h-[680px] sm:h-[1180px]">
        <div className="mb-4">
          <h3 className="text-xl sm:text-2xl font-bold text-center bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent mb-2">
            Noticias Software
          </h3>
          <div className="w-16 h-1 bg-gradient-to-r from-green-500 to-green-700 mx-auto rounded-full"></div>
        </div>

        <div className="relative h-[600px] sm:h-[1100px]">
          {/* Contenedor del carrusel vertical */}
          <div className="overflow-hidden rounded-lg h-full">
            <div
              className="flex flex-col transition-transform duration-500 ease-out h-full"
              style={{
                transform: `translateY(-${currentNewsIndex * 100}%)`
              }}
            >
              {newsData.map((news, index) => (
                <div key={news.id} className="w-full h-full flex-shrink-0 px-1 py-1 sm:px-2 sm:py-2">
                  <div className="bg-white rounded-lg border-2 transition-all duration-300 cursor-pointer h-full flex flex-col shadow-lg hover:shadow-xl p-1 sm:p-2"
                    style={{ borderColor: 'rgba(2, 90, 39, 0.3)' }}
                    onMouseEnter={(e) => e.target.style.borderColor = 'rgba(2, 90, 39, 0.5)'}
                    onMouseLeave={(e) => e.target.style.borderColor = 'rgba(2, 90, 39, 0.3)'}
                    onClick={() => openNewsModal(news)}>
                    {/* Media de la noticia con título superpuesto */}
                    <div className="w-full h-full overflow-hidden flex-shrink-0 relative group rounded-lg">
                      {/* Fondo transparente con imagen/video */}
                      {news.mediaType === 'image' && news.mediaUrl && (
                        <div className="absolute inset-0 w-full h-full">
                          <img
                            src={news.mediaUrl}
                            alt={news.title}
                            className="w-full h-full object-cover opacity-60 blur-sm"
                            loading="lazy"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop';
                            }}
                          />
                        </div>
                      )}

                      {news.mediaType === 'video' && news.mediaUrl && (
                        <div className="absolute inset-0 w-full h-full">
                          <video
                            className="w-full h-full object-cover opacity-60 blur-sm"
                            muted
                            loop
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          >
                            <source src={news.mediaUrl} type="video/mp4" />
                          </video>
                        </div>
                      )}

                      {news.mediaType === 'none' && (
                        <div className="absolute inset-0 w-full h-full">
                          <img
                            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop"
                            alt={news.title}
                            className="w-full h-full object-cover opacity-60 blur-sm"
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Imagen/video principal centrada */}
                      <div className="relative w-full h-full flex items-center justify-center bg-white/20 p-2 sm:p-4">
                        {news.mediaType === 'image' && news.mediaUrl && (
                          <img
                            src={news.mediaUrl}
                            alt={news.title}
                            className="w-3/4 h-[60%] object-cover transition-transform duration-300 group-hover:scale-105 rounded-lg"
                            loading="lazy"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop';
                            }}
                          />
                        )}

                        {news.mediaType === 'video' && news.mediaUrl && (
                          <video
                            className="w-3/4 h-[60%] object-cover transition-transform duration-300 group-hover:scale-105 rounded-lg"
                            muted
                            loop
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          >
                            <source src={news.mediaUrl} type="video/mp4" />
                            Tu navegador no soporta la reproducción de video.
                          </video>
                        )}

                        {news.mediaType === 'none' && (
                          <img
                            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=200&fit=crop"
                            alt={news.title}
                            className="w-3/4 h-[60%] object-cover transition-transform duration-300 group-hover:scale-105 rounded-lg"
                            loading="lazy"
                          />
                        )}
                      </div>

                      {/* Título superpuesto sobre el media */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 sm:p-6">
                        <h4 className="font-bold text-white text-lg sm:text-2xl mb-12 sm:mb-10 line-clamp-3 drop-shadow-lg">
                          {news.title}
                        </h4>
                      </div>

                      {/* Indicador de video */}
                      {news.mediaType === 'video' && (
                        <div className="absolute top-4 right-4 bg-black/60 rounded-full p-2">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      )}

                      {/* Botones de navegación sobre la imagen */}
                      {newsData.length > 1 && (
                        <>
                          {/* Botón anterior - parte superior */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Evitar que se abra el modal
                              prevNewsSlide();
                            }}
                            className="absolute left-1/2 transform -translate-x-1/2 top-4 text-green-600 p-2.5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 z-10 hover:scale-110 bg-white bg-opacity-80"
                            aria-label="Noticia anterior"
                          >
                            <svg className="w-5 h-5 transition-transform duration-200 hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>

                          {/* Botón siguiente - parte inferior */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Evitar que se abra el modal
                              nextNewsSlide();
                            }}
                            className="absolute left-1/2 transform -translate-x-1/2 bottom-4 text-green-600 p-2.5 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 z-10 hover:scale-110 bg-white bg-opacity-80"
                            aria-label="Siguiente noticia"
                          >
                            <svg className="w-5 h-5 transition-transform duration-200 hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    );
  };

  // Componente de Carrusel
  const Carousel = ({ data, currentIndex, type, title }) => {
    const [touchStartX, setTouchStartX] = useState(null);

    return (
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-xl transition-shadow duration-300">
        <div className="mb-6">
          <h3 className="text-xl sm:text-2xl font-bold text-center bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent mb-2">
            {title}
          </h3>
          <div className="w-16 h-1 bg-gradient-to-r from-green-500 to-green-700 mx-auto rounded-full"></div>
        </div>

        <div className="relative">
          {/* Contenedor del carrusel */}
          <div
            className="overflow-hidden rounded-lg touch-pan-y"
            onTouchStart={(e) => handleTouchStart(e, setTouchStartX)}
            onTouchEnd={(e) => handleTouchEnd(e, touchStartX, type)}
            style={{ touchAction: 'pan-y pinch-zoom' }}
          >
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{
                transform: `translateX(-${currentIndex * 100}%)`
              }}
            >
              {data.map((item, index) => (
                <div key={item.id} className="w-full flex-shrink-0">
                  <div className="flex flex-col items-center p-3">
                    <div
                      className="w-36 h-36 sm:w-40 sm:h-40 mb-2 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center overflow-hidden group relative shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                      onClick={() => handleRedirect(item.url)}
                      title={`Ir a ${item.name}`}
                    >
                      {/* Imagen con animaciones */}
                      <img
                        src={item.image}
                        alt={item.name}
                        className="max-w-full max-h-full object-contain transition-all duration-300"
                        draggable="false"
                        loading="lazy"
                        decoding="async"
                        importance="low"
                      />
                    </div>
                    <button
                      onClick={() => handleRedirect(item.url)}
                      className="text-xs sm:text-sm font-semibold text-gray-800 mb-1 text-center transition-all duration-300 hover:text-green-600 hover:scale-105 cursor-pointer bg-transparent border-none underline-offset-4 hover:underline"
                      title={`Ir a ${item.name}`}
                    >
                      {item.name}
                    </button>
                    <p className="text-xs text-gray-600 text-center max-w-48 sm:max-w-56 transition-colors duration-300 hover:text-gray-800">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botones de navegación - solo mostrar si hay más de 1 elemento */}
          {data.length > 1 && (
            <>
              <button
                onClick={() => prevSlide(type)}
                className="absolute left-2 top-1/3 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 p-2 sm:p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-10 hover:scale-110 hover:-translate-x-1"
                aria-label="Anterior"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                onClick={() => nextSlide(type)}
                className="absolute right-2 top-1/3 transform -translate-y-1/2 bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-800 p-2 sm:p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-10 hover:scale-110 hover:translate-x-1"
                aria-label="Siguiente"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Indicadores - solo mostrar si hay más de 1 elemento */}
          {data.length > 1 && (
            <div className="flex justify-center mt-4 space-x-2">
              {data.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(type, index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 transform hover:scale-125 ${index === currentIndex
                    ? 'bg-green-600 shadow-lg scale-110'
                    : 'bg-gray-300 hover:bg-gray-400 shadow-md'
                    }`}
                  aria-label={`Ir a slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Definir todos los elementos del menú
  const allMenuItems = [
    {
      id: 'home',
      name: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    {
      id: 'profile',
      name: 'Mi Perfil',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'usuarios',
      name: 'Usuarios',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'autoridades',
      name: 'Autoridades UTEQ',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      )
    },
    {
      id: 'estudiantes',
      name: 'Estudiantes',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        </svg>
      )
    },
    {
      id: 'instituciones',
      name: 'Instituciones',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'programas-visita',
      name: 'Programas de Visita',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'noticias',
      name: 'Noticias',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      )
    },
    {
      id: 'dudas',
      name: 'Dudas y Preguntas',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'actividades',
      name: 'Actividades',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    },
    {
      id: 'tematicas',
      name: 'Temáticas',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      id: 'comunicados',
      name: 'Comunicados',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    }
  ];

  // Filtrar elementos del menú según permisos del usuario
  const menuItems = allMenuItems.filter(item => hasPermission(item.id));

  // Renderizar contenido según la vista actual
  const renderContent = () => {
    // Verificar permisos antes de renderizar cualquier contenido
    if (!hasPermission(currentView)) {
      // Si no tiene permisos para la vista actual, redirigir a home
      setCurrentView('home');
      return null;
    }

    // Ruta directa para Dudas y Preguntas
    if (currentView === 'dudas' && hasPermission('dudas')) {
      return (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6">
          <BancoDudas onBack={() => handleNavigate('home')} />
        </div>
      );
    }

    switch (currentView) {
      case 'usuarios':
        return hasPermission('usuarios') ? <UsuariosManager onBack={() => handleNavigate('home')} /> : null;
      case 'autoridades':
        return hasPermission('autoridades') ? <AutoridadesManager onBack={() => handleNavigate('home')} /> : null;
      case 'estudiantes':
        return hasPermission('estudiantes') ? <EstudiantesManager onBack={() => handleNavigate('home')} /> : null;
      case 'instituciones':
        return hasPermission('instituciones') ? <InstitucionesManager onBack={() => handleNavigate('home')} /> : null;
      case 'tematicas':
        return hasPermission('tematicas') ? <TematicasManager onBack={() => handleNavigate('home')} /> : null;
      case 'actividades':
        return hasPermission('actividades') ? <ActividadesManager onBack={() => handleNavigate('home')} /> : null;
      case 'dudas':
        return hasPermission('dudas') ? (
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6">
            <div className="bg-white rounded-xl shadow-lg p-6 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Dudas y Preguntas</h2>
              <p className="text-gray-600">Esta sección estará disponible próximamente.</p>
            </div>
          </div>
        ) : null;
      case 'programas-visita':
        return hasPermission('programas-visita') ? <ProgramasVisitaManager onBack={() => handleNavigate('home')} /> : null;
      case 'noticias':
        return hasPermission('noticias') ? <NoticiasManager onBack={() => handleNavigate('home')} usuario={usuario} /> : null;
      case 'comunicados':
        return hasPermission('comunicados') ? <ComunicadosManager onBack={() => handleNavigate('home')} usuario={usuario} /> : null;
      case 'profile':
        return <Profile usuario={usuario} onBack={() => handleNavigate('home')} />;
      case 'config':
        return <SystemConfig onBack={() => handleNavigate('home')} />;
      case 'home':
      default:
        return (
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6">
            {/* Información del Usuario - Compacto y Flotante */}
            <div className="bg-white rounded-xl shadow-lg p-3 sm:p-4 mb-6 border-l-4 border-green-600 hover:shadow-xl transition-shadow duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">{usuario.persona?.nombre || 'Usuario'}</p>
                    <p className="text-xs sm:text-sm text-gray-600">{usuario.tipo_usuario?.nombre || 'Usuario'}</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-500">En línea</span>
                </div>
              </div>
            </div>

            {/* Layout de dos columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Columna izquierda - Carruseles QR */}
              <div className="space-y-4 sm:space-y-6">
                {/* Sección 1: Apps UTEQ */}
                <div>
                  <Carousel
                    data={appsData}
                    currentIndex={currentAppsIndex}
                    type="apps"
                    title="Aplicaciones Software"
                  />
                </div>

                {/* Sección 2: Información de Software */}
                <div>
                  <Carousel
                    data={softwData}
                    currentIndex={currentSoftwIndex}
                    type="softw"
                    title="Información de la Carrera"
                  />
                </div>

                {/* Sección 3: Redes Sociales UTEQ */}
                <div>
                  <Carousel
                    data={socialData}
                    currentIndex={currentSocialIndex}
                    type="social"
                    title="Redes Sociales Software"
                  />
                </div>
              </div>

              {/* Columna derecha - Carrusel vertical de noticias */}
              <div className="lg:sticky lg:top-24">
                <NewsCarousel />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Overlay para móvil cuando el sidebar está abierto */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <div
          className={`
            ${isMobile
              ? `fixed inset-y-0 left-0 z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-64`
              : `${sidebarOpen ? 'w-56' : 'w-16'} fixed inset-y-0 left-0 z-40`
            } 
            shadow-lg transition-all duration-300 ease-in-out
          `}
          style={{ backgroundColor: '#025a27' }}
        >
          <div className={`${isMobile ? 'p-4' : 'p-3'} h-full overflow-y-auto`}>
            {/* Header del Sidebar */}
            <div className="flex items-center justify-between mb-6">
              {(sidebarOpen || isMobile) && (
                <h1 className={`${isMobile ? 'text-xl' : 'text-lg'} font-bold text-white text-center flex-1`}>
                  Sistema Escolar
                </h1>
              )}
              {/* Solo mostrar botón en móvil */}
              {isMobile && (
                <button
                  onClick={toggleSidebar}
                  className="text-white hover:bg-green-800 p-2 rounded-lg transition-colors duration-200 ml-2"
                  title="Cerrar menú"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`
                    w-full flex items-center text-left rounded-lg transition-all duration-200
                    ${isMobile
                      ? 'px-4 py-3'
                      : sidebarOpen
                        ? 'px-3 py-2'
                        : 'px-2 py-2 justify-center'
                    }
                    ${currentView === item.id
                      ? 'text-white'
                      : 'text-gray-300 hover:text-white hover:bg-green-800'
                    }
                  `}
                  style={currentView === item.id ? { backgroundColor: '#cb9e2d' } : {}}
                  title={!sidebarOpen && !isMobile ? item.name : ''}
                >
                  <span className={`${(sidebarOpen || isMobile) ? 'mr-3' : ''}`}>
                    {item.icon}
                  </span>
                  {(sidebarOpen || isMobile) && (
                    <span className={`${isMobile ? 'text-base' : 'text-sm'} font-medium truncate`}>
                      {item.name}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div
          className={`flex-1 flex flex-col min-w-0 ${!isMobile ? (sidebarOpen ? 'ml-56' : 'ml-16') : ''
            }`}
        >
          {/* Header */}
          <header className="bg-white shadow-sm border-b sticky top-0 z-30">
            <div className="px-3 sm:px-4 py-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center min-w-0">
                  {/* Botón hamburguesa siempre visible */}
                  <button
                    onClick={toggleSidebar}
                    className="mr-3 text-gray-600 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 flex-shrink-0"
                    title={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 truncate`}>
                    {currentView === 'config' ? 'Configuración' : (allMenuItems.find(item => item.id === currentView)?.name || 'Dashboard')}
                  </h2>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
                  {/* Dropdown del Usuario */}
                  <div className="relative user-dropdown">
                    <button
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 rounded-lg px-3 py-2 transition-colors duration-200"
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      {/* Nombre del usuario - oculto en móvil */}
                      <span className="hidden sm:block text-sm font-medium truncate max-w-32">
                        {usuario.persona?.nombre || 'Usuario'}
                      </span>
                      {/* Icono de flecha */}
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {dropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                        {/* Header del dropdown */}
                        <div className="px-4 py-3 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-900">{usuario.persona?.nombre || 'Usuario'}</p>
                          <p className="text-xs text-gray-500">{usuario.tipo_usuario?.nombre || 'Usuario'}</p>
                          <div className="mt-1">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${usuario.tipo_usuario?.nombre?.toLowerCase() === 'administrador'
                              ? 'bg-green-100 text-green-800'
                              : usuario.tipo_usuario?.nombre?.toLowerCase() === 'coadministrador'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                              }`}>
                              {usuario.tipo_usuario?.nombre?.toLowerCase() === 'administrador' ? 'Acceso Completo'
                                : usuario.tipo_usuario?.nombre?.toLowerCase() === 'coadministrador' ? 'Acceso Limitado'
                                  : 'Solo Lectura'}
                            </span>
                          </div>
                        </div>

                        {/* Opciones del dropdown */}
                        {usuario.tipo_usuario?.nombre?.toLowerCase() === 'administrador' && (
                          <button
                            onClick={() => {
                              handleNavigate('config');
                              setDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                              />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Configuración</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            handleNavigate('profile');
                            setDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Mi Perfil</span>
                        </button>

                        <button
                          onClick={() => {
                            handleLogout();
                            setDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 overflow-auto">
            {renderContent()}
          </main>
        </div>
      </div>

      {/* Modal de noticia mejorado - Fuera de la estructura principal */}
      {isModalOpen && selectedNews && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden animate-slideUp hover-lift">
            {/* Header del modal mejorado */}
            <div className="sticky top-0 text-white p-4 sm:p-6 flex justify-between items-center shadow-lg z-10" style={{ backgroundColor: '#025a27' }}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e0ae27' }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">Detalle de la Noticia</h3>
                  <p className="text-white text-sm opacity-90">Universidad Técnica Estatal de Quevedo</p>
                </div>
              </div>
              <button
                onClick={closeNewsModal}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                style={{ '--hover-color': '#e0ae27' }}
                onMouseEnter={(e) => e.target.style.color = '#e0ae27'}
                onMouseLeave={(e) => e.target.style.color = 'white'}
                aria-label="Cerrar modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido del modal mejorado */}
            <div className="overflow-y-auto max-h-[calc(95vh-80px)] modal-scroll">
              {/* Título principal */}
              <div className="p-4 sm:p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight mb-3">
                  {selectedNews.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#025a27' }}></div>
                    <span className="font-medium">Publicado</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M9 4a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2" />
                    </svg>
                    <span className="font-medium">Noticia</span>
                  </div>
                </div>
              </div>

              {/* Media de la noticia */}
              {(selectedNews.mediaType === 'image' || selectedNews.mediaType === 'video') && selectedNews.mediaUrl && (
                <div className="relative">
                  {selectedNews.mediaType === 'image' && (
                    <div className="relative group">
                      <img
                        src={selectedNews.mediaUrl}
                        alt={selectedNews.title}
                        className="w-full h-auto max-h-96 sm:max-h-[500px] object-contain transition-transform duration-300 group-hover:scale-105"
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop';
                        }}
                      />
                      <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {selectedNews.mediaType === 'video' && (
                    <div className="relative group">
                      <video
                        className="w-full h-auto max-h-96 sm:max-h-[500px] object-contain"
                        controls
                        preload="metadata"
                      >
                        <source src={selectedNews.mediaUrl} type="video/mp4" />
                        Tu navegador no soporta la reproducción de video.
                      </video>
                      <div className="absolute top-4 right-4 bg-black bg-opacity-60 rounded-full p-2">
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Contenido de la noticia */}
              <div className="p-4 sm:p-6">
                <div className="prose-custom">
                  <div className="text-gray-700 leading-relaxed text-base sm:text-lg whitespace-pre-wrap">
                    {selectedNews.content}
                  </div>
                </div>

                {/* Footer del modal */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#025a27' }}>
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Noticias UTEQ</p>
                        <p className="text-xs text-gray-500">Sistema de Gestión Escolar</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          // Función para compartir mejorada
                          if (navigator.share) {
                            navigator.share({
                              title: selectedNews.title,
                              text: selectedNews.content,
                              url: window.location.href
                            }).catch(err => console.log('Error al compartir:', err));
                          } else {
                            // Fallback: copiar al portapapeles
                            const textToShare = `${selectedNews.title}\n\n${selectedNews.content}\n\n- Noticias UTEQ`;
                            navigator.clipboard.writeText(textToShare).then(() => {
                              // Mostrar notificación temporal
                              const button = event.target;
                              const originalText = button.textContent;
                              button.textContent = '¡Copiado!';
                              button.className = 'px-4 py-2 bg-green-500 text-white rounded-lg transition-all duration-200 text-sm font-medium';
                              setTimeout(() => {
                                button.textContent = originalText;
                                button.className = 'px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm font-medium';
                              }, 2000);
                            }).catch(err => {
                              console.log('Error al copiar:', err);
                              alert('No se pudo copiar al portapapeles');
                            });
                          }
                        }}
                        className="px-4 py-2 text-white rounded-lg transition-all duration-200 text-sm font-medium hover-lift"
                        style={{ backgroundColor: '#025a27' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#014a1f'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#025a27'}
                      >
                        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                        </svg>
                        Compartir
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
