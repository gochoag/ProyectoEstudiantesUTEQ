package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
)

// WhatsAppHandler maneja las operaciones de WhatsApp como proxy hacia el servicio Node.js
type WhatsAppHandler struct {
	serviceURL string
	httpClient *http.Client
}

// NewWhatsAppHandler crea una nueva instancia del handler
func NewWhatsAppHandler() *WhatsAppHandler {
	serviceURL := os.Getenv("WHATSAPP_SERVICE_URL")
	if serviceURL == "" {
		serviceURL = "http://localhost:3001"
	}

	return &WhatsAppHandler{
		serviceURL: serviceURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// StatusResponse representa la respuesta del estado
type StatusResponse struct {
	Status    string `json:"status"`
	Timestamp string `json:"timestamp,omitempty"`
}

// QRResponse representa la respuesta del QR
type QRResponse struct {
	Success bool   `json:"success"`
	QR      string `json:"qr,omitempty"`
	Message string `json:"message,omitempty"`
	Status  string `json:"status"`
}

// SendMessageRequest representa la solicitud para enviar mensaje
type SendMessageRequest struct {
	Phone   string `json:"phone"`
	Message string `json:"message"`
}

// SendMessageResponse representa la respuesta al enviar mensaje
type SendMessageResponse struct {
	Success   bool   `json:"success"`
	Message   string `json:"message,omitempty"`
	MessageID string `json:"messageId,omitempty"`
	To        string `json:"to,omitempty"`
	Error     string `json:"error,omitempty"`
}

// GetStatus obtiene el estado actual de WhatsApp
func (h *WhatsAppHandler) GetStatus(c *fiber.Ctx) error {
	resp, err := h.httpClient.Get(h.serviceURL + "/status")
	if err != nil {
		log.Printf("Error conectando con servicio WhatsApp: %v", err)
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   "Servicio de WhatsApp no disponible",
			"details": err.Error(),
		})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error leyendo respuesta",
		})
	}

	var status StatusResponse
	if err := json.Unmarshal(body, &status); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error parseando respuesta",
		})
	}

	return c.JSON(status)
}

// GetQR obtiene el código QR actual
func (h *WhatsAppHandler) GetQR(c *fiber.Ctx) error {
	resp, err := h.httpClient.Get(h.serviceURL + "/qr")
	if err != nil {
		log.Printf("Error conectando con servicio WhatsApp: %v", err)
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   "Servicio de WhatsApp no disponible",
			"details": err.Error(),
		})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error leyendo respuesta",
		})
	}

	var qrResp QRResponse
	if err := json.Unmarshal(body, &qrResp); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error parseando respuesta",
		})
	}

	return c.JSON(qrResp)
}

// SendMessage envía un mensaje de WhatsApp
func (h *WhatsAppHandler) SendMessage(c *fiber.Ctx) error {
	var req SendMessageRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Datos inválidos",
		})
	}

	if req.Phone == "" || req.Message == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Se requiere phone y message",
		})
	}

	// Preparar request para Node.js
	jsonData, err := json.Marshal(req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error preparando datos",
		})
	}

	resp, err := h.httpClient.Post(
		h.serviceURL+"/send-message",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		log.Printf("Error conectando con servicio WhatsApp: %v", err)
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   "Servicio de WhatsApp no disponible",
			"details": err.Error(),
		})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error leyendo respuesta",
		})
	}

	var sendResp SendMessageResponse
	if err := json.Unmarshal(body, &sendResp); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error parseando respuesta",
		})
	}

	if resp.StatusCode != http.StatusOK {
		return c.Status(resp.StatusCode).JSON(sendResp)
	}

	return c.JSON(sendResp)
}

// Logout cierra la sesión de WhatsApp
func (h *WhatsAppHandler) Logout(c *fiber.Ctx) error {
	resp, err := h.httpClient.Post(h.serviceURL+"/logout", "application/json", nil)
	if err != nil {
		log.Printf("Error conectando con servicio WhatsApp: %v", err)
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   "Servicio de WhatsApp no disponible",
			"details": err.Error(),
		})
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error leyendo respuesta",
		})
	}

	var logoutResp map[string]interface{}
	if err := json.Unmarshal(body, &logoutResp); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error parseando respuesta",
		})
	}

	return c.JSON(logoutResp)
}
