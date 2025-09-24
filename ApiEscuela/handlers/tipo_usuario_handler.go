package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type TipoUsuarioHandler struct {
	tipoUsuarioRepo *repositories.TipoUsuarioRepository
}

func NewTipoUsuarioHandler(tipoUsuarioRepo *repositories.TipoUsuarioRepository) *TipoUsuarioHandler {
	return &TipoUsuarioHandler{tipoUsuarioRepo: tipoUsuarioRepo}
}

// CreateTipoUsuario crea un nuevo tipo de usuario
func (h *TipoUsuarioHandler) CreateTipoUsuario(c *fiber.Ctx) error {
	var tipoUsuario models.TipoUsuario
	
	if err := c.BodyParser(&tipoUsuario); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.tipoUsuarioRepo.CreateTipoUsuario(&tipoUsuario); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede crear el tipo de usuario",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(tipoUsuario)
}

// GetTipoUsuario obtiene un tipo de usuario por ID
func (h *TipoUsuarioHandler) GetTipoUsuario(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de tipo de usuario inválido",
		})
	}

	tipoUsuario, err := h.tipoUsuarioRepo.GetTipoUsuarioByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Tipo de usuario no encontrado",
		})
	}

	return c.JSON(tipoUsuario)
}

// GetAllTiposUsuario obtiene todos los tipos de usuario
func (h *TipoUsuarioHandler) GetAllTiposUsuario(c *fiber.Ctx) error {
	tiposUsuario, err := h.tipoUsuarioRepo.GetAllTiposUsuario()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los tipos de usuario",
		})
	}

	return c.JSON(tiposUsuario)
}

// UpdateTipoUsuario actualiza un tipo de usuario
func (h *TipoUsuarioHandler) UpdateTipoUsuario(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de tipo de usuario inválido",
		})
	}

	tipoUsuario, err := h.tipoUsuarioRepo.GetTipoUsuarioByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Tipo de usuario no encontrado",
		})
	}

	if err := c.BodyParser(tipoUsuario); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.tipoUsuarioRepo.UpdateTipoUsuario(tipoUsuario); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede actualizar el tipo de usuario",
		})
	}

	return c.JSON(tipoUsuario)
}

// DeleteTipoUsuario elimina un tipo de usuario
func (h *TipoUsuarioHandler) DeleteTipoUsuario(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de tipo de usuario inválido",
		})
	}

	if err := h.tipoUsuarioRepo.DeleteTipoUsuario(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede eliminar el tipo de usuario",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Tipo de usuario eliminado exitosamente",
	})
}

// GetTipoUsuarioByNombre busca tipo de usuario por nombre
func (h *TipoUsuarioHandler) GetTipoUsuarioByNombre(c *fiber.Ctx) error {
	nombre := c.Params("nombre")
	
	tipoUsuario, err := h.tipoUsuarioRepo.GetTipoUsuarioByNombre(nombre)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Tipo de usuario no encontrado",
		})
	}

	return c.JSON(tipoUsuario)
}