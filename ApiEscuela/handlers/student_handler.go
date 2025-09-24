package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type EstudianteHandler struct {
	estudianteRepo  *repositories.EstudianteRepository
	personaRepo     *repositories.PersonaRepository
	institucionRepo *repositories.InstitucionRepository
	ciudadRepo      *repositories.CiudadRepository
}

func NewEstudianteHandler(estudianteRepo *repositories.EstudianteRepository, personaRepo *repositories.PersonaRepository, institucionRepo *repositories.InstitucionRepository, ciudadRepo *repositories.CiudadRepository) *EstudianteHandler {
	return &EstudianteHandler{
		estudianteRepo:  estudianteRepo,
		personaRepo:     personaRepo,
		institucionRepo: institucionRepo,
		ciudadRepo:      ciudadRepo,
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
