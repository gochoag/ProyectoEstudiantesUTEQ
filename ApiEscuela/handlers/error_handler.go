package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

// ErrorResponse representa una respuesta de error estandarizada
type ErrorResponse struct {
	Success    bool     `json:"success"`
	Error      string   `json:"error"`
	Message    string   `json:"message"`
	Details    []string `json:"details,omitempty"`
	StatusCode int      `json:"status_code"`
	Timestamp  string   `json:"timestamp"`
	Path       string   `json:"path"`
	Method     string   `json:"method"`
}

// ValidationError representa un error de validación
type ValidationError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Value   string `json:"value,omitempty"`
}

// ValidationResponse representa una respuesta de validación
type ValidationResponse struct {
	Success    bool              `json:"success"`
	Error      string            `json:"error"`
	Message    string            `json:"message"`
	Validation []ValidationError `json:"validation,omitempty"`
	StatusCode int               `json:"status_code"`
	Timestamp  string            `json:"timestamp"`
	Path       string            `json:"path"`
	Method     string            `json:"method"`
}

// NewErrorResponse crea una nueva respuesta de error
func NewErrorResponse(c *fiber.Ctx, statusCode int, error, message string, details ...string) *ErrorResponse {
	return &ErrorResponse{
		Success:    false,
		Error:      error,
		Message:    message,
		Details:    details,
		StatusCode: statusCode,
		Timestamp:  time.Now().Format(time.RFC3339),
		Path:       c.Path(),
		Method:     c.Method(),
	}
}

// NewValidationResponse crea una nueva respuesta de validación
func NewValidationResponse(c *fiber.Ctx, message string, validation []ValidationError) *ValidationResponse {
	return &ValidationResponse{
		Success:    false,
		Error:      "validation_error",
		Message:    message,
		Validation: validation,
		StatusCode: 400,
		Timestamp:  time.Now().Format(time.RFC3339),
		Path:       c.Path(),
		Method:     c.Method(),
	}
}

// SendError envía una respuesta de error
func SendError(c *fiber.Ctx, statusCode int, error, message string, details ...string) error {
	return c.Status(statusCode).JSON(NewErrorResponse(c, statusCode, error, message, details...))
}

// SendValidationError envía una respuesta de error de validación
func SendValidationError(c *fiber.Ctx, message string, validation []ValidationError) error {
	return c.Status(400).JSON(NewValidationResponse(c, message, validation))
}

// SendSuccess envía una respuesta de éxito
func SendSuccess(c *fiber.Ctx, statusCode int, data interface{}) error {
	return c.Status(statusCode).JSON(fiber.Map{
		"success":     true,
		"data":        data,
		"status_code": statusCode,
		"timestamp":   time.Now().Format(time.RFC3339),
		"path":        c.Path(),
		"method":      c.Method(),
	})
}
