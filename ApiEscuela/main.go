package main

import (
	"ApiEscuela/handlers"
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"ApiEscuela/routers"
	"ApiEscuela/services"
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/joho/godotenv"
	"github.com/spf13/viper"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	// Cargar variables de entorno desde .env (opcional para desarrollo)
	err := godotenv.Load()
	if err != nil {
		log.Printf("Info: No se encontró archivo .env, usando variables de entorno del sistema")
	}

	// Inicializar Fiber
	app := fiber.New(fiber.Config{
		AppName: "ApiEscuela v1.0",
		// Configurar para aceptar JSON automáticamente
		BodyLimit: 4 * 1024 * 1024, // 4MB
	})

	// Middleware para detectar JSON automáticamente
	app.Use(func(c *fiber.Ctx) error {
		// Si el body parece JSON pero no tiene Content-Type, lo establecemos
		if len(c.Body()) > 0 {
			body := c.Body()
			// Verificar si el body comienza con { o [ (JSON)
			if (body[0] == '{' || body[0] == '[') && c.Get("Content-Type") == "" {
				c.Request().Header.Set("Content-Type", "application/json")
			}
		}
		return c.Next()
	})

	// Configurar CORS
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,HEAD,PUT,DELETE,PATCH,OPTIONS",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	// Configurar Viper
	config := viper.New()
	config.AutomaticEnv()
	config.SetDefault("APP_PORT", "3000")
	config.SetDefault("APP_ENV", "development")

	config.SetConfigName("config")
	config.SetConfigType("env")
	config.AddConfigPath(".")
	config.AddConfigPath("/etc/secrets/")

	if err := config.ReadInConfig(); err != nil {
		log.Printf("Advertencia: No se pudo leer el archivo de configuración. %v", err)
	}

	// Configurar conexión a la base de datos
	// Obtener configuración de base de datos desde variables de entorno
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		log.Fatal("DATABASE_URL no está definida. Configure la variable de entorno DATABASE_URL en su archivo .env")
	}

	// Debug: Mostrar la URL (sin la contraseña por seguridad)
	debugURL := databaseURL
	if len(debugURL) > 50 {
		debugURL = debugURL[:50] + "..."
	}
	log.Printf("Usando DATABASE_URL para conexión a la base de datos: %s", debugURL)

	// Debug: Verificar otras variables de entorno
	log.Printf("Debug - Variables de entorno:")
	log.Printf("  DATABASE_URL length: %d", len(databaseURL))
	log.Printf("  DB_HOST: %s", os.Getenv("DB_HOST"))
	log.Printf("  DB_USER: %s", os.Getenv("DB_USER"))
	log.Printf("  DB_NAME: %s", os.Getenv("DB_NAME"))

	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		log.Fatalf("Error al conectar con la base de datos: %v", err)
	}

	// Automigración de todos los modelos
	if err := db.AutoMigrate(
		&models.Provincia{},
		&models.Ciudad{},
		&models.Persona{},
		&models.TipoUsuario{},
		&models.Usuario{},
		&models.Institucion{},
		&models.Estudiante{},
		&models.EstudianteUniversitario{},
		&models.AutoridadUTEQ{},
		&models.Tematica{},
		&models.Actividad{},
		&models.ProgramaVisita{},
		&models.DetalleAutoridadDetallesVisita{},
		&models.VisitaDetalle{},
		&models.Dudas{},
		&models.VisitaDetalleEstudiantesUniversitarios{},
		&models.CodigoUsuario{},
		&models.Noticia{},
		&models.Comunicado{},
	); err != nil {
		log.Fatalf("Error en la automigración: %v", err)
	}

	// Inicializar repositorios
	estudianteRepo := repositories.NewEstudianteRepository(db)
	personaRepo := repositories.NewPersonaRepository(db)
	provinciaRepo := repositories.NewProvinciaRepository(db)
	ciudadRepo := repositories.NewCiudadRepository(db)
	institucionRepo := repositories.NewInstitucionRepository(db)
	tipoUsuarioRepo := repositories.NewTipoUsuarioRepository(db)
	usuarioRepo := repositories.NewUsuarioRepository(db)
	estudianteUnivRepo := repositories.NewEstudianteUniversitarioRepository(db)
	autoridadRepo := repositories.NewAutoridadUTEQRepository(db)
	tematicaRepo := repositories.NewTematicaRepository(db)
	actividadRepo := repositories.NewActividadRepository(db)
	programaVisitaRepo := repositories.NewProgramaVisitaRepository(db)
	detalleAutoridadDetallesVisitaRepo := repositories.NewDetalleAutoridadDetallesVisitaRepository(db)
	visitaDetalleRepo := repositories.NewVisitaDetalleRepository(db)
	dudasRepo := repositories.NewDudasRepository(db)
	visitaDetalleEstudiantesUniversitariosRepo := repositories.NewVisitaDetalleEstudiantesUniversitariosRepository(db)
	codigoUsuarioRepo := repositories.NewCodigoUsuarioRepository(db)

	// Ejecutar migración manual para la tabla de códigos
	if err := codigoUsuarioRepo.MigrarColumnaExpiraEn(); err != nil {
		log.Printf("Advertencia: Error al migrar tabla de códigos: %v", err)
	} else {
		log.Printf("Migración de tabla de códigos completada exitosamente")
	}

	noticiaRepo := repositories.NewNoticiaRepository(db)
	comunicadoRepo := repositories.NewComunicadoRepository(db)

	// Inicializar servicios (antes de handlers que los necesiten)
	authService := services.NewAuthService(usuarioRepo, personaRepo, codigoUsuarioRepo)
	comunicadoService := services.NewComunicadoService(comunicadoRepo, estudianteRepo, institucionRepo)

	// Inicializar handlers
	estudianteHandler := handlers.NewEstudianteHandler(estudianteRepo, personaRepo, institucionRepo, ciudadRepo, usuarioRepo, tipoUsuarioRepo, authService)
	personaHandler := handlers.NewPersonaHandler(personaRepo)
	provinciaHandler := handlers.NewProvinciaHandler(provinciaRepo)
	ciudadHandler := handlers.NewCiudadHandler(ciudadRepo)
	institucionHandler := handlers.NewInstitucionHandler(institucionRepo)
	tipoUsuarioHandler := handlers.NewTipoUsuarioHandler(tipoUsuarioRepo)
	usuarioHandler := handlers.NewUsuarioHandler(usuarioRepo)
	estudianteUnivHandler := handlers.NewEstudianteUniversitarioHandler(estudianteUnivRepo, personaRepo)
	autoridadHandler := handlers.NewAutoridadUTEQHandler(autoridadRepo, personaRepo)
	tematicaHandler := handlers.NewTematicaHandler(tematicaRepo)
	actividadHandler := handlers.NewActividadHandler(actividadRepo)
	programaVisitaHandler := handlers.NewProgramaVisitaHandler(programaVisitaRepo)
	detalleAutoridadDetallesVisitaHandler := handlers.NewDetalleAutoridadDetallesVisitaHandler(detalleAutoridadDetallesVisitaRepo)
	visitaDetalleHandler := handlers.NewVisitaDetalleHandler(visitaDetalleRepo)
	dudasHandler := handlers.NewDudasHandler(dudasRepo)
	visitaDetalleEstudiantesUniversitariosHandler := handlers.NewVisitaDetalleEstudiantesUniversitariosHandler(visitaDetalleEstudiantesUniversitariosRepo)
	noticiaHandler := handlers.NewNoticiaHandler(noticiaRepo)
	uploadHandler := handlers.NewUploadHandler()
	codigoHandler := handlers.NewCodigoHandler(codigoUsuarioRepo)

	// Inicializar handlers que dependen de servicios
	authHandler := handlers.NewAuthHandler(authService)
	comunicadoHandler := handlers.NewComunicadoHandler(comunicadoService)
	whatsappHandler := handlers.NewWhatsAppHandler()

	// Crear contenedor de todos los handlers
	allHandlers := routers.NewAllHandlers(
		estudianteHandler,
		personaHandler,
		provinciaHandler,
		ciudadHandler,
		institucionHandler,
		tipoUsuarioHandler,
		usuarioHandler,
		estudianteUnivHandler,
		autoridadHandler,
		tematicaHandler,
		actividadHandler,
		programaVisitaHandler,
		detalleAutoridadDetallesVisitaHandler,
		visitaDetalleHandler,
		dudasHandler,
		visitaDetalleEstudiantesUniversitariosHandler,
		noticiaHandler,
		uploadHandler,
		authHandler,
		codigoHandler,
		comunicadoHandler,
		whatsappHandler,
	)

	// Configurar todas las rutas
	routers.SetupAllRoutes(app, allHandlers)

	// Ruta de bienvenida
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "¡Bienvenido a ApiEscuela!",
			"version": "4.2.2",
			"status":  "running",
		})
	})

	// Ruta de salud
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":   "healthy",
			"database": "connected",
		})
	})

	// Iniciar servidor
	port := config.GetString("APP_PORT")
	log.Printf("Servidor ApiEscuela iniciado en el puerto %s", port)
	log.Printf("Ambiente: %s", config.GetString("APP_ENV"))
	log.Printf("Conectado a la base de datos exitosamente")

	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Error al iniciar el servidor: %v", err)
	}
}
