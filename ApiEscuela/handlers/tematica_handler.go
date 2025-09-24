package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type TematicaHandler struct {
	tematicaRepo *repositories.TematicaRepository
}

func NewTematicaHandler(tematicaRepo *repositories.TematicaRepository) *TematicaHandler {
	return &TematicaHandler{tematicaRepo: tematicaRepo}
}

// CreateTematica crea una nueva temática
func (h *TematicaHandler) CreateTematica(c *fiber.Ctx) error {
	var tematica models.Tematica
	
	if err := c.BodyParser(&tematica); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.tematicaRepo.CreateTematica(&tematica); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede crear la temática",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(tematica)
}

// GetTematica obtiene una temática por ID
func (h *TematicaHandler) GetTematica(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de temática inválido",
		})
	}

	tematica, err := h.tematicaRepo.GetTematicaByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Temática no encontrada",
		})
	}

	return c.JSON(tematica)
}

// GetAllTematicas obtiene todas las temáticas
func (h *TematicaHandler) GetAllTematicas(c *fiber.Ctx) error {
	tematicas, err := h.tematicaRepo.GetAllTematicas()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las temáticas",
		})
	}

	return c.JSON(tematicas)
}

// UpdateTematica actualiza una temática
func (h *TematicaHandler) UpdateTematica(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de temática inválido",
		})
	}

	tematica, err := h.tematicaRepo.GetTematicaByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Temática no encontrada",
		})
	}

	if err := c.BodyParser(tematica); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.tematicaRepo.UpdateTematica(tematica); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede actualizar la temática",
		})
	}

	return c.JSON(tematica)
}

// DeleteTematica elimina una temática
func (h *TematicaHandler) DeleteTematica(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de temática inválido",
		})
	}

	if err := h.tematicaRepo.DeleteTematica(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede eliminar la temática",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Temática eliminada exitosamente",
	})
}

// GetTematicasByNombre busca temáticas por nombre
func (h *TematicaHandler) GetTematicasByNombre(c *fiber.Ctx) error {
	nombre := c.Params("nombre")
	
	tematicas, err := h.tematicaRepo.GetTematicasByNombre(nombre)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las temáticas",
		})
	}

	return c.JSON(tematicas)
}

// GetTematicasByDescripcion busca temáticas por descripción
func (h *TematicaHandler) GetTematicasByDescripcion(c *fiber.Ctx) error {
	descripcion := c.Params("descripcion")
	
	tematicas, err := h.tematicaRepo.GetTematicasByDescripcion(descripcion)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las temáticas",
		})
	}

	return c.JSON(tematicas)
}