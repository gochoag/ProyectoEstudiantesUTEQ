package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type NoticiaHandler struct {
	noticiaRepo *repositories.NoticiaRepository
}

func NewNoticiaHandler(noticiaRepo *repositories.NoticiaRepository) *NoticiaHandler {
	return &NoticiaHandler{noticiaRepo: noticiaRepo}
}

// CreateNoticia crea una nueva noticia
func (h *NoticiaHandler) CreateNoticia(c *fiber.Ctx) error {
	var noticia models.Noticia

	if err := c.BodyParser(&noticia); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.noticiaRepo.CreateNoticia(&noticia); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede crear la noticia",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(noticia)
}

// GetNoticia obtiene una noticia por ID
func (h *NoticiaHandler) GetNoticia(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de noticia inválido",
		})
	}

	noticia, err := h.noticiaRepo.GetNoticiaByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Noticia no encontrada",
		})
	}

	return c.JSON(noticia)
}

// GetAllNoticias obtiene todas las noticias
func (h *NoticiaHandler) GetAllNoticias(c *fiber.Ctx) error {
	noticias, err := h.noticiaRepo.GetAllNoticias()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las noticias",
		})
	}

	return c.JSON(noticias)
}

// UpdateNoticia actualiza una noticia
func (h *NoticiaHandler) UpdateNoticia(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de noticia inválido",
		})
	}

	noticia, err := h.noticiaRepo.GetNoticiaByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Noticia no encontrada",
		})
	}

	if err := c.BodyParser(noticia); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.noticiaRepo.UpdateNoticia(noticia); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede actualizar la noticia",
		})
	}

	return c.JSON(noticia)
}

// DeleteNoticia elimina una noticia
func (h *NoticiaHandler) DeleteNoticia(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de noticia inválido",
		})
	}

	if err := h.noticiaRepo.DeleteNoticia(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede eliminar la noticia",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Noticia eliminada exitosamente",
	})
}

// GetNoticiasByUsuario obtiene noticias por usuario
func (h *NoticiaHandler) GetNoticiasByUsuario(c *fiber.Ctx) error {
	usuarioID, err := strconv.Atoi(c.Params("usuario_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de usuario inválido",
		})
	}

	noticias, err := h.noticiaRepo.GetNoticiasByUsuario(uint(usuarioID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las noticias",
		})
	}

	return c.JSON(noticias)
}

// GetNoticiasByTitulo busca noticias por título
func (h *NoticiaHandler) GetNoticiasByTitulo(c *fiber.Ctx) error {
	titulo := c.Params("titulo")

	noticias, err := h.noticiaRepo.GetNoticiasByTitulo(titulo)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las noticias",
		})
	}

	return c.JSON(noticias)
}

// GetNoticiasByDescripcion busca noticias por descripción
func (h *NoticiaHandler) GetNoticiasByDescripcion(c *fiber.Ctx) error {
	descripcion := c.Params("descripcion")

	noticias, err := h.noticiaRepo.GetNoticiasByDescripcion(descripcion)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las noticias",
		})
	}

	return c.JSON(noticias)
}

// SearchNoticias busca noticias por título o descripción
func (h *NoticiaHandler) SearchNoticias(c *fiber.Ctx) error {
	termino := c.Params("termino")

	noticias, err := h.noticiaRepo.SearchNoticias(termino)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden buscar las noticias",
		})
	}

	return c.JSON(noticias)
}
