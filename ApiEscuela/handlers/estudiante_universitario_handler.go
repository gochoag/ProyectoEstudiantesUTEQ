package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type EstudianteUniversitarioHandler struct {
	estudianteUnivRepo *repositories.EstudianteUniversitarioRepository
	personaRepo        *repositories.PersonaRepository
}

func NewEstudianteUniversitarioHandler(estudianteUnivRepo *repositories.EstudianteUniversitarioRepository, personaRepo *repositories.PersonaRepository) *EstudianteUniversitarioHandler {
	return &EstudianteUniversitarioHandler{
		estudianteUnivRepo: estudianteUnivRepo,
		personaRepo:        personaRepo,
	}
}

// CreateEstudianteUniversitario crea un nuevo estudiante universitario
func (h *EstudianteUniversitarioHandler) CreateEstudianteUniversitario(c *fiber.Ctx) error {
	var estudiante models.EstudianteUniversitario

	// Parsear JSON
	if err := c.BodyParser(&estudiante); err != nil {
		return SendError(c, 400, "json_invalido", "No se puede procesar el JSON. Verifique el formato de los datos", err.Error())
	}

	// Validar campos requeridos
	if validationErrors := h.validateEstudianteUniversitarioRequiredFields(&estudiante); len(validationErrors) > 0 {
		return SendValidationError(c, "Faltan campos requeridos", validationErrors)
	}

	// Validar datos completos
	if validationErrors := h.validateEstudianteUniversitario(&estudiante, false); len(validationErrors) > 0 {
		return SendValidationError(c, "Los datos proporcionados no son válidos", validationErrors)
	}

	// Verificar que el PersonaID sea válido
	if estudiante.PersonaID == 0 {
		return SendError(c, 400, "persona_id_invalido", "El ID de la persona es requerido", "Proporcione un persona_id válido mayor que 0")
	}

	// Verificar que la persona existe (validación de relación)
	if !h.personaExists(estudiante.PersonaID) {
		return SendError(c, 400, "persona_no_existe", "No se encontró la persona con el ID especificado", "Verifique que el persona_id sea correcto y que la persona exista en el sistema")
	}

	// Verificar si la persona ya tiene un registro de estudiante universitario
	if existingEstudiante, _ := h.estudianteUnivRepo.GetEstudianteUniversitarioByPersona(estudiante.PersonaID); existingEstudiante != nil {
		return SendError(c, 409, "estudiante_univ_duplicado", "La persona ya tiene un registro de estudiante universitario", "Una persona solo puede tener un registro de estudiante universitario")
	}

	// Crear estudiante universitario
	if err := h.estudianteUnivRepo.CreateEstudianteUniversitario(&estudiante); err != nil {
		// Manejar errores específicos del repositorio
		switch err.Error() {
		case "estudiante universitario ya existe":
			return SendError(c, 409, "estudiante_univ_duplicado", "La persona ya tiene un registro de estudiante universitario", "Una persona solo puede tener un registro de estudiante universitario")
		default:
			return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudo crear el estudiante universitario")
		}
	}

	return SendSuccess(c, 201, estudiante)
}

// GetEstudianteUniversitario obtiene un estudiante universitario por ID
func (h *EstudianteUniversitarioHandler) GetEstudianteUniversitario(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "id_faltante", "El ID del estudiante universitario es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "id_invalido", "El ID del estudiante universitario no es válido", "El ID debe ser un número entero positivo")
	}

	estudiante, err := h.estudianteUnivRepo.GetEstudianteUniversitarioByID(uint(id))
	if err != nil {
		return SendError(c, 404, "estudiante_univ_no_encontrado", "No se encontró el estudiante universitario solicitado", "Verifique que el ID sea correcto")
	}

	return SendSuccess(c, 200, estudiante)
}

// GetAllEstudiantesUniversitarios obtiene todos los estudiantes universitarios
func (h *EstudianteUniversitarioHandler) GetAllEstudiantesUniversitarios(c *fiber.Ctx) error {
	estudiantes, err := h.estudianteUnivRepo.GetAllEstudiantesUniversitarios()
	if err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudieron obtener los estudiantes universitarios")
	}

	return SendSuccess(c, 200, estudiantes)
}

// UpdateEstudianteUniversitario actualiza un estudiante universitario
func (h *EstudianteUniversitarioHandler) UpdateEstudianteUniversitario(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "id_faltante", "El ID del estudiante universitario es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "id_invalido", "El ID del estudiante universitario no es válido", "El ID debe ser un número entero positivo")
	}

	// Verificar que el estudiante existe
	existingEstudiante, err := h.estudianteUnivRepo.GetEstudianteUniversitarioByID(uint(id))
	if err != nil {
		return SendError(c, 404, "estudiante_univ_no_encontrado", "No se encontró el estudiante universitario solicitado", "Verifique que el ID sea correcto")
	}

	// Parsear datos de actualización
	var updateData models.EstudianteUniversitario
	if err := c.BodyParser(&updateData); err != nil {
		return SendError(c, 400, "json_invalido", "No se puede procesar el JSON. Verifique el formato de los datos", err.Error())
	}

	// Validar datos de actualización
	if validationErrors := h.validateEstudianteUniversitario(&updateData, true); len(validationErrors) > 0 {
		return SendValidationError(c, "Los datos proporcionados no son válidos", validationErrors)
	}

	// Verificar si la nueva persona ya tiene un registro de estudiante universitario (si cambia la persona)
	if updateData.PersonaID != existingEstudiante.PersonaID {
		// Verificar que la nueva persona existe
		if !h.personaExists(updateData.PersonaID) {
			return SendError(c, 400, "persona_no_existe", "No se encontró la persona con el ID especificado", "Verifique que el persona_id sea correcto y que la persona exista en el sistema")
		}

		if existingEstudianteByPersona, _ := h.estudianteUnivRepo.GetEstudianteUniversitarioByPersona(updateData.PersonaID); existingEstudianteByPersona != nil {
			return SendError(c, 409, "estudiante_univ_duplicado", "La persona ya tiene un registro de estudiante universitario", "Una persona solo puede tener un registro de estudiante universitario")
		}
	}

	// Actualizar campos
	existingEstudiante.PersonaID = updateData.PersonaID
	existingEstudiante.Semestre = updateData.Semestre

	// Guardar cambios
	if err := h.estudianteUnivRepo.UpdateEstudianteUniversitario(existingEstudiante); err != nil {
		// Manejar errores específicos del repositorio
		switch err.Error() {
		case "estudiante universitario ya existe":
			return SendError(c, 409, "estudiante_univ_duplicado", "La persona ya tiene un registro de estudiante universitario", "Una persona solo puede tener un registro de estudiante universitario")
		default:
			return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudo actualizar el estudiante universitario")
		}
	}

	return SendSuccess(c, 200, existingEstudiante)
}

// DeleteEstudianteUniversitario elimina un estudiante universitario
func (h *EstudianteUniversitarioHandler) DeleteEstudianteUniversitario(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "id_faltante", "El ID del estudiante universitario es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "id_invalido", "El ID del estudiante universitario no es válido", "El ID debe ser un número entero positivo")
	}

	// Verificar que el estudiante existe
	estudiante, err := h.estudianteUnivRepo.GetEstudianteUniversitarioByID(uint(id))
	if err != nil {
		return SendError(c, 404, "estudiante_univ_no_encontrado", "No se encontró el estudiante universitario solicitado", "Verifique que el ID sea correcto")
	}

	// Verificar si el estudiante tiene relaciones activas
	if len(estudiante.VisitaDetalleEstudiantesUniversitarios) > 0 {
		return SendError(c, 409, "estudiante_univ_en_uso", "No se puede eliminar el estudiante porque está siendo utilizado", "El estudiante tiene relaciones activas que impiden su eliminación")
	}

	// Eliminar estudiante universitario
	if err := h.estudianteUnivRepo.DeleteEstudianteUniversitario(uint(id)); err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudo eliminar el estudiante universitario")
	}

	return SendSuccess(c, 200, fiber.Map{
		"message": "Estudiante universitario eliminado exitosamente",
		"id":      id,
	})
}

// GetEstudiantesUniversitariosBySemestre obtiene estudiantes por semestre
func (h *EstudianteUniversitarioHandler) GetEstudiantesUniversitariosBySemestre(c *fiber.Ctx) error {
	semestreStr := c.Params("semestre")
	if semestreStr == "" {
		return SendError(c, 400, "semestre_faltante", "El semestre es requerido", "Proporcione un semestre válido")
	}

	semestre, err := strconv.Atoi(semestreStr)
	if err != nil {
		return SendError(c, 400, "semestre_invalido", "El semestre no es válido", "El semestre debe ser un número entero")
	}

	// Validar parámetro de búsqueda
	if validationErrors := h.validateEstudianteUniversitarioSearchParams(semestre); len(validationErrors) > 0 {
		return SendValidationError(c, "Los parámetros de búsqueda no son válidos", validationErrors)
	}

	estudiantes, err := h.estudianteUnivRepo.GetEstudiantesUniversitariosBySemestre(semestre)
	if err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudieron obtener los estudiantes universitarios")
	}

	return SendSuccess(c, 200, estudiantes)
}

// GetEstudianteUniversitarioByPersona obtiene estudiante universitario por persona
func (h *EstudianteUniversitarioHandler) GetEstudianteUniversitarioByPersona(c *fiber.Ctx) error {
	personaIDStr := c.Params("persona_id")
	if personaIDStr == "" {
		return SendError(c, 400, "persona_id_faltante", "El ID de la persona es requerido", "Proporcione un ID válido")
	}

	personaID, err := strconv.Atoi(personaIDStr)
	if err != nil || personaID <= 0 {
		return SendError(c, 400, "persona_id_invalido", "El ID de la persona no es válido", "El ID debe ser un número entero positivo")
	}

	estudiante, err := h.estudianteUnivRepo.GetEstudianteUniversitarioByPersona(uint(personaID))
	if err != nil {
		return SendError(c, 404, "estudiante_univ_no_encontrado", "No se encontró el estudiante universitario para esta persona", "Verifique que el ID de persona sea correcto")
	}

	return SendSuccess(c, 200, estudiante)
}

// validateEstudianteUniversitario valida los datos de un estudiante universitario
func (h *EstudianteUniversitarioHandler) validateEstudianteUniversitario(estudiante *models.EstudianteUniversitario, isUpdate bool) []ValidationError {
	var errors []ValidationError

	// Validar PersonaID
	if estudiante.PersonaID == 0 {
		errors = append(errors, ValidationError{
			Field:   "persona_id",
			Message: "El ID de la persona es requerido",
		})
	}

	// Validar Semestre (opcional pero si se proporciona debe ser válido)
	if estudiante.Semestre < 0 {
		errors = append(errors, ValidationError{
			Field:   "semestre",
			Message: "El semestre no puede ser negativo",
			Value:   strconv.Itoa(estudiante.Semestre),
		})
	} else if estudiante.Semestre > 0 && estudiante.Semestre > 20 { // Máximo 20 semestres (10 años)
		errors = append(errors, ValidationError{
			Field:   "semestre",
			Message: "El semestre no puede exceder 20 (10 años)",
			Value:   strconv.Itoa(estudiante.Semestre),
		})
	}

	return errors
}

// validateEstudianteUniversitarioRequiredFields valida que los campos requeridos estén presentes
func (h *EstudianteUniversitarioHandler) validateEstudianteUniversitarioRequiredFields(estudiante *models.EstudianteUniversitario) []ValidationError {
	var errors []ValidationError

	if estudiante.PersonaID == 0 {
		errors = append(errors, ValidationError{
			Field:   "persona_id",
			Message: "El campo persona_id es requerido",
		})
	}

	return errors
}

// validateEstudianteUniversitarioSearchParams valida los parámetros de búsqueda
func (h *EstudianteUniversitarioHandler) validateEstudianteUniversitarioSearchParams(semestre int) []ValidationError {
	var errors []ValidationError

	// Validar semestre de búsqueda
	if semestre < 0 {
		errors = append(errors, ValidationError{
			Field:   "semestre",
			Message: "El semestre de búsqueda no puede ser negativo",
			Value:   string(rune(semestre)),
		})
	}

	if semestre > 20 { // Máximo 20 semestres (10 años)
		errors = append(errors, ValidationError{
			Field:   "semestre",
			Message: "El semestre de búsqueda no puede exceder 20 (10 años)",
			Value:   string(rune(semestre)),
		})
	}

	return errors
}

// personaExists verifica si una persona existe en la base de datos
func (h *EstudianteUniversitarioHandler) personaExists(personaID uint) bool {
	if personaID == 0 {
		return false
	}

	var count int64
	err := h.personaRepo.GetDB().Model(&models.Persona{}).Where("id = ?", personaID).Count(&count).Error
	return err == nil && count > 0
}
