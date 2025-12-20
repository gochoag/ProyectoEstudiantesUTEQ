package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"ApiEscuela/services"
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type EstudianteHandler struct {
	estudianteRepo  *repositories.EstudianteRepository
	personaRepo     *repositories.PersonaRepository
	institucionRepo *repositories.InstitucionRepository
	ciudadRepo      *repositories.CiudadRepository
	usuarioRepo     *repositories.UsuarioRepository
	tipoUsuarioRepo *repositories.TipoUsuarioRepository
	authService     *services.AuthService
}

func NewEstudianteHandler(
	estudianteRepo *repositories.EstudianteRepository,
	personaRepo *repositories.PersonaRepository,
	institucionRepo *repositories.InstitucionRepository,
	ciudadRepo *repositories.CiudadRepository,
	usuarioRepo *repositories.UsuarioRepository,
	tipoUsuarioRepo *repositories.TipoUsuarioRepository,
	authService *services.AuthService,
) *EstudianteHandler {
	return &EstudianteHandler{
		estudianteRepo:  estudianteRepo,
		personaRepo:     personaRepo,
		institucionRepo: institucionRepo,
		ciudadRepo:      ciudadRepo,
		usuarioRepo:     usuarioRepo,
		tipoUsuarioRepo: tipoUsuarioRepo,
		authService:     authService,
	}
}

// CreateEstudiante crea un nuevo estudiante
func (h *EstudianteHandler) CreateEstudiante(c *fiber.Ctx) error {
	var estudiante models.Estudiante

	// Parsear JSON
	if err := c.BodyParser(&estudiante); err != nil {
		return SendError(c, 400, "json_invalido", "No se puede procesar el JSON. Verifique el formato de los datos", err.Error())
	}

	// Validar campos requeridos
	if validationErrors := h.validateEstudianteRequiredFields(&estudiante); len(validationErrors) > 0 {
		return SendValidationError(c, "Faltan campos requeridos", validationErrors)
	}

	// Validar datos completos
	if validationErrors := h.validateEstudiante(&estudiante, false); len(validationErrors) > 0 {
		return SendValidationError(c, "Los datos proporcionados no son válidos", validationErrors)
	}

	// Limpiar datos
	estudiante.Especialidad = strings.TrimSpace(estudiante.Especialidad)
	// Validar que redsocial sea JSON válido si se proporciona
	if len(estudiante.RedSocial) > 0 {
		if !isValidJSON(estudiante.RedSocial) {
			return SendError(c, 400, "redsocial_invalido", "El campo redsocial debe ser un JSON válido", "Verifique el formato JSON del campo redsocial")
		}
	}

	// Verificar que los IDs sean válidos
	if estudiante.PersonaID == 0 {
		return SendError(c, 400, "persona_id_invalido", "El ID de la persona es requerido", "Proporcione un persona_id válido mayor que 0")
	}
	if estudiante.InstitucionID == 0 {
		return SendError(c, 400, "institucion_id_invalido", "El ID de la institución es requerido", "Proporcione un institucion_id válido mayor que 0")
	}
	if estudiante.CiudadID == 0 {
		return SendError(c, 400, "ciudad_id_invalido", "El ID de la ciudad es requerido", "Proporcione un ciudad_id válido mayor que 0")
	}

	// Verificar que las relaciones existen (validación de relaciones)
	if !h.personaExists(estudiante.PersonaID) {
		return SendError(c, 400, "persona_no_existe", "No se encontró la persona con el ID especificado", "Verifique que el persona_id sea correcto y que la persona exista en el sistema")
	}
	if !h.institucionExists(estudiante.InstitucionID) {
		return SendError(c, 400, "institucion_no_existe", "No se encontró la institución con el ID especificado", "Verifique que el institucion_id sea correcto y que la institución exista en el sistema")
	}
	if !h.ciudadExists(estudiante.CiudadID) {
		return SendError(c, 400, "ciudad_no_existe", "No se encontró la ciudad con el ID especificado", "Verifique que el ciudad_id sea correcto y que la ciudad exista en el sistema")
	}

	// Crear estudiante
	if err := h.estudianteRepo.CreateEstudiante(&estudiante); err != nil {
		// Manejar errores específicos del repositorio
		switch err.Error() {
		case "estudiante ya existe":
			return SendError(c, 409, "estudiante_duplicado", "La persona ya tiene un registro de estudiante", "Una persona solo puede tener un registro de estudiante")
		default:
			return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudo crear el estudiante")
		}
	}

	return SendSuccess(c, 201, estudiante)
}

// GetEstudiante obtiene un estudiante por ID
func (h *EstudianteHandler) GetEstudiante(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "id_faltante", "El ID del estudiante es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "id_invalido", "El ID del estudiante no es válido", "El ID debe ser un número entero positivo")
	}

	estudiante, err := h.estudianteRepo.GetEstudianteByID(uint(id))
	if err != nil {
		return SendError(c, 404, "estudiante_no_encontrado", "No se encontró el estudiante solicitado", "Verifique que el ID sea correcto")
	}

	return SendSuccess(c, 200, estudiante)
}

// GetAllEstudiantes obtiene todos los estudiantes activos
func (h *EstudianteHandler) GetAllEstudiantes(c *fiber.Ctx) error {
	estudiantes, err := h.estudianteRepo.GetAllEstudiantes()
	if err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudieron obtener los estudiantes")
	}

	return SendSuccess(c, 200, estudiantes)
}

// GetAllEstudiantesIncludingDeleted obtiene todos los estudiantes incluyendo los eliminados
func (h *EstudianteHandler) GetAllEstudiantesIncludingDeleted(c *fiber.Ctx) error {
	estudiantes, err := h.estudianteRepo.GetAllEstudiantesIncludingDeleted()
	if err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudieron obtener los estudiantes")
	}

	return SendSuccess(c, 200, estudiantes)
}

// GetDeletedEstudiantes obtiene solo los estudiantes eliminados
func (h *EstudianteHandler) GetDeletedEstudiantes(c *fiber.Ctx) error {
	estudiantes, err := h.estudianteRepo.GetDeletedEstudiantes()
	if err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudieron obtener los estudiantes eliminados")
	}

	return SendSuccess(c, 200, estudiantes)
}

// UpdateEstudiante actualiza un estudiante
func (h *EstudianteHandler) UpdateEstudiante(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "id_faltante", "El ID del estudiante es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "id_invalido", "El ID del estudiante no es válido", "El ID debe ser un número entero positivo")
	}

	// Verificar que el estudiante existe
	existingEstudiante, err := h.estudianteRepo.GetEstudianteByID(uint(id))
	if err != nil {
		return SendError(c, 404, "estudiante_no_encontrado", "No se encontró el estudiante solicitado", "Verifique que el ID sea correcto")
	}

	// Parsear datos de actualización
	var updateData models.Estudiante
	if err := c.BodyParser(&updateData); err != nil {
		return SendError(c, 400, "json_invalido", "No se puede procesar el JSON. Verifique el formato de los datos", err.Error())
	}

	// Validar datos de actualización
	if validationErrors := h.validateEstudiante(&updateData, true); len(validationErrors) > 0 {
		return SendValidationError(c, "Los datos proporcionados no son válidos", validationErrors)
	}

	// Verificar si la nueva persona ya tiene un registro de estudiante (si cambia la persona)
	if updateData.PersonaID != existingEstudiante.PersonaID {
		// Verificar si existe otro estudiante con la nueva persona
		estudiantes, _ := h.estudianteRepo.GetAllEstudiantes()
		for _, est := range estudiantes {
			if est.PersonaID == updateData.PersonaID && est.ID != uint(id) {
				return SendError(c, 409, "estudiante_duplicado", "La persona ya tiene un registro de estudiante", "Una persona solo puede tener un registro de estudiante")
			}
		}
	}

	// Actualizar campos
	existingEstudiante.PersonaID = updateData.PersonaID
	existingEstudiante.InstitucionID = updateData.InstitucionID
	existingEstudiante.CiudadID = updateData.CiudadID
	existingEstudiante.Especialidad = strings.TrimSpace(updateData.Especialidad)

	// Actualizar redsocial si se proporciona (validar JSON)
	// Verificar si el campo redsocial está presente en el JSON del body
	bodyBytes := c.Body()
	if len(bodyBytes) > 0 {
		var bodyMap map[string]interface{}
		if err := json.Unmarshal(bodyBytes, &bodyMap); err == nil {
			if _, exists := bodyMap["redsocial"]; exists {
				// El campo está presente en el JSON
				if len(updateData.RedSocial) > 0 {
					// Validar que sea JSON válido
					if !isValidJSON(updateData.RedSocial) {
						return SendError(c, 400, "redsocial_invalido", "El campo redsocial debe ser un JSON válido", "Verifique el formato JSON del campo redsocial")
					}
					existingEstudiante.RedSocial = updateData.RedSocial
				} else {
					// Se envió null o vacío explícitamente, limpiar el campo
					existingEstudiante.RedSocial = nil
				}
			}
			// Si no existe en el bodyMap, no actualizar el campo (mantener el valor existente)
		}
	}

	// Guardar cambios
	if err := h.estudianteRepo.UpdateEstudiante(existingEstudiante); err != nil {
		// Manejar errores específicos del repositorio
		switch err.Error() {
		case "estudiante ya existe":
			return SendError(c, 409, "estudiante_duplicado", "La persona ya tiene un registro de estudiante", "Una persona solo puede tener un registro de estudiante")
		default:
			return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudo actualizar el estudiante")
		}
	}

	return SendSuccess(c, 200, existingEstudiante)
}

// DeleteEstudiante elimina un estudiante y en cascada su usuario y persona
func (h *EstudianteHandler) DeleteEstudiante(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "id_faltante", "El ID del estudiante es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "id_invalido", "El ID del estudiante no es válido", "El ID debe ser un número entero positivo")
	}

	// Verificar que el estudiante existe
	estudiante, err := h.estudianteRepo.GetEstudianteByID(uint(id))
	if err != nil {
		return SendError(c, 404, "estudiante_no_encontrado", "No se encontró el estudiante solicitado", "Verifique que el ID sea correcto")
	}

	// Verificar si el estudiante tiene relaciones activas
	if len(estudiante.Dudas) > 0 {
		return SendError(c, 409, "estudiante_en_uso", "No se puede eliminar el estudiante porque está siendo utilizado", "El estudiante tiene relaciones activas que impiden su eliminación")
	}

	// Eliminar estudiante
	if err := h.estudianteRepo.DeleteEstudiante(uint(id)); err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudo eliminar el estudiante y sus datos relacionados")
	}

	return SendSuccess(c, 200, fiber.Map{
		"message": "Estudiante, usuario y persona eliminados exitosamente",
		"id":      id,
	})
}

// RestoreEstudiante restaura un estudiante eliminado y en cascada su usuario y persona
func (h *EstudianteHandler) RestoreEstudiante(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "missing_id", "El ID del estudiante es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "invalid_id", "El ID del estudiante no es válido", "El ID debe ser un número entero positivo")
	}

	// Restaurar estudiante
	if err := h.estudianteRepo.RestoreEstudiante(uint(id)); err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudo restaurar el estudiante y sus datos relacionados")
	}

	return SendSuccess(c, 200, fiber.Map{
		"message": "Estudiante, usuario y persona restaurados exitosamente",
		"id":      id,
	})
}

// GetEstudiantesByCity obtiene estudiantes por ciudad
func (h *EstudianteHandler) GetEstudiantesByCity(c *fiber.Ctx) error {
	ciudadIDStr := c.Params("ciudad_id")
	if ciudadIDStr == "" {
		return SendError(c, 400, "ciudad_id_faltante", "El ID de la ciudad es requerido", "Proporcione un ID válido")
	}

	ciudadID, err := strconv.Atoi(ciudadIDStr)
	if err != nil || ciudadID <= 0 {
		return SendError(c, 400, "ciudad_id_invalido", "El ID de la ciudad no es válido", "El ID debe ser un número entero positivo")
	}

	estudiantes, err := h.estudianteRepo.GetEstudiantesByCity(uint(ciudadID))
	if err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudieron obtener los estudiantes")
	}

	return SendSuccess(c, 200, estudiantes)
}

// GetEstudiantesByInstitucion obtiene estudiantes por institución
func (h *EstudianteHandler) GetEstudiantesByInstitucion(c *fiber.Ctx) error {
	institucionIDStr := c.Params("institucion_id")
	if institucionIDStr == "" {
		return SendError(c, 400, "institucion_id_faltante", "El ID de la institución es requerido", "Proporcione un ID válido")
	}

	institucionID, err := strconv.Atoi(institucionIDStr)
	if err != nil || institucionID <= 0 {
		return SendError(c, 400, "institucion_id_invalido", "El ID de la institución no es válido", "El ID debe ser un número entero positivo")
	}

	estudiantes, err := h.estudianteRepo.GetEstudiantesByInstitucion(uint(institucionID))
	if err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudieron obtener los estudiantes")
	}

	return SendSuccess(c, 200, estudiantes)
}

// GetEstudiantesByEspecialidad obtiene estudiantes por especialidad
func (h *EstudianteHandler) GetEstudiantesByEspecialidad(c *fiber.Ctx) error {
	especialidad := c.Params("especialidad")

	// Validar parámetro de búsqueda
	if validationErrors := h.validateEstudianteSearchParams(especialidad); len(validationErrors) > 0 {
		return SendValidationError(c, "Los parámetros de búsqueda no son válidos", validationErrors)
	}

	estudiantes, err := h.estudianteRepo.GetEstudiantesByEspecialidad(especialidad)
	if err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudieron obtener los estudiantes")
	}

	return SendSuccess(c, 200, estudiantes)
}

// BulkEstudianteRequest representa un estudiante en la carga masiva
type BulkEstudianteRequest struct {
	Cedula          string `json:"cedula"`
	Nombre          string `json:"nombre"`
	Correo          string `json:"correo"`
	Telefono        string `json:"telefono"`
	FechaNacimiento string `json:"fecha_nacimiento"`
	InstitucionID   uint   `json:"institucion_id"`
	CiudadID        uint   `json:"ciudad_id"`
	Especialidad    string `json:"especialidad"`
}

// BulkEstudianteResult representa el resultado de procesar un estudiante
type BulkEstudianteResult struct {
	Fila    int    `json:"fila"`
	Cedula  string `json:"cedula"`
	Nombre  string `json:"nombre"`
	Error   string `json:"error,omitempty"`
	Usuario string `json:"usuario,omitempty"`
}

// CreateEstudiantesBulk crea múltiples estudiantes desde una carga masiva (Excel)
func (h *EstudianteHandler) CreateEstudiantesBulk(c *fiber.Ctx) error {
	var request struct {
		Estudiantes []BulkEstudianteRequest `json:"estudiantes"`
	}

	// Parsear request
	if err := c.BodyParser(&request); err != nil {
		return SendError(c, 400, "json_invalido", "No se puede procesar el JSON", err.Error())
	}

	if len(request.Estudiantes) == 0 {
		return SendError(c, 400, "lista_vacia", "No se proporcionaron estudiantes para registrar", "El array de estudiantes está vacío")
	}

	// Obtener el tipo de usuario "Estudiante"
	tipoEstudiante, err := h.tipoUsuarioRepo.GetTipoUsuarioByNombre("Estudiante")
	if err != nil {
		return SendError(c, 500, "tipo_usuario_no_encontrado", "No se encontró el tipo de usuario Estudiante", "Configure el tipo de usuario en el sistema")
	}

	var exitosos []BulkEstudianteResult
	var fallidos []BulkEstudianteResult

	for i, est := range request.Estudiantes {
		fila := i + 1 // Fila en el Excel (1-indexed, asumiendo que la fila 1 es el encabezado)
		result := BulkEstudianteResult{
			Fila:   fila,
			Cedula: est.Cedula,
			Nombre: est.Nombre,
		}

		// Validar campos requeridos
		if strings.TrimSpace(est.Cedula) == "" {
			result.Error = "La cédula es requerida"
			fallidos = append(fallidos, result)
			continue
		}
		if strings.TrimSpace(est.Nombre) == "" {
			result.Error = "El nombre es requerido"
			fallidos = append(fallidos, result)
			continue
		}
		if est.InstitucionID == 0 {
			result.Error = "La institución es requerida"
			fallidos = append(fallidos, result)
			continue
		}
		if est.CiudadID == 0 {
			result.Error = "La ciudad es requerida"
			fallidos = append(fallidos, result)
			continue
		}

		// Validar que la cédula tenga 10 dígitos
		cedula := strings.TrimSpace(est.Cedula)
		if len(cedula) != 10 {
			result.Error = "La cédula debe tener 10 dígitos"
			fallidos = append(fallidos, result)
			continue
		}

		// Verificar que institución y ciudad existen
		if !h.institucionExists(est.InstitucionID) {
			result.Error = "La institución especificada no existe"
			fallidos = append(fallidos, result)
			continue
		}
		if !h.ciudadExists(est.CiudadID) {
			result.Error = "La ciudad especificada no existe"
			fallidos = append(fallidos, result)
			continue
		}

		// Parsear fecha de nacimiento si se proporciona
		var fechaNacimiento time.Time
		if est.FechaNacimiento != "" {
			parsed, err := time.Parse("2006-01-02", est.FechaNacimiento)
			if err != nil {
				result.Error = "Formato de fecha inválido (use YYYY-MM-DD)"
				fallidos = append(fallidos, result)
				continue
			}
			fechaNacimiento = parsed
		}

		// 1. Crear Persona
		persona := &models.Persona{
			Nombre:          strings.TrimSpace(est.Nombre),
			Cedula:          cedula,
			Correo:          strings.TrimSpace(est.Correo),
			Telefono:        strings.TrimSpace(est.Telefono),
			FechaNacimiento: fechaNacimiento,
		}

		if err := h.personaRepo.CreatePersona(persona); err != nil {
			errorMsg := "Error al crear persona"
			if strings.Contains(err.Error(), "cedula") || strings.Contains(err.Error(), "duplicado") {
				errorMsg = "Ya existe una persona con esta cédula"
			} else if strings.Contains(err.Error(), "correo") {
				errorMsg = "Ya existe una persona con este correo"
			}
			result.Error = errorMsg
			fallidos = append(fallidos, result)
			continue
		}

		// 2. Crear Usuario (cédula como usuario y contraseña)
		hashedPassword, err := h.authService.HashPassword(cedula)
		if err != nil {
			// Rollback: eliminar persona
			h.personaRepo.DeletePersona(persona.ID)
			result.Error = "Error al procesar la contraseña"
			fallidos = append(fallidos, result)
			continue
		}

		usuario := &models.Usuario{
			Usuario:       cedula,
			Contraseña:    hashedPassword,
			PersonaID:     persona.ID,
			TipoUsuarioID: tipoEstudiante.ID,
		}

		if err := h.usuarioRepo.CreateUsuario(usuario); err != nil {
			// Rollback: eliminar persona
			h.personaRepo.DeletePersona(persona.ID)
			errorMsg := "Error al crear usuario"
			if strings.Contains(err.Error(), "duplicado") || strings.Contains(err.Error(), "repetido") {
				errorMsg = "Ya existe un usuario con esta cédula"
			}
			result.Error = errorMsg
			fallidos = append(fallidos, result)
			continue
		}

		// 3. Crear Estudiante
		estudiante := &models.Estudiante{
			PersonaID:     persona.ID,
			InstitucionID: est.InstitucionID,
			CiudadID:      est.CiudadID,
			Especialidad:  strings.TrimSpace(est.Especialidad),
		}

		if err := h.estudianteRepo.CreateEstudiante(estudiante); err != nil {
			// Rollback: eliminar usuario y persona
			h.usuarioRepo.DeleteUsuario(usuario.ID)
			h.personaRepo.DeletePersona(persona.ID)
			errorMsg := "Error al crear estudiante"
			if strings.Contains(err.Error(), "duplicado") || strings.Contains(err.Error(), "existe") {
				errorMsg = "Ya existe un estudiante para esta persona"
			}
			result.Error = errorMsg
			fallidos = append(fallidos, result)
			continue
		}

		// Éxito
		result.Usuario = cedula
		exitosos = append(exitosos, result)
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"success":        true,
		"total":          len(request.Estudiantes),
		"total_exitosos": len(exitosos),
		"total_fallidos": len(fallidos),
		"exitosos":       exitosos,
		"fallidos":       fallidos,
	})
}

// validateEstudiante valida los datos de un estudiante
func (h *EstudianteHandler) validateEstudiante(estudiante *models.Estudiante, isUpdate bool) []ValidationError {
	var errors []ValidationError

	// Validar PersonaID
	if estudiante.PersonaID == 0 {
		errors = append(errors, ValidationError{
			Field:   "persona_id",
			Message: "El ID de la persona es requerido",
		})
	}

	// Validar InstitucionID
	if estudiante.InstitucionID == 0 {
		errors = append(errors, ValidationError{
			Field:   "institucion_id",
			Message: "El ID de la institución es requerido",
		})
	}

	// Validar CiudadID
	if estudiante.CiudadID == 0 {
		errors = append(errors, ValidationError{
			Field:   "ciudad_id",
			Message: "El ID de la ciudad es requerido",
		})
	}

	// Validar Especialidad (opcional pero si se proporciona debe ser válida)
	if strings.TrimSpace(estudiante.Especialidad) != "" {
		trimmedEspecialidad := strings.TrimSpace(estudiante.Especialidad)

		// Validar longitud mínima
		if len(trimmedEspecialidad) < 2 {
			errors = append(errors, ValidationError{
				Field:   "especialidad",
				Message: "La especialidad debe tener al menos 2 caracteres",
				Value:   estudiante.Especialidad,
			})
		}

		// Validar longitud máxima
		if len(trimmedEspecialidad) > 100 {
			errors = append(errors, ValidationError{
				Field:   "especialidad",
				Message: "La especialidad no puede exceder 100 caracteres",
				Value:   estudiante.Especialidad,
			})
		}
	}

	return errors
}

// validateEstudianteRequiredFields valida que los campos requeridos estén presentes
func (h *EstudianteHandler) validateEstudianteRequiredFields(estudiante *models.Estudiante) []ValidationError {
	var errors []ValidationError

	if estudiante.PersonaID == 0 {
		errors = append(errors, ValidationError{
			Field:   "persona_id",
			Message: "El campo persona_id es requerido",
		})
	}

	if estudiante.InstitucionID == 0 {
		errors = append(errors, ValidationError{
			Field:   "institucion_id",
			Message: "El campo institucion_id es requerido",
		})
	}

	if estudiante.CiudadID == 0 {
		errors = append(errors, ValidationError{
			Field:   "ciudad_id",
			Message: "El campo ciudad_id es requerido",
		})
	}

	return errors
}

// validateEstudianteSearchParams valida los parámetros de búsqueda
func (h *EstudianteHandler) validateEstudianteSearchParams(especialidad string) []ValidationError {
	var errors []ValidationError

	// Validar especialidad de búsqueda (más flexible)
	if strings.TrimSpace(especialidad) != "" {
		if len(strings.TrimSpace(especialidad)) < 1 {
			errors = append(errors, ValidationError{
				Field:   "especialidad",
				Message: "El término de búsqueda de especialidad no puede estar vacío",
				Value:   especialidad,
			})
		}
	}

	return errors
}

// personaExists verifica si una persona existe en la base de datos
func (h *EstudianteHandler) personaExists(personaID uint) bool {
	if personaID == 0 {
		return false
	}

	var count int64
	err := h.personaRepo.GetDB().Model(&models.Persona{}).Where("id = ?", personaID).Count(&count).Error
	return err == nil && count > 0
}

// institucionExists verifica si una institución existe en la base de datos
func (h *EstudianteHandler) institucionExists(institucionID uint) bool {
	if institucionID == 0 {
		return false
	}

	var count int64
	err := h.institucionRepo.GetDB().Model(&models.Institucion{}).Where("id = ?", institucionID).Count(&count).Error
	return err == nil && count > 0
}

// ciudadExists verifica si una ciudad existe en la base de datos
func (h *EstudianteHandler) ciudadExists(ciudadID uint) bool {
	if ciudadID == 0 {
		return false
	}

	var count int64
	err := h.ciudadRepo.GetDB().Model(&models.Ciudad{}).Where("id = ?", ciudadID).Count(&count).Error
	return err == nil && count > 0
}

// isValidJSON verifica si un slice de bytes contiene JSON válido
func isValidJSON(data []byte) bool {
	if len(data) == 0 {
		return true // JSON vacío es válido (null)
	}
	var js interface{}
	return json.Unmarshal(data, &js) == nil
}
