package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type DudasHandler struct {
	dudasRepo *repositories.DudasRepository
}

func NewDudasHandler(dudasRepo *repositories.DudasRepository) *DudasHandler {
	return &DudasHandler{dudasRepo: dudasRepo}
}

// CreateDudas crea una nueva duda
func (h *DudasHandler) CreateDudas(c *fiber.Ctx) error {
	var duda models.Dudas

	// Parsear JSON
	if err := c.BodyParser(&duda); err != nil {
		return SendError(c, 400, "json_invalido", "No se puede procesar el JSON. Verifique el formato de los datos", err.Error())
	}

	// Validar campos requeridos
	if validationErrors := h.validateDudasRequiredFields(&duda); len(validationErrors) > 0 {
		return SendValidationError(c, "Faltan campos requeridos", validationErrors)
	}

	// Validar datos completos
	if validationErrors := h.validateDudas(&duda, false); len(validationErrors) > 0 {
		return SendValidationError(c, "Los datos proporcionados no son válidos", validationErrors)
	}

	// Crear duda
	if err := h.dudasRepo.CreateDudas(&duda); err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudo crear la duda")
	}

	return SendSuccess(c, 201, duda)
}

// GetDudas obtiene una duda por ID
func (h *DudasHandler) GetDudas(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "id_faltante", "El ID de la duda es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "id_invalido", "El ID de la duda no es válido", "El ID debe ser un número entero positivo")
	}

	duda, err := h.dudasRepo.GetDudasByID(uint(id))
	if err != nil {
		return SendError(c, 404, "duda_no_encontrada", "No se encontró la duda solicitada", "Verifique que el ID sea correcto")
	}

	return SendSuccess(c, 200, duda)
}

// GetAllDudas obtiene todas las dudas
func (h *DudasHandler) GetAllDudas(c *fiber.Ctx) error {
	dudas, err := h.dudasRepo.GetAllDudas()
	if err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudieron obtener las dudas")
	}

	return SendSuccess(c, 200, dudas)
}

// UpdateDudas actualiza una duda
func (h *DudasHandler) UpdateDudas(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "id_faltante", "El ID de la duda es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "id_invalido", "El ID de la duda no es válido", "El ID debe ser un número entero positivo")
	}

	// Verificar que la duda existe
	existingDuda, err := h.dudasRepo.GetDudasByID(uint(id))
	if err != nil {
		return SendError(c, 404, "duda_no_encontrada", "No se encontró la duda solicitada", "Verifique que el ID sea correcto")
	}

	// Parsear datos de actualización
	var updateData models.Dudas
	if err := c.BodyParser(&updateData); err != nil {
		return SendError(c, 400, "json_invalido", "No se puede procesar el JSON. Verifique el formato de los datos", err.Error())
	}

	// Validar datos de actualización
	if validationErrors := h.validateDudas(&updateData, true); len(validationErrors) > 0 {
		return SendValidationError(c, "Los datos proporcionados no son válidos", validationErrors)
	}

	// Actualizar campos
	existingDuda.Pregunta = updateData.Pregunta
	existingDuda.Respuesta = updateData.Respuesta
	existingDuda.Privacidad = updateData.Privacidad
	existingDuda.EstudianteID = updateData.EstudianteID
	existingDuda.AutoridadUTEQID = updateData.AutoridadUTEQID

	// Guardar cambios
	if err := h.dudasRepo.UpdateDudas(existingDuda); err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudo actualizar la duda")
	}

	return SendSuccess(c, 200, existingDuda)
}

// DeleteDudas elimina una duda
func (h *DudasHandler) DeleteDudas(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "id_faltante", "El ID de la duda es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "id_invalido", "El ID de la duda no es válido", "El ID debe ser un número entero positivo")
	}

	// Verificar que la duda existe
	_, err = h.dudasRepo.GetDudasByID(uint(id))
	if err != nil {
		return SendError(c, 404, "duda_no_encontrada", "No se encontró la duda solicitada", "Verifique que el ID sea correcto")
	}

	// Eliminar duda
	if err := h.dudasRepo.DeleteDudas(uint(id)); err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudo eliminar la duda")
	}

	return SendSuccess(c, 200, fiber.Map{
		"message": "Duda eliminada exitosamente",
		"id":      id,
	})
}

// GetDudasByEstudiante obtiene dudas por estudiante
func (h *DudasHandler) GetDudasByEstudiante(c *fiber.Ctx) error {
	estudianteIDStr := c.Params("estudiante_id")
	if estudianteIDStr == "" {
		return SendError(c, 400, "estudiante_id_faltante", "El ID del estudiante es requerido", "Proporcione un ID válido")
	}

	estudianteID, err := strconv.Atoi(estudianteIDStr)
	if err != nil || estudianteID <= 0 {
		return SendError(c, 400, "estudiante_id_invalido", "El ID del estudiante no es válido", "El ID debe ser un número entero positivo")
	}

	dudas, err := h.dudasRepo.GetDudasByEstudiante(uint(estudianteID))
	if err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudieron obtener las dudas")
	}

	return SendSuccess(c, 200, dudas)
}

// GetDudasByAutoridad obtiene dudas asignadas a una autoridad
func (h *DudasHandler) GetDudasByAutoridad(c *fiber.Ctx) error {
	autoridadIDStr := c.Params("autoridad_id")
	if autoridadIDStr == "" {
		return SendError(c, 400, "autoridad_id_faltante", "El ID de la autoridad es requerido", "Proporcione un ID válido")
	}

	autoridadID, err := strconv.Atoi(autoridadIDStr)
	if err != nil || autoridadID <= 0 {
		return SendError(c, 400, "autoridad_id_invalido", "El ID de la autoridad no es válido", "El ID debe ser un número entero positivo")
	}

	dudas, err := h.dudasRepo.GetDudasByAutoridad(uint(autoridadID))
	if err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudieron obtener las dudas")
	}

	return SendSuccess(c, 200, dudas)
}

// GetDudasSinResponder obtiene dudas sin respuesta
func (h *DudasHandler) GetDudasSinResponder(c *fiber.Ctx) error {
	dudas, err := h.dudasRepo.GetDudasSinResponder()
	if err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudieron obtener las dudas")
	}

	return SendSuccess(c, 200, dudas)
}

// GetDudasRespondidas obtiene dudas con respuesta
func (h *DudasHandler) GetDudasRespondidas(c *fiber.Ctx) error {
	dudas, err := h.dudasRepo.GetDudasRespondidas()
	if err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudieron obtener las dudas")
	}

	return SendSuccess(c, 200, dudas)
}

// GetDudasSinAsignar obtiene dudas sin autoridad asignada
func (h *DudasHandler) GetDudasSinAsignar(c *fiber.Ctx) error {
	dudas, err := h.dudasRepo.GetDudasSinAsignar()
	if err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudieron obtener las dudas")
	}

	return SendSuccess(c, 200, dudas)
}

// BuscarDudasPorPregunta busca dudas por contenido de la pregunta
func (h *DudasHandler) BuscarDudasPorPregunta(c *fiber.Ctx) error {
	termino := c.Params("termino")
	if termino == "" {
		return SendError(c, 400, "termino_faltante", "El término de búsqueda es requerido", "Proporcione un término de búsqueda")
	}

	// Validar parámetro de búsqueda
	if validationErrors := h.validateDudasSearchParams(termino); len(validationErrors) > 0 {
		return SendValidationError(c, "Los parámetros de búsqueda no son válidos", validationErrors)
	}

	dudas, err := h.dudasRepo.BuscarDudasPorPregunta(termino)
	if err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudieron obtener las dudas")
	}

	return SendSuccess(c, 200, dudas)
}

// ResponderDuda actualiza la respuesta de una duda
func (h *DudasHandler) ResponderDuda(c *fiber.Ctx) error {
	dudaIDStr := c.Params("duda_id")
	if dudaIDStr == "" {
		return SendError(c, 400, "duda_id_faltante", "El ID de la duda es requerido", "Proporcione un ID válido")
	}

	dudaID, err := strconv.Atoi(dudaIDStr)
	if err != nil || dudaID <= 0 {
		return SendError(c, 400, "duda_id_invalido", "El ID de la duda no es válido", "El ID debe ser un número entero positivo")
	}

	// Verificar que la duda existe
	_, err = h.dudasRepo.GetDudasByID(uint(dudaID))
	if err != nil {
		return SendError(c, 404, "duda_no_encontrada", "No se encontró la duda solicitada", "Verifique que el ID sea correcto")
	}

	var requestData struct {
		Respuesta       string `json:"respuesta"`
		AutoridadUTEQID uint   `json:"autoridad_uteq_id"`
	}

	if err := c.BodyParser(&requestData); err != nil {
		return SendError(c, 400, "json_invalido", "No se puede procesar el JSON. Verifique el formato de los datos", err.Error())
	}

	// Validar campos requeridos
	if strings.TrimSpace(requestData.Respuesta) == "" {
		return SendValidationError(c, "La respuesta es requerida", []ValidationError{
			{
				Field:   "respuesta",
				Message: "La respuesta es requerida",
				Value:   requestData.Respuesta,
			},
		})
	}

	if requestData.AutoridadUTEQID == 0 {
		return SendValidationError(c, "El ID de la autoridad es requerido", []ValidationError{
			{
				Field:   "autoridad_uteq_id",
				Message: "El ID de la autoridad es requerido",
				Value:   "0",
			},
		})
	}

	if err := h.dudasRepo.ResponderDuda(uint(dudaID), requestData.Respuesta, requestData.AutoridadUTEQID); err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudo responder la duda")
	}

	return SendSuccess(c, 200, fiber.Map{
		"message": "Duda respondida exitosamente",
		"duda_id": dudaID,
	})
}

// GetDudasByPrivacidad obtiene dudas por tipo de privacidad
func (h *DudasHandler) GetDudasByPrivacidad(c *fiber.Ctx) error {
	privacidad := c.Params("privacidad")
	if privacidad == "" {
		return SendError(c, 400, "privacidad_faltante", "El tipo de privacidad es requerido", "Proporcione un tipo de privacidad válido")
	}

	// Validar que el parámetro sea válido
	if privacidad != "privado" && privacidad != "publico" {
		return SendValidationError(c, "Tipo de privacidad inválido", []ValidationError{
			{
				Field:   "privacidad",
				Message: "El tipo de privacidad debe ser 'privado' o 'publico'",
				Value:   privacidad,
			},
		})
	}

	dudas, err := h.dudasRepo.GetDudasByPrivacidad(privacidad)
	if err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudieron obtener las dudas")
	}

	return SendSuccess(c, 200, dudas)
}

// validateDudas valida los datos de una duda
func (h *DudasHandler) validateDudas(duda *models.Dudas, isUpdate bool) []ValidationError {
	var errors []ValidationError

	// Validar Pregunta
	pregunta := strings.TrimSpace(duda.Pregunta)
	if pregunta == "" {
		errors = append(errors, ValidationError{
			Field:   "pregunta",
			Message: "La pregunta es requerida",
			Value:   duda.Pregunta,
		})
	} else if len(pregunta) < 10 {
		errors = append(errors, ValidationError{
			Field:   "pregunta",
			Message: "La pregunta debe tener al menos 10 caracteres",
			Value:   duda.Pregunta,
		})
	} else if len(pregunta) > 1000 {
		errors = append(errors, ValidationError{
			Field:   "pregunta",
			Message: "La pregunta no puede exceder 1000 caracteres",
			Value:   duda.Pregunta,
		})
	}

	// Validar EstudianteID
	if duda.EstudianteID == 0 {
		errors = append(errors, ValidationError{
			Field:   "estudiante_id",
			Message: "El ID del estudiante es requerido",
		})
	}

	// Validar Privacidad
	privacidad := strings.TrimSpace(duda.Privacidad)
	if privacidad != "" && privacidad != "privado" && privacidad != "publico" {
		errors = append(errors, ValidationError{
			Field:   "privacidad",
			Message: "El tipo de privacidad debe ser 'privado' o 'publico'",
			Value:   duda.Privacidad,
		})
	}

	// Validar Respuesta (opcional pero si se proporciona debe ser válida)
	if duda.Respuesta != nil {
		respuesta := strings.TrimSpace(*duda.Respuesta)
		if respuesta != "" {
			if len(respuesta) < 5 {
				errors = append(errors, ValidationError{
					Field:   "respuesta",
					Message: "La respuesta debe tener al menos 5 caracteres",
					Value:   *duda.Respuesta,
				})
			} else if len(respuesta) > 2000 {
				errors = append(errors, ValidationError{
					Field:   "respuesta",
					Message: "La respuesta no puede exceder 2000 caracteres",
					Value:   *duda.Respuesta,
				})
			}
		}
	}

	return errors
}

// validateDudasRequiredFields valida que los campos requeridos estén presentes
func (h *DudasHandler) validateDudasRequiredFields(duda *models.Dudas) []ValidationError {
	var errors []ValidationError

	if strings.TrimSpace(duda.Pregunta) == "" {
		errors = append(errors, ValidationError{
			Field:   "pregunta",
			Message: "El campo pregunta es requerido",
		})
	}

	if duda.EstudianteID == 0 {
		errors = append(errors, ValidationError{
			Field:   "estudiante_id",
			Message: "El campo estudiante_id es requerido",
		})
	}

	return errors
}

// validateDudasSearchParams valida los parámetros de búsqueda
func (h *DudasHandler) validateDudasSearchParams(termino string) []ValidationError {
	var errors []ValidationError

	termino = strings.TrimSpace(termino)
	if len(termino) < 3 {
		errors = append(errors, ValidationError{
			Field:   "termino",
			Message: "El término de búsqueda debe tener al menos 3 caracteres",
			Value:   termino,
		})
	} else if len(termino) > 100 {
		errors = append(errors, ValidationError{
			Field:   "termino",
			Message: "El término de búsqueda no puede exceder 100 caracteres",
			Value:   termino,
		})
	}

	return errors
}
