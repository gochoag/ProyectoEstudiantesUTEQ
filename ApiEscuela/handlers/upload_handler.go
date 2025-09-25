package handlers

import (
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type UploadHandler struct{}

func NewUploadHandler() *UploadHandler {
	return &UploadHandler{}
}

// UploadFile maneja la subida de archivos y retorna la URL
func (h *UploadHandler) UploadFile(c *fiber.Ctx) error {
	// Obtener el archivo del formulario
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se pudo obtener el archivo",
		})
	}

	// Verificar que el usuario esté autenticado
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Usuario no autenticado",
			"debug": "user_id no encontrado en locals",
		})
	}

	// Debug: Log del userID obtenido
	fmt.Printf("DEBUG: UserID obtenido del token: %d\n", userID)

	// Validar el archivo
	if err := h.validarArchivo(file); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Determinar el tipo de archivo y carpeta
	tipoArchivo, carpetaDestino := h.determinarTipoYCarpeta(file.Header.Get("Content-Type"))
	if carpetaDestino == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Tipo de archivo no soportado",
		})
	}

	// Generar nombre único para el archivo
	extension := filepath.Ext(file.Filename)
	nombreArchivo := h.generarNombreArchivo(extension)

	// Crear la ruta completa
	rutaCompleta := filepath.Join("assets", carpetaDestino, nombreArchivo)

	// Crear el directorio si no existe
	if err := os.MkdirAll(filepath.Dir(rutaCompleta), 0755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al crear directorio",
		})
	}

	// Guardar el archivo
	if err := c.SaveFile(file, rutaCompleta); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al guardar el archivo",
		})
	}

	// Generar URL pública
	baseURL := os.Getenv("BASE_URL")
	if baseURL == "" {
		// Fallback: construir la URL desde el request
		baseURL = c.BaseURL()
		// Si detectamos que estamos en el servidor de producción, agregar el puerto
		if strings.Contains(c.Get("Host"), ":9602") {
			baseURL = strings.Replace(baseURL, "aplicaciones.uteq.edu.ec", "aplicaciones.uteq.edu.ec:9602", 1)
		}
	}
	
	urlArchivo := fmt.Sprintf("%s/api/files/%s/%s", baseURL, carpetaDestino, nombreArchivo)

	return c.JSON(fiber.Map{
		"message": "Archivo subido exitosamente",
		"url":     urlArchivo,
		"tipo":    tipoArchivo,
		"tamano":  file.Size,
	})
}

// GetFile sirve archivos estáticos
func (h *UploadHandler) GetFile(c *fiber.Ctx) error {
	// Obtener la ruta del archivo desde los parámetros
	tipo := c.Params("tipo")
	nombre := c.Params("nombre")

	if tipo == "" || nombre == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Ruta de archivo no especificada",
		})
	}

	// Construir la ruta completa del archivo
	rutaCompleta := filepath.Join("assets", tipo, nombre)

	// Verificar que el archivo existe físicamente
	if _, err := os.Stat(rutaCompleta); os.IsNotExist(err) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Archivo no encontrado",
		})
	}

	// Servir el archivo
	return c.SendFile(rutaCompleta)
}

// Funciones auxiliares

func (h *UploadHandler) validarArchivo(file *multipart.FileHeader) error {
	// Validar tamaño (máximo 50MB)
	const maxSize = 50 * 1024 * 1024
	if file.Size > maxSize {
		return fmt.Errorf("el archivo es demasiado grande (máximo 50MB)")
	}

	// Validar extensión
	extension := strings.ToLower(filepath.Ext(file.Filename))
	extensionesPermitidas := []string{".jpg", ".jpeg", ".png", ".gif", ".mp4", ".avi", ".mov", ".pdf", ".doc", ".docx", ".txt"}

	permitida := false
	for _, ext := range extensionesPermitidas {
		if extension == ext {
			permitida = true
			break
		}
	}

	if !permitida {
		return fmt.Errorf("tipo de archivo no permitido")
	}

	return nil
}

func (h *UploadHandler) determinarTipoYCarpeta(mimeType string) (string, string) {
	switch {
	case strings.HasPrefix(mimeType, "image/"):
		return "image", "images"
	case strings.HasPrefix(mimeType, "video/"):
		return "video", "videos"
	case strings.HasPrefix(mimeType, "application/") || strings.HasPrefix(mimeType, "text/"):
		return "document", "documents"
	default:
		return "", ""
	}
}

func (h *UploadHandler) generarNombreArchivo(extension string) string {
	timestamp := time.Now().Unix()
	random := time.Now().UnixNano() % 10000
	return fmt.Sprintf("%d_%d%s", timestamp, random, extension)
}
