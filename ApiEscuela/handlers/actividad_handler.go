package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"regexp"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type ActividadHandler struct {
	actividadRepo *repositories.ActividadRepository
}

func NewActividadHandler(actividadRepo *repositories.ActividadRepository) *ActividadHandler {
	return &ActividadHandler{actividadRepo: actividadRepo}
}

// CreateActividad crea una nueva actividad
func (h *ActividadHandler) CreateActividad(c *fiber.Ctx) error {
	var actividad models.Actividad

	// Parsear JSON
	if err := c.BodyParser(&actividad); err != nil {
		return SendError(c, 400, "invalid_json", "No se puede procesar el JSON. Verifique el formato de los datos", err.Error())
	}

	// Validar campos requeridos
	if validationErrors := h.validateActividadRequiredFields(&actividad); len(validationErrors) > 0 {
		return SendValidationError(c, "Faltan campos requeridos", validationErrors)
	}

	// Validar datos completos
	if validationErrors := h.validateActividad(&actividad, false); len(validationErrors) > 0 {
		return SendValidationError(c, "Los datos proporcionados no son válidos", validationErrors)
	}

	// Limpiar datos
	actividad.Actividad = strings.TrimSpace(actividad.Actividad)

	// Crear actividad
	if err := h.actividadRepo.CreateActividad(&actividad); err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudo crear la actividad")
	}

	return SendSuccess(c, 201, actividad)
}

// GetActividad obtiene una actividad por ID
func (h *ActividadHandler) GetActividad(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "missing_id", "El ID de la actividad es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "invalid_id", "El ID de la actividad no es válido", "El ID debe ser un número entero positivo")
	}

	actividad, err := h.actividadRepo.GetActividadByID(uint(id))
	if err != nil {
		return SendError(c, 404, "actividad_not_found", "No se encontró la actividad solicitada", "Verifique que el ID sea correcto")
	}

	return SendSuccess(c, 200, actividad)
}

// GetAllActividades obtiene todas las actividades
func (h *ActividadHandler) GetAllActividades(c *fiber.Ctx) error {
	actividades, err := h.actividadRepo.GetAllActividades()
	if err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudieron obtener las actividades")
	}

	return SendSuccess(c, 200, actividades)
}

// UpdateActividad actualiza una actividad
func (h *ActividadHandler) UpdateActividad(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "missing_id", "El ID de la actividad es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "invalid_id", "El ID de la actividad no es válido", "El ID debe ser un número entero positivo")
	}

	// Verificar que la actividad existe
	existingActividad, err := h.actividadRepo.GetActividadByID(uint(id))
	if err != nil {
		return SendError(c, 404, "actividad_not_found", "No se encontró la actividad solicitada", "Verifique que el ID sea correcto")
	}

	// Parsear datos de actualización
	var updateData models.Actividad
	if err := c.BodyParser(&updateData); err != nil {
		return SendError(c, 400, "invalid_json", "No se puede procesar el JSON. Verifique el formato de los datos", err.Error())
	}

	// Validar datos de actualización
	if validationErrors := h.validateActividad(&updateData, true); len(validationErrors) > 0 {
		return SendValidationError(c, "Los datos proporcionados no son válidos", validationErrors)
	}

	// Actualizar campos
	existingActividad.Actividad = strings.TrimSpace(updateData.Actividad)
	existingActividad.TematicaID = updateData.TematicaID
	existingActividad.Duracion = updateData.Duracion

	// Guardar cambios
	if err := h.actividadRepo.UpdateActividad(existingActividad); err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudo actualizar la actividad")
	}

	return SendSuccess(c, 200, existingActividad)
}

// DeleteActividad elimina una actividad
func (h *ActividadHandler) DeleteActividad(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "missing_id", "El ID de la actividad es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "invalid_id", "El ID de la actividad no es válido", "El ID debe ser un número entero positivo")
	}

	// Verificar que la actividad existe
	_, err = h.actividadRepo.GetActividadByID(uint(id))
	if err != nil {
		return SendError(c, 404, "actividad_not_found", "No se encontró la actividad solicitada", "Verifique que el ID sea correcto")
	}

	// Eliminar actividad
	if err := h.actividadRepo.DeleteActividad(uint(id)); err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudo eliminar la actividad")
	}

	return SendSuccess(c, 200, fiber.Map{
		"message": "Actividad eliminada exitosamente",
		"id":      id,
	})
}

// GetActividadesByTematica obtiene actividades por temática
func (h *ActividadHandler) GetActividadesByTematica(c *fiber.Ctx) error {
	tematicaIDStr := c.Params("tematica_id")
	if tematicaIDStr == "" {
		return SendError(c, 400, "missing_tematica_id", "El ID de la temática es requerido", "Proporcione un ID válido")
	}

	tematicaID, err := strconv.Atoi(tematicaIDStr)
	if err != nil || tematicaID <= 0 {
		return SendError(c, 400, "invalid_tematica_id", "El ID de la temática no es válido", "El ID debe ser un número entero positivo")
	}

	actividades, err := h.actividadRepo.GetActividadesByTematica(uint(tematicaID))
	if err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudieron obtener las actividades")
	}

	return SendSuccess(c, 200, actividades)
}

// GetActividadesByNombre busca actividades por nombre
func (h *ActividadHandler) GetActividadesByNombre(c *fiber.Ctx) error {
	nombre := c.Params("nombre")

	// Validar parámetro de búsqueda
	if validationErrors := h.validateActividadSearchParams(nombre, 0, 0); len(validationErrors) > 0 {
		return SendValidationError(c, "Los parámetros de búsqueda no son válidos", validationErrors)
	}

	actividades, err := h.actividadRepo.GetActividadesByNombre(nombre)
	if err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudieron obtener las actividades")
	}

	return SendSuccess(c, 200, actividades)
}

// GetActividadesByDuracion obtiene actividades por rango de duración
func (h *ActividadHandler) GetActividadesByDuracion(c *fiber.Ctx) error {
	duracionMinStr := c.Query("min", "0")
	duracionMaxStr := c.Query("max", "1440") // 24 horas por defecto

	duracionMin, err := strconv.Atoi(duracionMinStr)
	if err != nil {
		return SendError(c, 400, "invalid_duracion_min", "La duración mínima no es válida", "La duración debe ser un número entero")
	}

	duracionMax, err := strconv.Atoi(duracionMaxStr)
	if err != nil {
		return SendError(c, 400, "invalid_duracion_max", "La duración máxima no es válida", "La duración debe ser un número entero")
	}

	// Validar parámetros de duración
	if validationErrors := h.validateActividadSearchParams("", duracionMin, duracionMax); len(validationErrors) > 0 {
		return SendValidationError(c, "Los parámetros de duración no son válidos", validationErrors)
	}

	actividades, err := h.actividadRepo.GetActividadesByDuracion(duracionMin, duracionMax)
	if err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudieron obtener las actividades")
	}

	return SendSuccess(c, 200, actividades)
}

// validateActividad valida los datos de una actividad
func (h *ActividadHandler) validateActividad(actividad *models.Actividad, isUpdate bool) []ValidationError {
	var errors []ValidationError

	// Validar Actividad (nombre de la actividad)
	if strings.TrimSpace(actividad.Actividad) == "" {
		errors = append(errors, ValidationError{
			Field:   "actividad",
			Message: "El nombre de la actividad es requerido",
			Value:   actividad.Actividad,
		})
	} else if len(strings.TrimSpace(actividad.Actividad)) < 3 {
		errors = append(errors, ValidationError{
			Field:   "actividad",
			Message: "El nombre de la actividad debe tener al menos 3 caracteres",
			Value:   actividad.Actividad,
		})
	} else if len(strings.TrimSpace(actividad.Actividad)) > 200 {
		errors = append(errors, ValidationError{
			Field:   "actividad",
			Message: "El nombre de la actividad no puede exceder 200 caracteres",
			Value:   actividad.Actividad,
		})
	} else {
		// Validar que no contenga solo espacios o caracteres especiales
		trimmed := strings.TrimSpace(actividad.Actividad)
		if len(trimmed) == 0 {
			errors = append(errors, ValidationError{
				Field:   "actividad",
				Message: "El nombre de la actividad no puede contener solo espacios",
				Value:   actividad.Actividad,
			})
		}

		// Validar que no contenga caracteres especiales problemáticos
		specialCharsRegex := regexp.MustCompile(`[<>{}[\]\\|` + "`" + `~!@#$%^&*()+=;:'"<>?/]`)
		if specialCharsRegex.MatchString(trimmed) {
			errors = append(errors, ValidationError{
				Field:   "actividad",
				Message: "El nombre de la actividad no puede contener caracteres especiales",
				Value:   actividad.Actividad,
			})
		}
	}

	// Validar TematicaID
	if actividad.TematicaID == 0 {
		errors = append(errors, ValidationError{
			Field:   "tematica_id",
			Message: "El ID de la temática es requerido",
		})
	}

	// Validar Duracion (opcional pero si se proporciona debe ser válida)
	if actividad.Duracion < 0 {
		errors = append(errors, ValidationError{
			Field:   "duracion",
			Message: "La duración no puede ser negativa",
			Value:   string(rune(actividad.Duracion)),
		})
	} else if actividad.Duracion > 1440 { // 24 horas en minutos
		errors = append(errors, ValidationError{
			Field:   "duracion",
			Message: "La duración no puede exceder 1440 minutos (24 horas)",
			Value:   string(rune(actividad.Duracion)),
		})
	}

	return errors
}

// validateActividadRequiredFields valida que los campos requeridos estén presentes
func (h *ActividadHandler) validateActividadRequiredFields(actividad *models.Actividad) []ValidationError {
	var errors []ValidationError

	if strings.TrimSpace(actividad.Actividad) == "" {
		errors = append(errors, ValidationError{
			Field:   "actividad",
			Message: "El campo actividad es requerido",
		})
	}

	if actividad.TematicaID == 0 {
		errors = append(errors, ValidationError{
			Field:   "tematica_id",
			Message: "El campo tematica_id es requerido",
		})
	}

	return errors
}

// validateActividadSearchParams valida los parámetros de búsqueda
func (h *ActividadHandler) validateActividadSearchParams(nombre string, duracionMin, duracionMax int) []ValidationError {
	var errors []ValidationError

	// Validar nombre de búsqueda
	if strings.TrimSpace(nombre) != "" {
		if len(strings.TrimSpace(nombre)) < 2 {
			errors = append(errors, ValidationError{
				Field:   "nombre",
				Message: "El término de búsqueda debe tener al menos 2 caracteres",
				Value:   nombre,
			})
		}
	}

	// Validar rango de duración
	if duracionMin < 0 {
		errors = append(errors, ValidationError{
			Field:   "duracion_min",
			Message: "La duración mínima no puede ser negativa",
			Value:   string(rune(duracionMin)),
		})
	}

	if duracionMax < 0 {
		errors = append(errors, ValidationError{
			Field:   "duracion_max",
			Message: "La duración máxima no puede ser negativa",
			Value:   string(rune(duracionMax)),
		})
	}

	if duracionMin > duracionMax {
		errors = append(errors, ValidationError{
			Field:   "duracion_range",
			Message: "La duración mínima no puede ser mayor que la máxima",
			Value:   string(rune(duracionMin)) + " > " + string(rune(duracionMax)),
		})
	}

	if duracionMax > 1440 { // 24 horas en minutos
		errors = append(errors, ValidationError{
			Field:   "duracion_max",
			Message: "La duración máxima no puede exceder 1440 minutos (24 horas)",
			Value:   string(rune(duracionMax)),
		})
	}

	return errors
}
