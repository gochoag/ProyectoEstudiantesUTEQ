package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type CodigoHandler struct {
	codigoRepo *repositories.CodigoUsuarioRepository
}

func NewCodigoHandler(codigoRepo *repositories.CodigoUsuarioRepository) *CodigoHandler {
	return &CodigoHandler{codigoRepo: codigoRepo}
}

// CreateCodigo crea un nuevo código
func (h *CodigoHandler) CreateCodigo(c *fiber.Ctx) error {
	var codigo models.CodigoUsuario

	// Parsear JSON
	if err := c.BodyParser(&codigo); err != nil {
		return SendError(c, 400, "invalid_json", "No se puede procesar el JSON. Verifique el formato de los datos", err.Error())
	}

	// Validar campos requeridos
	if validationErrors := h.validateCodigoRequiredFields(&codigo); len(validationErrors) > 0 {
		return SendValidationError(c, "Faltan campos requeridos", validationErrors)
	}

	// Validar datos completos
	if validationErrors := h.validateCodigo(&codigo, false); len(validationErrors) > 0 {
		return SendValidationError(c, "Los datos proporcionados no son válidos", validationErrors)
	}

	// Limpiar datos
	codigo.Codigo = strings.TrimSpace(codigo.Codigo)
	codigo.Estado = strings.TrimSpace(codigo.Estado)

	// Crear código
	if err := h.codigoRepo.Crear(codigo.UsuarioID, codigo.Codigo); err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudo crear el código")
	}

	return SendSuccess(c, 201, fiber.Map{
		"message":    "Código creado exitosamente",
		"usuario_id": codigo.UsuarioID,
		"codigo":     codigo.Codigo,
	})
}

// GetCodigo obtiene un código por ID
func (h *CodigoHandler) GetCodigo(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "missing_id", "El ID del código es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "invalid_id", "El ID del código no es válido", "El ID debe ser un número entero positivo")
	}

	codigo, err := h.codigoRepo.GetByID(uint(id))
	if err != nil {
		return SendError(c, 404, "codigo_not_found", "No se encontró el código solicitado", "Verifique que el ID sea correcto")
	}

	return SendSuccess(c, 200, codigo)
}

// GetAllCodigos obtiene todos los códigos
func (h *CodigoHandler) GetAllCodigos(c *fiber.Ctx) error {
	// Esta función no debería existir en producción por seguridad
	// pero la incluimos para completitud
	return SendError(c, 403, "forbidden", "Acceso denegado", "No se permite listar todos los códigos por seguridad")
}

// GetCodigosByUsuario obtiene códigos por usuario
func (h *CodigoHandler) GetCodigosByUsuario(c *fiber.Ctx) error {
	usuarioIDStr := c.Params("usuario_id")
	if usuarioIDStr == "" {
		return SendError(c, 400, "missing_usuario_id", "El ID del usuario es requerido", "Proporcione un ID de usuario válido")
	}

	usuarioID, err := strconv.Atoi(usuarioIDStr)
	if err != nil || usuarioID <= 0 {
		return SendError(c, 400, "invalid_usuario_id", "El ID del usuario no es válido", "El ID debe ser un número entero positivo")
	}

	// Esta función requeriría implementación en el repositorio
	return SendError(c, 501, "not_implemented", "Función no implementada", "Esta funcionalidad no está disponible")
}

// UpdateCodigo actualiza un código
func (h *CodigoHandler) UpdateCodigo(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "missing_id", "El ID del código es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "invalid_id", "El ID del código no es válido", "El ID debe ser un número entero positivo")
	}

	// Verificar que el código existe
	codigo, err := h.codigoRepo.GetByID(uint(id))
	if err != nil {
		return SendError(c, 404, "codigo_not_found", "No se encontró el código solicitado", "Verifique que el ID sea correcto")
	}

	// Parsear datos de actualización
	var updateData models.CodigoUsuario
	if err := c.BodyParser(&updateData); err != nil {
		return SendError(c, 400, "invalid_json", "No se puede procesar el JSON. Verifique el formato de los datos", err.Error())
	}

	// Validar datos de actualización
	if validationErrors := h.validateCodigo(&updateData, true); len(validationErrors) > 0 {
		return SendValidationError(c, "Los datos proporcionados no son válidos", validationErrors)
	}

	// Actualizar campos (mantener ID original)
	codigo.UsuarioID = updateData.UsuarioID
	codigo.Codigo = strings.TrimSpace(updateData.Codigo)
	codigo.Estado = strings.TrimSpace(updateData.Estado)
	codigo.ExpiraEn = updateData.ExpiraEn

	// Actualizar en base de datos
	if err := h.codigoRepo.Update(codigo); err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudo actualizar el código")
	}

	return SendSuccess(c, 200, codigo)
}

// DeleteCodigo elimina un código
func (h *CodigoHandler) DeleteCodigo(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "missing_id", "El ID del código es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "invalid_id", "El ID del código no es válido", "El ID debe ser un número entero positivo")
	}

	// Verificar que el código existe antes de eliminar
	_, err = h.codigoRepo.GetByID(uint(id))
	if err != nil {
		return SendError(c, 404, "codigo_not_found", "No se encontró el código solicitado", "Verifique que el ID sea correcto")
	}

	// Los códigos no se eliminan físicamente, solo se marcan como expirados
	if err := h.codigoRepo.MarcarComoExpirado(uint(id)); err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudo marcar el código como expirado")
	}

	return SendSuccess(c, 200, fiber.Map{
		"message": "Código marcado como expirado exitosamente",
		"id":      id,
	})
}

// VerifyCodigo verifica un código
func (h *CodigoHandler) VerifyCodigo(c *fiber.Ctx) error {
	var req struct {
		Codigo string `json:"codigo"`
	}

	// Parsear JSON
	if err := c.BodyParser(&req); err != nil {
		return SendError(c, 400, "invalid_json", "No se puede procesar el JSON. Verifique el formato de los datos", err.Error())
	}

	// Validar código
	if validationErrors := h.validateCodigoString(req.Codigo); len(validationErrors) > 0 {
		return SendValidationError(c, "El código proporcionado no es válido", validationErrors)
	}

	// Buscar código
	codigo, err := h.codigoRepo.FindLatestByCodigo(strings.TrimSpace(req.Codigo))
	if err != nil {
		return SendError(c, 404, "codigo_not_found", "No se encontró el código", "Verifique que el código sea correcto")
	}

	// Verificar estado
	if codigo.Estado != "valido" {
		return SendError(c, 400, "codigo_invalid_state", "El código no está en estado válido", "El código debe estar en estado 'valido' para ser verificado")
	}

	// Verificar expiración
	if codigo.ExpiraEn != nil && codigo.ExpiraEn.Before(time.Now()) {
		// Marcar como expirado
		h.codigoRepo.MarcarComoExpirado(codigo.ID)
		return SendError(c, 400, "codigo_expired", "El código ha expirado", "Solicite un nuevo código")
	}

	return SendSuccess(c, 200, fiber.Map{
		"message":    "Código verificado exitosamente",
		"codigo_id":  codigo.ID,
		"usuario_id": codigo.UsuarioID,
		"estado":     codigo.Estado,
		"expira_en":  codigo.ExpiraEn,
	})
}

// MarcarComoVerificado marca un código como verificado
func (h *CodigoHandler) MarcarComoVerificado(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "missing_id", "El ID del código es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "invalid_id", "El ID del código no es válido", "El ID debe ser un número entero positivo")
	}

	// Verificar que el código existe
	codigo, err := h.codigoRepo.GetByID(uint(id))
	if err != nil {
		return SendError(c, 404, "codigo_not_found", "No se encontró el código solicitado", "Verifique que el ID sea correcto")
	}

	// Verificar que el código esté en estado válido
	if codigo.Estado != "valido" {
		return SendError(c, 400, "codigo_invalid_state", "El código no está en estado válido", "Solo se pueden verificar códigos en estado 'valido'")
	}

	// Marcar como verificado
	if err := h.codigoRepo.MarcarComoVerificado(uint(id)); err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudo marcar el código como verificado")
	}

	return SendSuccess(c, 200, fiber.Map{
		"message": "Código marcado como verificado exitosamente",
		"id":      id,
	})
}

// MarcarComoExpirado marca un código como expirado
func (h *CodigoHandler) MarcarComoExpirado(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "missing_id", "El ID del código es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "invalid_id", "El ID del código no es válido", "El ID debe ser un número entero positivo")
	}

	// Verificar que el código existe
	_, err = h.codigoRepo.GetByID(uint(id))
	if err != nil {
		return SendError(c, 404, "codigo_not_found", "No se encontró el código solicitado", "Verifique que el ID sea correcto")
	}

	// Marcar como expirado
	if err := h.codigoRepo.MarcarComoExpirado(uint(id)); err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudo marcar el código como expirado")
	}

	return SendSuccess(c, 200, fiber.Map{
		"message": "Código marcado como expirado exitosamente",
		"id":      id,
	})
}

// validateCodigo valida los datos de un código
func (h *CodigoHandler) validateCodigo(codigo *models.CodigoUsuario, isUpdate bool) []ValidationError {
	var errors []ValidationError

	// Validar UsuarioID
	if codigo.UsuarioID == 0 {
		errors = append(errors, ValidationError{
			Field:   "usuario_id",
			Message: "El ID del usuario es requerido",
		})
	}

	// Validar Código
	if strings.TrimSpace(codigo.Codigo) == "" {
		errors = append(errors, ValidationError{
			Field:   "codigo",
			Message: "El código es requerido",
			Value:   codigo.Codigo,
		})
	} else {
		// Validar formato del código (6 dígitos numéricos)
		codigoRegex := regexp.MustCompile(`^\d{6}$`)
		if !codigoRegex.MatchString(strings.TrimSpace(codigo.Codigo)) {
			errors = append(errors, ValidationError{
				Field:   "codigo",
				Message: "El código debe tener exactamente 6 dígitos numéricos",
				Value:   codigo.Codigo,
			})
		}
	}

	// Validar Estado (opcional pero si se proporciona debe ser válido)
	if strings.TrimSpace(codigo.Estado) != "" {
		estadoValido := strings.TrimSpace(codigo.Estado)
		if estadoValido != "valido" && estadoValido != "verificado" && estadoValido != "expirado" {
			errors = append(errors, ValidationError{
				Field:   "estado",
				Message: "El estado debe ser 'valido', 'verificado' o 'expirado'",
				Value:   codigo.Estado,
			})
		}
	}

	// Validar ExpiraEn (opcional pero si se proporciona debe ser válida)
	if codigo.ExpiraEn != nil {
		// Verificar que la fecha no sea muy antigua (más de 1 hora)
		oneHourAgo := time.Now().Add(-1 * time.Hour)
		if codigo.ExpiraEn.Before(oneHourAgo) {
			errors = append(errors, ValidationError{
				Field:   "expira_en",
				Message: "La fecha de expiración no puede ser de hace más de 1 hora",
				Value:   codigo.ExpiraEn.Format(time.RFC3339),
			})
		}

		// Verificar que la fecha no sea muy futura (más de 24 horas)
		oneDayFromNow := time.Now().Add(24 * time.Hour)
		if codigo.ExpiraEn.After(oneDayFromNow) {
			errors = append(errors, ValidationError{
				Field:   "expira_en",
				Message: "La fecha de expiración no puede ser de más de 24 horas en el futuro",
				Value:   codigo.ExpiraEn.Format(time.RFC3339),
			})
		}
	}

	return errors
}

// validateCodigoRequiredFields valida que los campos requeridos estén presentes
func (h *CodigoHandler) validateCodigoRequiredFields(codigo *models.CodigoUsuario) []ValidationError {
	var errors []ValidationError

	if codigo.UsuarioID == 0 {
		errors = append(errors, ValidationError{
			Field:   "usuario_id",
			Message: "El campo usuario_id es requerido",
		})
	}

	if strings.TrimSpace(codigo.Codigo) == "" {
		errors = append(errors, ValidationError{
			Field:   "codigo",
			Message: "El campo codigo es requerido",
		})
	}

	return errors
}

// validateCodigoSearchParams valida los parámetros de búsqueda
func (h *CodigoHandler) validateCodigoSearchParams(codigo string, estado string, usuarioID uint) []ValidationError {
	var errors []ValidationError

	// Validar código de búsqueda
	if strings.TrimSpace(codigo) != "" {
		codigoRegex := regexp.MustCompile(`^\d{6}$`)
		if !codigoRegex.MatchString(strings.TrimSpace(codigo)) {
			errors = append(errors, ValidationError{
				Field:   "codigo",
				Message: "El código de búsqueda debe tener exactamente 6 dígitos numéricos",
				Value:   codigo,
			})
		}
	}

	// Validar estado de búsqueda
	if strings.TrimSpace(estado) != "" {
		estadoValido := strings.TrimSpace(estado)
		if estadoValido != "valido" && estadoValido != "verificado" && estadoValido != "expirado" {
			errors = append(errors, ValidationError{
				Field:   "estado",
				Message: "El estado de búsqueda debe ser 'valido', 'verificado' o 'expirado'",
				Value:   estado,
			})
		}
	}

	// Validar usuario ID de búsqueda
	if usuarioID == 0 {
		errors = append(errors, ValidationError{
			Field:   "usuario_id",
			Message: "El ID del usuario es requerido para la búsqueda",
		})
	}

	return errors
}

// validateCodigoString valida el formato de un código de 6 dígitos
func (h *CodigoHandler) validateCodigoString(codigo string) []ValidationError {
	var errors []ValidationError

	if strings.TrimSpace(codigo) == "" {
		errors = append(errors, ValidationError{
			Field:   "codigo",
			Message: "El código es requerido",
			Value:   codigo,
		})
	} else {
		// Validar formato del código (6 dígitos numéricos)
		codigoRegex := regexp.MustCompile(`^\d{6}$`)
		if !codigoRegex.MatchString(strings.TrimSpace(codigo)) {
			errors = append(errors, ValidationError{
				Field:   "codigo",
				Message: "El código debe tener exactamente 6 dígitos numéricos",
				Value:   codigo,
			})
		}
	}

	return errors
}
