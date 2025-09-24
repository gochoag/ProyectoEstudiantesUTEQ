package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type AutoridadUTEQHandler struct {
	autoridadRepo *repositories.AutoridadUTEQRepository
	personaRepo   *repositories.PersonaRepository
}

func NewAutoridadUTEQHandler(autoridadRepo *repositories.AutoridadUTEQRepository, personaRepo *repositories.PersonaRepository) *AutoridadUTEQHandler {
	return &AutoridadUTEQHandler{
		autoridadRepo: autoridadRepo,
		personaRepo:   personaRepo,
	}
}

// CreateAutoridadUTEQ crea una nueva autoridad UTEQ
func (h *AutoridadUTEQHandler) CreateAutoridadUTEQ(c *fiber.Ctx) error {
	var autoridad models.AutoridadUTEQ

	// Parsear JSON
	if err := c.BodyParser(&autoridad); err != nil {
		return SendError(c, 400, "json_invalido", "No se puede procesar el JSON. Verifique el formato de los datos", err.Error())
	}

	// Validar campos requeridos
	if validationErrors := h.validateAutoridadUTEQRequiredFields(&autoridad); len(validationErrors) > 0 {
		return SendValidationError(c, "Faltan campos requeridos", validationErrors)
	}

	// Validar datos completos
	if validationErrors := h.validateAutoridadUTEQ(&autoridad, false); len(validationErrors) > 0 {
		return SendValidationError(c, "Los datos proporcionados no son válidos", validationErrors)
	}

	// Limpiar datos
	autoridad.Cargo = strings.TrimSpace(autoridad.Cargo)

	// Verificar que el PersonaID sea válido
	if autoridad.PersonaID == 0 {
		return SendError(c, 400, "persona_id_invalido", "El ID de la persona es requerido", "Proporcione un persona_id válido mayor que 0")
	}

	// Verificar que la persona existe (validación de relación)
	if !h.personaExists(autoridad.PersonaID) {
		return SendError(c, 400, "persona_no_existe", "No se encontró la persona con el ID especificado", "Verifique que el persona_id sea correcto y que la persona exista en el sistema")
	}

	// Crear autoridad
	if err := h.autoridadRepo.CreateAutoridadUTEQ(&autoridad); err != nil {
		// Manejar errores específicos del repositorio
		switch err.Error() {
		case "persona no encontrada":
			return SendError(c, 400, "persona_no_existe", "No se encontró la persona con el ID especificado", "Verifique que el persona_id sea correcto y que la persona exista en el sistema")
		case "autoridad ya existe":
			return SendError(c, 409, "autoridad_duplicada", "La persona ya tiene un cargo asignado", "Una persona solo puede tener un cargo de autoridad")
		default:
			return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudo crear la autoridad UTEQ")
		}
	}

	return SendSuccess(c, 201, autoridad)
}

// GetAutoridadUTEQ obtiene una autoridad UTEQ por ID
func (h *AutoridadUTEQHandler) GetAutoridadUTEQ(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "id_faltante", "El ID de la autoridad UTEQ es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "id_invalido", "El ID de la autoridad UTEQ no es válido", "El ID debe ser un número entero positivo")
	}

	autoridad, err := h.autoridadRepo.GetAutoridadUTEQByID(uint(id))
	if err != nil {
		return SendError(c, 404, "autoridad_no_encontrada", "No se encontró la autoridad UTEQ solicitada", "Verifique que el ID sea correcto")
	}

	return SendSuccess(c, 200, autoridad)
}

// GetAllAutoridadesUTEQ obtiene todas las autoridades UTEQ activas
func (h *AutoridadUTEQHandler) GetAllAutoridadesUTEQ(c *fiber.Ctx) error {
	autoridades, err := h.autoridadRepo.GetAllAutoridadesUTEQ()
	if err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudieron obtener las autoridades UTEQ")
	}

	return SendSuccess(c, 200, autoridades)
}

// GetAllAutoridadesUTEQIncludingDeleted obtiene todas las autoridades UTEQ incluyendo las eliminadas
func (h *AutoridadUTEQHandler) GetAllAutoridadesUTEQIncludingDeleted(c *fiber.Ctx) error {
	autoridades, err := h.autoridadRepo.GetAllAutoridadesUTEQIncludingDeleted()
	if err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudieron obtener las autoridades UTEQ")
	}

	return SendSuccess(c, 200, autoridades)
}

// GetDeletedAutoridadesUTEQ obtiene solo las autoridades UTEQ eliminadas
func (h *AutoridadUTEQHandler) GetDeletedAutoridadesUTEQ(c *fiber.Ctx) error {
	autoridades, err := h.autoridadRepo.GetDeletedAutoridadesUTEQ()
	if err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudieron obtener las autoridades UTEQ eliminadas")
	}

	return SendSuccess(c, 200, autoridades)
}

// UpdateAutoridadUTEQ actualiza una autoridad UTEQ
func (h *AutoridadUTEQHandler) UpdateAutoridadUTEQ(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "id_faltante", "El ID de la autoridad UTEQ es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "id_invalido", "El ID de la autoridad UTEQ no es válido", "El ID debe ser un número entero positivo")
	}

	// Verificar que la autoridad existe
	existingAutoridad, err := h.autoridadRepo.GetAutoridadUTEQByID(uint(id))
	if err != nil {
		return SendError(c, 404, "autoridad_no_encontrada", "No se encontró la autoridad UTEQ solicitada", "Verifique que el ID sea correcto")
	}

	// Parsear datos de actualización
	var updateData models.AutoridadUTEQ
	if err := c.BodyParser(&updateData); err != nil {
		return SendError(c, 400, "json_invalido", "No se puede procesar el JSON. Verifique el formato de los datos", err.Error())
	}

	// Validar datos de actualización
	if validationErrors := h.validateAutoridadUTEQ(&updateData, true); len(validationErrors) > 0 {
		return SendValidationError(c, "Los datos proporcionados no son válidos", validationErrors)
	}

	// Verificar si la nueva persona ya tiene un cargo asignado (si cambia la persona)
	if updateData.PersonaID != existingAutoridad.PersonaID {
		// Verificar que la nueva persona existe
		if !h.personaExists(updateData.PersonaID) {
			return SendError(c, 400, "persona_no_existe", "No se encontró la persona con el ID especificado", "Verifique que el persona_id sea correcto y que la persona exista en el sistema")
		}

		if existingAutoridadByPersona, _ := h.autoridadRepo.GetAutoridadUTEQByPersona(updateData.PersonaID); existingAutoridadByPersona != nil {
			return SendError(c, 409, "autoridad_duplicada", "La persona ya tiene un cargo asignado", "Una persona solo puede tener un cargo de autoridad")
		}
	}

	// Actualizar campos
	existingAutoridad.PersonaID = updateData.PersonaID
	existingAutoridad.Cargo = strings.TrimSpace(updateData.Cargo)

	// Guardar cambios
	if err := h.autoridadRepo.UpdateAutoridadUTEQ(existingAutoridad); err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudo actualizar la autoridad UTEQ")
	}

	return SendSuccess(c, 200, existingAutoridad)
}

// DeleteAutoridadUTEQ elimina una autoridad UTEQ y en cascada su usuario y persona
func (h *AutoridadUTEQHandler) DeleteAutoridadUTEQ(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "id_faltante", "El ID de la autoridad UTEQ es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "id_invalido", "El ID de la autoridad UTEQ no es válido", "El ID debe ser un número entero positivo")
	}

	// Verificar que la autoridad existe
	autoridad, err := h.autoridadRepo.GetAutoridadUTEQByID(uint(id))
	if err != nil {
		return SendError(c, 404, "autoridad_no_encontrada", "No se encontró la autoridad UTEQ solicitada", "Verifique que el ID sea correcto")
	}

	// Verificar si la autoridad tiene relaciones activas
	if len(autoridad.DetalleAutoridadDetallesVisitas) > 0 || len(autoridad.Dudas) > 0 {
		return SendError(c, 409, "autoridad_en_uso", "No se puede eliminar la autoridad porque está siendo utilizada", "La autoridad tiene relaciones activas que impiden su eliminación")
	}

	// Eliminar autoridad
	if err := h.autoridadRepo.DeleteAutoridadUTEQ(uint(id)); err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudo eliminar la autoridad UTEQ y sus datos relacionados")
	}

	return SendSuccess(c, 200, fiber.Map{
		"message": "Autoridad UTEQ, usuario y persona eliminados exitosamente",
		"id":      id,
	})
}

// RestoreAutoridadUTEQ restaura una autoridad UTEQ eliminada y en cascada su usuario y persona
func (h *AutoridadUTEQHandler) RestoreAutoridadUTEQ(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "missing_id", "El ID de la autoridad UTEQ es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "invalid_id", "El ID de la autoridad UTEQ no es válido", "El ID debe ser un número entero positivo")
	}

	// Restaurar autoridad
	if err := h.autoridadRepo.RestoreAutoridadUTEQ(uint(id)); err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudo restaurar la autoridad UTEQ y sus datos relacionados")
	}

	return SendSuccess(c, 200, fiber.Map{
		"message": "Autoridad UTEQ, usuario y persona restaurados exitosamente",
		"id":      id,
	})
}

// GetAutoridadesUTEQByCargo obtiene autoridades por cargo
func (h *AutoridadUTEQHandler) GetAutoridadesUTEQByCargo(c *fiber.Ctx) error {
	cargo := c.Params("cargo")

	// Validar parámetro de búsqueda
	if validationErrors := h.validateAutoridadUTEQSearchParams(cargo); len(validationErrors) > 0 {
		return SendValidationError(c, "Los parámetros de búsqueda no son válidos", validationErrors)
	}

	autoridades, err := h.autoridadRepo.GetAutoridadesUTEQByCargo(cargo)
	if err != nil {
		return SendError(c, 500, "error_base_datos", "Error interno del servidor", "No se pudieron obtener las autoridades UTEQ")
	}

	return SendSuccess(c, 200, autoridades)
}

// GetAutoridadUTEQByPersona obtiene autoridad UTEQ por persona
func (h *AutoridadUTEQHandler) GetAutoridadUTEQByPersona(c *fiber.Ctx) error {
	personaIDStr := c.Params("persona_id")
	if personaIDStr == "" {
		return SendError(c, 400, "persona_id_faltante", "El ID de la persona es requerido", "Proporcione un ID válido")
	}

	personaID, err := strconv.Atoi(personaIDStr)
	if err != nil || personaID <= 0 {
		return SendError(c, 400, "persona_id_invalido", "El ID de la persona no es válido", "El ID debe ser un número entero positivo")
	}

	autoridad, err := h.autoridadRepo.GetAutoridadUTEQByPersona(uint(personaID))
	if err != nil {
		return SendError(c, 404, "autoridad_no_encontrada", "No se encontró la autoridad UTEQ para esta persona", "Verifique que el ID de persona sea correcto")
	}

	return SendSuccess(c, 200, autoridad)
}

// validateAutoridadUTEQ valida los datos de una autoridad UTEQ
func (h *AutoridadUTEQHandler) validateAutoridadUTEQ(autoridad *models.AutoridadUTEQ, isUpdate bool) []ValidationError {
	var errors []ValidationError

	// Validar PersonaID
	if autoridad.PersonaID == 0 {
		errors = append(errors, ValidationError{
			Field:   "persona_id",
			Message: "El ID de la persona es requerido",
		})
	}

	// Validar Cargo (opcional pero si se proporciona debe ser válido)
	cargo := strings.TrimSpace(autoridad.Cargo)
	if cargo != "" {
		// Validar longitud mínima
		if len(cargo) < 2 {
			errors = append(errors, ValidationError{
				Field:   "cargo",
				Message: "El cargo debe tener al menos 2 caracteres",
				Value:   autoridad.Cargo,
			})
		} else if len(cargo) > 100 {
			// Validar longitud máxima
			errors = append(errors, ValidationError{
				Field:   "cargo",
				Message: "El cargo no puede exceder 100 caracteres",
				Value:   autoridad.Cargo,
			})
		}
	}

	return errors
}

// validateAutoridadUTEQRequiredFields valida que los campos requeridos estén presentes
func (h *AutoridadUTEQHandler) validateAutoridadUTEQRequiredFields(autoridad *models.AutoridadUTEQ) []ValidationError {
	var errors []ValidationError

	if autoridad.PersonaID == 0 {
		errors = append(errors, ValidationError{
			Field:   "persona_id",
			Message: "El campo persona_id es requerido",
		})
	}

	// El cargo es opcional según el modelo, pero si se proporciona debe ser válido
	if strings.TrimSpace(autoridad.Cargo) == "" {
		// Si no se proporciona cargo, establecer un valor por defecto
		autoridad.Cargo = "Autoridad UTEQ"
	}

	return errors
}

// validateAutoridadUTEQSearchParams valida los parámetros de búsqueda
func (h *AutoridadUTEQHandler) validateAutoridadUTEQSearchParams(cargo string) []ValidationError {
	var errors []ValidationError

	// Validar cargo de búsqueda (más flexible)
	if strings.TrimSpace(cargo) != "" {
		if len(strings.TrimSpace(cargo)) < 1 {
			errors = append(errors, ValidationError{
				Field:   "cargo",
				Message: "El término de búsqueda de cargo no puede estar vacío",
				Value:   cargo,
			})
		}
	}

	return errors
}

// personaExists verifica si una persona existe en la base de datos
func (h *AutoridadUTEQHandler) personaExists(personaID uint) bool {
	if personaID == 0 {
		return false
	}

	var count int64
	err := h.personaRepo.GetDB().Model(&models.Persona{}).Where("id = ?", personaID).Count(&count).Error
	return err == nil && count > 0
}
