package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type ProvinciaHandler struct {
	provinciaRepo *repositories.ProvinciaRepository
}

func NewProvinciaHandler(provinciaRepo *repositories.ProvinciaRepository) *ProvinciaHandler {
	return &ProvinciaHandler{provinciaRepo: provinciaRepo}
}

// CreateProvincia crea una nueva provincia
func (h *ProvinciaHandler) CreateProvincia(c *fiber.Ctx) error {
	var provincia models.Provincia
	
	if err := c.BodyParser(&provincia); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.provinciaRepo.CreateProvincia(&provincia); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede crear la provincia",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(provincia)
}

// GetProvincia obtiene una provincia por ID
func (h *ProvinciaHandler) GetProvincia(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de provincia inválido",
		})
	}

	provincia, err := h.provinciaRepo.GetProvinciaByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Provincia no encontrada",
		})
	}

	return c.JSON(provincia)
}

// GetAllProvincias obtiene todas las provincias
func (h *ProvinciaHandler) GetAllProvincias(c *fiber.Ctx) error {
	provincias, err := h.provinciaRepo.GetAllProvincias()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las provincias",
		})
	}

	return c.JSON(provincias)
}

// UpdateProvincia actualiza una provincia
func (h *ProvinciaHandler) UpdateProvincia(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de provincia inválido",
		})
	}

	provincia, err := h.provinciaRepo.GetProvinciaByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Provincia no encontrada",
		})
	}

	if err := c.BodyParser(provincia); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.provinciaRepo.UpdateProvincia(provincia); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede actualizar la provincia",
		})
	}

	return c.JSON(provincia)
}

// DeleteProvincia elimina una provincia
func (h *ProvinciaHandler) DeleteProvincia(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de provincia inválido",
		})
	}

	if err := h.provinciaRepo.DeleteProvincia(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede eliminar la provincia",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Provincia eliminada exitosamente",
	})
}

// GetProvinciaByNombre busca provincia por nombre
func (h *ProvinciaHandler) GetProvinciaByNombre(c *fiber.Ctx) error {
	nombre := c.Params("nombre")
	
	provincia, err := h.provinciaRepo.GetProvinciaByNombre(nombre)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Provincia no encontrada",
		})
	}

	return c.JSON(provincia)
}