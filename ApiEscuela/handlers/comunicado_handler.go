package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/services"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type ComunicadoHandler struct {
	comunicadoService *services.ComunicadoService
}

func NewComunicadoHandler(comunicadoService *services.ComunicadoService) *ComunicadoHandler {
	return &ComunicadoHandler{
		comunicadoService: comunicadoService,
	}
}

// CreateComunicado crea y envía un nuevo comunicado
func (h *ComunicadoHandler) CreateComunicado(c *fiber.Ctx) error {
	// Parsear el formulario multipart
	form, err := c.MultipartForm()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el formulario",
		})
	}

	// Obtener campos del formulario
	asunto := ""
	if asuntos, ok := form.Value["asunto"]; ok && len(asuntos) > 0 {
		asunto = asuntos[0]
	}
	if asunto == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "El asunto es requerido",
		})
	}

	destinatariosJSON := ""
	if destinatarios, ok := form.Value["destinatarios"]; ok && len(destinatarios) > 0 {
		destinatariosJSON = destinatarios[0]
	}
	if destinatariosJSON == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Los destinatarios son requeridos",
		})
	}

	mensaje := ""
	if mensajes, ok := form.Value["mensaje"]; ok && len(mensajes) > 0 {
		mensaje = mensajes[0]
	}
	if mensaje == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "El mensaje es requerido",
		})
	}

	usuarioIDStr := ""
	if usuarioIDs, ok := form.Value["usuario_id"]; ok && len(usuarioIDs) > 0 {
		usuarioIDStr = usuarioIDs[0]
	}
	usuarioID, err := strconv.ParseUint(usuarioIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de usuario inválido",
		})
	}

	// Obtener canal (correo o whatsapp)
	canal := "correo"
	if canales, ok := form.Value["canal"]; ok && len(canales) > 0 {
		canal = canales[0]
	}

	// Parsear destinatarios
	var destinatario services.DestinatarioInfo
	if err := json.Unmarshal([]byte(destinatariosJSON), &destinatario); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Formato de destinatarios inválido",
		})
	}

	// Crear carpeta para los adjuntos con fecha y hora
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	uploadDir := filepath.Join("assets", "comunicados_files", timestamp)

	// Procesar archivos adjuntos (máximo 5MB, solo PDF e imágenes)
	var adjuntosPaths []string
	var attachments []services.Attachment

	if files, ok := form.File["adjuntos"]; ok && len(files) > 0 {
		// Crear el directorio solo si hay archivos
		if err := os.MkdirAll(uploadDir, 0755); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Error al crear directorio para adjuntos",
			})
		}

		for _, file := range files {
			// Validar tamaño (5MB máximo)
			if file.Size > 5*1024*1024 {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": fmt.Sprintf("El archivo %s excede el límite de 5MB", file.Filename),
				})
			}

			// Validar tipo de archivo
			ext := strings.ToLower(filepath.Ext(file.Filename))
			allowedExts := map[string]bool{
				".pdf": true, ".jpg": true, ".jpeg": true, ".png": true, ".gif": true,
			}
			if !allowedExts[ext] {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": fmt.Sprintf("Tipo de archivo no permitido: %s. Solo se permiten PDF e imágenes", ext),
				})
			}

			// Leer el contenido del archivo para adjuntar al correo
			f, err := file.Open()
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Error al procesar el archivo adjunto",
				})
			}
			defer f.Close()

			data, err := io.ReadAll(f)
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Error al leer el archivo adjunto",
				})
			}

			mimeType := mime.TypeByExtension(ext)
			if mimeType == "" {
				mimeType = "application/octet-stream"
			}

			// Guardar archivo en disco
			filePath := filepath.Join(uploadDir, file.Filename)
			if err := os.WriteFile(filePath, data, 0644); err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Error al guardar el archivo adjunto",
				})
			}

			// Guardar la ruta relativa para la BD (usando /api/files/ para servir los archivos)
			relativePath := fmt.Sprintf("/api/files/comunicados_files/%s/%s", timestamp, file.Filename)

			attachments = append(attachments, services.Attachment{
				Name:     file.Filename,
				Data:     data,
				MimeType: mimeType,
			})
			adjuntosPaths = append(adjuntosPaths, relativePath)
		}
	}

	// Guardar adjuntos como JSON
	adjuntosJSON, _ := json.Marshal(adjuntosPaths)

	var enviados int
	var total int
	var erroresEnvio []string

	// Si el canal es correo, enviar emails
	if canal == "correo" {
		// Obtener lista de correos según el tipo de destinatario
		correosDestinatarios, err := h.comunicadoService.GetCorreosDestinatarios(destinatario)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		if len(correosDestinatarios) == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "No se encontraron destinatarios con correo electrónico",
			})
		}

		// Enviar correos masivos
		result := h.comunicadoService.SendBulkEmails(correosDestinatarios, asunto, mensaje, attachments)
		enviados = result.Enviados
		total = result.Total
		erroresEnvio = result.Errores
	} else {
		// Para WhatsApp, los mensajes ya se enviaron desde el frontend
		// Solo obtener el conteo de enviados del formulario
		if enviadoAStr, ok := form.Value["enviado_a"]; ok && len(enviadoAStr) > 0 {
			if val, err := strconv.Atoi(enviadoAStr[0]); err == nil {
				enviados = val
			}
		}
		total = enviados
	}

	// Crear el comunicado en la base de datos
	comunicado := &models.Comunicado{
		Asunto:        asunto,
		Destinatarios: destinatariosJSON,
		Mensaje:       mensaje,
		Adjuntos:      string(adjuntosJSON),
		UsuarioID:     uint(usuarioID),
		EnviadoA:      enviados,
		Estado:        "enviado",
		Canal:         canal,
	}

	if err := h.comunicadoService.CreateComunicado(comunicado); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al guardar el comunicado",
		})
	}

	response := fiber.Map{
		"success":    true,
		"comunicado": comunicado,
		"enviados":   enviados,
		"total":      total,
	}

	if len(erroresEnvio) > 0 {
		response["errores"] = erroresEnvio
	}

	return c.Status(fiber.StatusCreated).JSON(response)

}

// GetComunicado obtiene un comunicado por ID
func (h *ComunicadoHandler) GetComunicado(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de comunicado inválido",
		})
	}

	comunicado, err := h.comunicadoService.GetComunicadoByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Comunicado no encontrado",
		})
	}

	return c.JSON(comunicado)
}

// GetAllComunicados obtiene todos los comunicados
func (h *ComunicadoHandler) GetAllComunicados(c *fiber.Ctx) error {
	comunicados, err := h.comunicadoService.GetAllComunicados()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los comunicados",
		})
	}

	return c.JSON(comunicados)
}

// DeleteComunicado elimina un comunicado
func (h *ComunicadoHandler) DeleteComunicado(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de comunicado inválido",
		})
	}

	if err := h.comunicadoService.DeleteComunicado(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede eliminar el comunicado",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Comunicado eliminado exitosamente",
	})
}

// SearchComunicados busca comunicados por asunto
func (h *ComunicadoHandler) SearchComunicados(c *fiber.Ctx) error {
	termino := c.Params("termino")

	comunicados, err := h.comunicadoService.SearchComunicados(termino)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden buscar los comunicados",
		})
	}

	return c.JSON(comunicados)
}
