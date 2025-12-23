package routers

import (
	"ApiEscuela/handlers"
	"ApiEscuela/middleware"

	"github.com/gofiber/fiber/v2"
)

// SetupAllRoutes configura todas las rutas de la aplicación
func SetupAllRoutes(app *fiber.App, handlers *AllHandlers) {
	// ==================== RUTAS PÚBLICAS (SIN AUTENTICACIÓN) ====================
	// Rutas de autenticación
	auth := app.Group("/auth")
	auth.Post("/login", handlers.AuthHandler.Login)
	auth.Post("/register", handlers.AuthHandler.Register)
	auth.Post("/validate-token", handlers.AuthHandler.ValidateToken)
	auth.Post("/recover-password", handlers.AuthHandler.RecoverPassword)
	auth.Post("/verify-code", handlers.AuthHandler.VerifyCode)
	auth.Post("/reset-password", handlers.AuthHandler.ResetPassword)

	// ==================== SERVIR ARCHIVOS ESTÁTICOS (PÚBLICO) ====================
	app.Get("/api/files/:tipo/:nombre", handlers.UploadHandler.GetFile)
	// Ruta para archivos con subcarpeta (comunicados_files/{fecha}/{archivo})
	app.Get("/api/files/:tipo/:subcarpeta/:nombre", handlers.UploadHandler.GetFile)

	// ==================== RUTAS PROTEGIDAS (CON AUTENTICACIÓN JWT) ====================
	// Aplicar middleware JWT a todas las rutas protegidas
	protected := app.Group("/api", middleware.JWTMiddleware())

	// ==================== UPLOAD DE ARCHIVOS (PROTEGIDO) ====================
	upload := protected.Group("/upload")
	upload.Post("/", handlers.UploadHandler.UploadFile)
	upload.Get("/test", func(c *fiber.Ctx) error {
		userID := c.Locals("user_id")
		username := c.Locals("username")
		return c.JSON(fiber.Map{
			"message":  "Token válido",
			"user_id":  userID,
			"username": username,
		})
	})

	// Rutas de autenticación protegidas
	authProtected := protected.Group("/auth")
	authProtected.Get("/profile", handlers.AuthHandler.GetProfile)
	authProtected.Post("/change-password", handlers.AuthHandler.ChangePassword)
	authProtected.Post("/refresh-token", handlers.AuthHandler.RefreshToken)

	// ==================== ESTUDIANTES ====================
	estudiantes := protected.Group("/estudiantes")
	estudiantes.Post("/", handlers.EstudianteHandler.CreateEstudiante)
	estudiantes.Get("/", handlers.EstudianteHandler.GetAllEstudiantes)
	estudiantes.Get("/all-including-deleted", handlers.EstudianteHandler.GetAllEstudiantesIncludingDeleted)
	estudiantes.Get("/deleted", handlers.EstudianteHandler.GetDeletedEstudiantes)
	estudiantes.Get("/:id", handlers.EstudianteHandler.GetEstudiante)
	estudiantes.Put("/:id", handlers.EstudianteHandler.UpdateEstudiante)
	estudiantes.Delete("/:id", handlers.EstudianteHandler.DeleteEstudiante)
	estudiantes.Put("/:id/restore", handlers.EstudianteHandler.RestoreEstudiante)
	estudiantes.Get("/ciudad/:ciudad_id", handlers.EstudianteHandler.GetEstudiantesByCity)
	estudiantes.Get("/institucion/:institucion_id", handlers.EstudianteHandler.GetEstudiantesByInstitucion)
	estudiantes.Get("/especialidad/:especialidad", handlers.EstudianteHandler.GetEstudiantesByEspecialidad)
	estudiantes.Post("/bulk", handlers.EstudianteHandler.CreateEstudiantesBulk) // Carga masiva desde Excel

	// ==================== PERSONAS ====================
	personas := protected.Group("/personas")
	personas.Post("/", handlers.PersonaHandler.CreatePersona)
	personas.Get("/", handlers.PersonaHandler.GetAllPersonas)
	personas.Get("/:id", handlers.PersonaHandler.GetPersona)
	personas.Put("/:id", handlers.PersonaHandler.UpdatePersona)
	personas.Delete("/:id", handlers.PersonaHandler.DeletePersona)
	personas.Get("/cedula/:cedula", handlers.PersonaHandler.GetPersonaByCedula)
	personas.Get("/correo/:correo", handlers.PersonaHandler.GetPersonasByCorreo)

	// ==================== PROVINCIAS ====================
	provincias := protected.Group("/provincias")
	provincias.Post("/", handlers.ProvinciaHandler.CreateProvincia)
	provincias.Get("/", handlers.ProvinciaHandler.GetAllProvincias)
	provincias.Get("/:id", handlers.ProvinciaHandler.GetProvincia)
	provincias.Put("/:id", handlers.ProvinciaHandler.UpdateProvincia)
	provincias.Delete("/:id", handlers.ProvinciaHandler.DeleteProvincia)
	provincias.Get("/nombre/:nombre", handlers.ProvinciaHandler.GetProvinciaByNombre)

	// ==================== CIUDADES ====================
	ciudades := protected.Group("/ciudades")
	ciudades.Post("/", handlers.CiudadHandler.CreateCiudad)
	ciudades.Get("/", handlers.CiudadHandler.GetAllCiudades)
	ciudades.Get("/:id", handlers.CiudadHandler.GetCiudad)
	ciudades.Put("/:id", handlers.CiudadHandler.UpdateCiudad)
	ciudades.Delete("/:id", handlers.CiudadHandler.DeleteCiudad)
	ciudades.Get("/provincia/:provincia_id", handlers.CiudadHandler.GetCiudadesByProvincia)
	ciudades.Get("/nombre/:nombre", handlers.CiudadHandler.GetCiudadByNombre)

	// ==================== INSTITUCIONES ====================
	instituciones := protected.Group("/instituciones")
	instituciones.Post("/", handlers.InstitucionHandler.CreateInstitucion)
	instituciones.Get("/", handlers.InstitucionHandler.GetAllInstituciones)
	instituciones.Get("/:id", handlers.InstitucionHandler.GetInstitucion)
	instituciones.Put("/:id", handlers.InstitucionHandler.UpdateInstitucion)
	instituciones.Delete("/:id", handlers.InstitucionHandler.DeleteInstitucion)
	instituciones.Get("/nombre/:nombre", handlers.InstitucionHandler.GetInstitucionesByNombre)
	instituciones.Get("/autoridad/:autoridad", handlers.InstitucionHandler.GetInstitucionesByAutoridad)

	// ==================== TIPOS DE USUARIO ====================
	tiposUsuario := protected.Group("/tipos-usuario")
	tiposUsuario.Post("/", handlers.TipoUsuarioHandler.CreateTipoUsuario)
	tiposUsuario.Get("/", handlers.TipoUsuarioHandler.GetAllTiposUsuario)
	tiposUsuario.Get("/:id", handlers.TipoUsuarioHandler.GetTipoUsuario)
	tiposUsuario.Put("/:id", handlers.TipoUsuarioHandler.UpdateTipoUsuario)
	tiposUsuario.Delete("/:id", handlers.TipoUsuarioHandler.DeleteTipoUsuario)
	tiposUsuario.Get("/nombre/:nombre", handlers.TipoUsuarioHandler.GetTipoUsuarioByNombre)

	// ==================== USUARIOS ====================
	usuarios := protected.Group("/usuarios")
	usuarios.Post("/", handlers.UsuarioHandler.CreateUsuario)
	usuarios.Get("/", handlers.UsuarioHandler.GetAllUsuarios)
	usuarios.Get("/all-including-deleted", handlers.UsuarioHandler.GetAllUsuariosIncludingDeleted)
	usuarios.Get("/deleted", handlers.UsuarioHandler.GetDeletedUsuarios)
	usuarios.Get("/:id", handlers.UsuarioHandler.GetUsuario)
	usuarios.Put("/:id", handlers.UsuarioHandler.UpdateUsuario)
	usuarios.Delete("/:id", handlers.UsuarioHandler.DeleteUsuario)
	usuarios.Put("/:id/restore", handlers.UsuarioHandler.RestoreUsuario)
	usuarios.Get("/username/:username", handlers.UsuarioHandler.GetUsuarioByUsername)
	usuarios.Get("/tipo/:tipo_usuario_id", handlers.UsuarioHandler.GetUsuariosByTipo)
	usuarios.Get("/persona/:persona_id", handlers.UsuarioHandler.GetUsuariosByPersona)

	// ==================== ESTUDIANTES UNIVERSITARIOS ====================
	estudiantesUniv := protected.Group("/estudiantes-universitarios")
	estudiantesUniv.Post("/", handlers.EstudianteUnivHandler.CreateEstudianteUniversitario)
	estudiantesUniv.Get("/", handlers.EstudianteUnivHandler.GetAllEstudiantesUniversitarios)
	estudiantesUniv.Get("/:id", handlers.EstudianteUnivHandler.GetEstudianteUniversitario)
	estudiantesUniv.Put("/:id", handlers.EstudianteUnivHandler.UpdateEstudianteUniversitario)
	estudiantesUniv.Delete("/:id", handlers.EstudianteUnivHandler.DeleteEstudianteUniversitario)
	estudiantesUniv.Get("/semestre/:semestre", handlers.EstudianteUnivHandler.GetEstudiantesUniversitariosBySemestre)
	estudiantesUniv.Get("/persona/:persona_id", handlers.EstudianteUnivHandler.GetEstudianteUniversitarioByPersona)

	// ==================== AUTORIDADES UTEQ ====================
	autoridades := protected.Group("/autoridades-uteq")
	autoridades.Post("/", handlers.AutoridadHandler.CreateAutoridadUTEQ)
	autoridades.Get("/", handlers.AutoridadHandler.GetAllAutoridadesUTEQ)
	autoridades.Get("/all-including-deleted", handlers.AutoridadHandler.GetAllAutoridadesUTEQIncludingDeleted)
	autoridades.Get("/deleted", handlers.AutoridadHandler.GetDeletedAutoridadesUTEQ)
	autoridades.Get("/:id", handlers.AutoridadHandler.GetAutoridadUTEQ)
	autoridades.Put("/:id", handlers.AutoridadHandler.UpdateAutoridadUTEQ)
	autoridades.Delete("/:id", handlers.AutoridadHandler.DeleteAutoridadUTEQ)
	autoridades.Put("/:id/restore", handlers.AutoridadHandler.RestoreAutoridadUTEQ)
	autoridades.Get("/cargo/:cargo", handlers.AutoridadHandler.GetAutoridadesUTEQByCargo)
	autoridades.Get("/persona/:persona_id", handlers.AutoridadHandler.GetAutoridadUTEQByPersona)

	// ==================== TEMÁTICAS ====================
	tematicas := protected.Group("/tematicas")
	tematicas.Post("/", handlers.TematicaHandler.CreateTematica)
	tematicas.Get("/", handlers.TematicaHandler.GetAllTematicas)
	tematicas.Get("/:id", handlers.TematicaHandler.GetTematica)
	tematicas.Put("/:id", handlers.TematicaHandler.UpdateTematica)
	tematicas.Delete("/:id", handlers.TematicaHandler.DeleteTematica)
	tematicas.Get("/nombre/:nombre", handlers.TematicaHandler.GetTematicasByNombre)
	tematicas.Get("/descripcion/:descripcion", handlers.TematicaHandler.GetTematicasByDescripcion)

	// ==================== ACTIVIDADES ====================
	actividades := protected.Group("/actividades")
	actividades.Post("/", handlers.ActividadHandler.CreateActividad)
	actividades.Get("/", handlers.ActividadHandler.GetAllActividades)
	actividades.Get("/:id", handlers.ActividadHandler.GetActividad)
	actividades.Put("/:id", handlers.ActividadHandler.UpdateActividad)
	actividades.Delete("/:id", handlers.ActividadHandler.DeleteActividad)
	actividades.Get("/tematica/:tematica_id", handlers.ActividadHandler.GetActividadesByTematica)
	actividades.Get("/nombre/:nombre", handlers.ActividadHandler.GetActividadesByNombre)
	actividades.Get("/duracion", handlers.ActividadHandler.GetActividadesByDuracion) // ?min=30&max=120

	// ==================== PROGRAMAS DE VISITA ====================
	programas := protected.Group("/programas-visita")
	programas.Post("/", handlers.ProgramaVisitaHandler.CreateProgramaVisita)
	programas.Get("/", handlers.ProgramaVisitaHandler.GetAllProgramasVisita)
	programas.Get("/:id", handlers.ProgramaVisitaHandler.GetProgramaVisita)
	programas.Put("/:id", handlers.ProgramaVisitaHandler.UpdateProgramaVisita)
	programas.Delete("/:id", handlers.ProgramaVisitaHandler.DeleteProgramaVisita)
	programas.Get("/fecha/:fecha", handlers.ProgramaVisitaHandler.GetProgramasVisitaByFecha) // YYYY-MM-DD
	programas.Get("/institucion/:institucion_id", handlers.ProgramaVisitaHandler.GetProgramasVisitaByInstitucion)
	programas.Get("/rango-fecha", handlers.ProgramaVisitaHandler.GetProgramasVisitaByRangoFecha) // ?inicio=2024-01-01&fin=2024-12-31

	// ==================== DETALLE AUTORIDAD DETALLES VISITA ====================
	detalleAutoridad := protected.Group("/detalle-autoridad-detalles-visita")
	detalleAutoridad.Post("/", handlers.DetalleAutoridadDetallesVisitaHandler.CreateDetalleAutoridadDetallesVisita)
	detalleAutoridad.Get("/", handlers.DetalleAutoridadDetallesVisitaHandler.GetAllDetalleAutoridadDetallesVisitas)
	detalleAutoridad.Get("/:id", handlers.DetalleAutoridadDetallesVisitaHandler.GetDetalleAutoridadDetallesVisita)
	detalleAutoridad.Put("/:id", handlers.DetalleAutoridadDetallesVisitaHandler.UpdateDetalleAutoridadDetallesVisita)
	detalleAutoridad.Delete("/:id", handlers.DetalleAutoridadDetallesVisitaHandler.DeleteDetalleAutoridadDetallesVisita)
	detalleAutoridad.Get("/programa-visita/:programa_visita_id", handlers.DetalleAutoridadDetallesVisitaHandler.GetDetallesByProgramaVisita)
	detalleAutoridad.Get("/autoridad/:autoridad_id", handlers.DetalleAutoridadDetallesVisitaHandler.GetDetallesByAutoridad)
	detalleAutoridad.Delete("/programa-visita/:programa_visita_id", handlers.DetalleAutoridadDetallesVisitaHandler.DeleteDetallesByProgramaVisita)
	detalleAutoridad.Delete("/autoridad/:autoridad_id", handlers.DetalleAutoridadDetallesVisitaHandler.DeleteDetallesByAutoridad)
	detalleAutoridad.Get("/estadisticas", handlers.DetalleAutoridadDetallesVisitaHandler.GetEstadisticasAsignacion)

	// ==================== VISITA DETALLES ====================
	detalles := protected.Group("/visita-detalles")
	detalles.Post("/", handlers.VisitaDetalleHandler.CreateVisitaDetalle)
	detalles.Get("/", handlers.VisitaDetalleHandler.GetAllVisitaDetalles)
	detalles.Get("/:id", handlers.VisitaDetalleHandler.GetVisitaDetalle)
	detalles.Put("/:id", handlers.VisitaDetalleHandler.UpdateVisitaDetalle)
	detalles.Delete("/:id", handlers.VisitaDetalleHandler.DeleteVisitaDetalle)
	detalles.Get("/actividad/:actividad_id", handlers.VisitaDetalleHandler.GetVisitaDetallesByActividad)
	detalles.Get("/programa/:programa_id", handlers.VisitaDetalleHandler.GetVisitaDetallesByPrograma)
	detalles.Delete("/programa/:programa_id", handlers.VisitaDetalleHandler.DeleteVisitaDetallesByPrograma)
	detalles.Delete("/actividad/:actividad_id", handlers.VisitaDetalleHandler.DeleteVisitaDetallesByActividad)
	detalles.Get("/estadisticas", handlers.VisitaDetalleHandler.GetEstadisticasActividades)

	// ==================== DUDAS ====================
	dudas := protected.Group("/dudas")
	dudas.Post("/", handlers.DudasHandler.CreateDudas)
	dudas.Get("/", handlers.DudasHandler.GetAllDudas)
	dudas.Get("/:id", handlers.DudasHandler.GetDudas)
	dudas.Put("/:id", handlers.DudasHandler.UpdateDudas)
	dudas.Delete("/:id", handlers.DudasHandler.DeleteDudas)
	dudas.Get("/estudiante/:estudiante_id", handlers.DudasHandler.GetDudasByEstudiante)
	dudas.Get("/autoridad/:autoridad_id", handlers.DudasHandler.GetDudasByAutoridad)
	dudas.Get("/sin-responder", handlers.DudasHandler.GetDudasSinResponder)
	dudas.Get("/respondidas", handlers.DudasHandler.GetDudasRespondidas)
	dudas.Get("/sin-asignar", handlers.DudasHandler.GetDudasSinAsignar)
	dudas.Get("/privacidad/:privacidad", handlers.DudasHandler.GetDudasByPrivacidad)
	dudas.Get("/buscar/:termino", handlers.DudasHandler.BuscarDudasPorPregunta)
	dudas.Put("/:duda_id/responder", handlers.DudasHandler.ResponderDuda)

	// ==================== VISITA DETALLE ESTUDIANTES UNIVERSITARIOS ====================
	visitaDetalleEstudiantes := protected.Group("/visita-detalle-estudiantes-universitarios")
	visitaDetalleEstudiantes.Post("/", handlers.VisitaDetalleEstudiantesUniversitariosHandler.CreateVisitaDetalleEstudiantesUniversitarios)
	visitaDetalleEstudiantes.Get("/", handlers.VisitaDetalleEstudiantesUniversitariosHandler.GetAllVisitaDetalleEstudiantesUniversitarios)
	visitaDetalleEstudiantes.Get("/:id", handlers.VisitaDetalleEstudiantesUniversitariosHandler.GetVisitaDetalleEstudiantesUniversitarios)
	visitaDetalleEstudiantes.Put("/:id", handlers.VisitaDetalleEstudiantesUniversitariosHandler.UpdateVisitaDetalleEstudiantesUniversitarios)
	visitaDetalleEstudiantes.Delete("/:id", handlers.VisitaDetalleEstudiantesUniversitariosHandler.DeleteVisitaDetalleEstudiantesUniversitarios)
	visitaDetalleEstudiantes.Get("/programa-visita/:programa_visita_id", handlers.VisitaDetalleEstudiantesUniversitariosHandler.GetEstudiantesByProgramaVisita)
	visitaDetalleEstudiantes.Get("/estudiante/:estudiante_id", handlers.VisitaDetalleEstudiantesUniversitariosHandler.GetProgramasVisitaByEstudiante)
	visitaDetalleEstudiantes.Delete("/programa-visita/:programa_visita_id", handlers.VisitaDetalleEstudiantesUniversitariosHandler.DeleteByProgramaVisita)
	visitaDetalleEstudiantes.Delete("/estudiante/:estudiante_id", handlers.VisitaDetalleEstudiantesUniversitariosHandler.DeleteByEstudiante)
	visitaDetalleEstudiantes.Get("/estadisticas", handlers.VisitaDetalleEstudiantesUniversitariosHandler.GetEstadisticasParticipacion)

	// ==================== NOTICIAS ====================
	noticias := protected.Group("/noticias")
	noticias.Post("/", handlers.NoticiaHandler.CreateNoticia)
	noticias.Get("/", handlers.NoticiaHandler.GetAllNoticias)
	noticias.Get("/:id", handlers.NoticiaHandler.GetNoticia)
	noticias.Put("/:id", handlers.NoticiaHandler.UpdateNoticia)
	noticias.Delete("/:id", handlers.NoticiaHandler.DeleteNoticia)
	noticias.Get("/usuario/:usuario_id", handlers.NoticiaHandler.GetNoticiasByUsuario)
	noticias.Get("/titulo/:titulo", handlers.NoticiaHandler.GetNoticiasByTitulo)
	noticias.Get("/descripcion/:descripcion", handlers.NoticiaHandler.GetNoticiasByDescripcion)
	noticias.Get("/buscar/:termino", handlers.NoticiaHandler.SearchNoticias)

	// ==================== CÓDIGOS ====================
	codigos := protected.Group("/codigos")
	codigos.Post("/", handlers.CodigoHandler.CreateCodigo)
	codigos.Get("/:id", handlers.CodigoHandler.GetCodigo)
	codigos.Put("/:id", handlers.CodigoHandler.UpdateCodigo)
	codigos.Delete("/:id", handlers.CodigoHandler.DeleteCodigo)
	codigos.Post("/verify", handlers.CodigoHandler.VerifyCodigo)
	codigos.Put("/:id/verificar", handlers.CodigoHandler.MarcarComoVerificado)
	codigos.Put("/:id/expirado", handlers.CodigoHandler.MarcarComoExpirado)

	// ==================== COMUNICADOS ====================
	comunicados := protected.Group("/comunicados")
	comunicados.Post("/", handlers.ComunicadoHandler.CreateComunicado)
	comunicados.Get("/", handlers.ComunicadoHandler.GetAllComunicados)
	comunicados.Get("/:id", handlers.ComunicadoHandler.GetComunicado)
	comunicados.Delete("/:id", handlers.ComunicadoHandler.DeleteComunicado)
	comunicados.Get("/buscar/:termino", handlers.ComunicadoHandler.SearchComunicados)

	// ==================== WHATSAPP ====================
	whatsapp := protected.Group("/whatsapp")
	whatsapp.Get("/status", handlers.WhatsAppHandler.GetStatus)
	whatsapp.Get("/qr", handlers.WhatsAppHandler.GetQR)
	whatsapp.Post("/send-message", handlers.WhatsAppHandler.SendMessage)
	whatsapp.Post("/logout", handlers.WhatsAppHandler.Logout)

}

// AllHandlers contiene todos los handlers de la aplicación
type AllHandlers struct {
	EstudianteHandler                             *handlers.EstudianteHandler
	PersonaHandler                                *handlers.PersonaHandler
	ProvinciaHandler                              *handlers.ProvinciaHandler
	CiudadHandler                                 *handlers.CiudadHandler
	InstitucionHandler                            *handlers.InstitucionHandler
	TipoUsuarioHandler                            *handlers.TipoUsuarioHandler
	UsuarioHandler                                *handlers.UsuarioHandler
	EstudianteUnivHandler                         *handlers.EstudianteUniversitarioHandler
	AutoridadHandler                              *handlers.AutoridadUTEQHandler
	TematicaHandler                               *handlers.TematicaHandler
	ActividadHandler                              *handlers.ActividadHandler
	ProgramaVisitaHandler                         *handlers.ProgramaVisitaHandler
	DetalleAutoridadDetallesVisitaHandler         *handlers.DetalleAutoridadDetallesVisitaHandler
	VisitaDetalleHandler                          *handlers.VisitaDetalleHandler
	DudasHandler                                  *handlers.DudasHandler
	VisitaDetalleEstudiantesUniversitariosHandler *handlers.VisitaDetalleEstudiantesUniversitariosHandler
	NoticiaHandler                                *handlers.NoticiaHandler
	UploadHandler                                 *handlers.UploadHandler
	AuthHandler                                   *handlers.AuthHandler
	CodigoHandler                                 *handlers.CodigoHandler
	ComunicadoHandler                             *handlers.ComunicadoHandler
	WhatsAppHandler                               *handlers.WhatsAppHandler
}

// NewAllHandlers crea una instancia con todos los handlers
func NewAllHandlers(
	estudianteHandler *handlers.EstudianteHandler,
	personaHandler *handlers.PersonaHandler,
	provinciaHandler *handlers.ProvinciaHandler,
	ciudadHandler *handlers.CiudadHandler,
	institucionHandler *handlers.InstitucionHandler,
	tipoUsuarioHandler *handlers.TipoUsuarioHandler,
	usuarioHandler *handlers.UsuarioHandler,
	estudianteUnivHandler *handlers.EstudianteUniversitarioHandler,
	autoridadHandler *handlers.AutoridadUTEQHandler,
	tematicaHandler *handlers.TematicaHandler,
	actividadHandler *handlers.ActividadHandler,
	programaVisitaHandler *handlers.ProgramaVisitaHandler,
	detalleAutoridadDetallesVisitaHandler *handlers.DetalleAutoridadDetallesVisitaHandler,
	visitaDetalleHandler *handlers.VisitaDetalleHandler,
	dudasHandler *handlers.DudasHandler,
	visitaDetalleEstudiantesUniversitariosHandler *handlers.VisitaDetalleEstudiantesUniversitariosHandler,
	noticiaHandler *handlers.NoticiaHandler,
	uploadHandler *handlers.UploadHandler,
	authHandler *handlers.AuthHandler,
	codigoHandler *handlers.CodigoHandler,
	comunicadoHandler *handlers.ComunicadoHandler,
	whatsappHandler *handlers.WhatsAppHandler,
) *AllHandlers {
	return &AllHandlers{
		EstudianteHandler:                     estudianteHandler,
		PersonaHandler:                        personaHandler,
		ProvinciaHandler:                      provinciaHandler,
		CiudadHandler:                         ciudadHandler,
		InstitucionHandler:                    institucionHandler,
		TipoUsuarioHandler:                    tipoUsuarioHandler,
		UsuarioHandler:                        usuarioHandler,
		EstudianteUnivHandler:                 estudianteUnivHandler,
		AutoridadHandler:                      autoridadHandler,
		TematicaHandler:                       tematicaHandler,
		ActividadHandler:                      actividadHandler,
		ProgramaVisitaHandler:                 programaVisitaHandler,
		DetalleAutoridadDetallesVisitaHandler: detalleAutoridadDetallesVisitaHandler,
		VisitaDetalleHandler:                  visitaDetalleHandler,
		DudasHandler:                          dudasHandler,
		VisitaDetalleEstudiantesUniversitariosHandler: visitaDetalleEstudiantesUniversitariosHandler,
		NoticiaHandler:    noticiaHandler,
		UploadHandler:     uploadHandler,
		AuthHandler:       authHandler,
		CodigoHandler:     codigoHandler,
		ComunicadoHandler: comunicadoHandler,
		WhatsAppHandler:   whatsappHandler,
	}
}
