package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type CiudadHandler struct {
	ciudadRepo *repositories.CiudadRepository
}

func NewCiudadHandler(ciudadRepo *repositories.CiudadRepository) *CiudadHandler {
	return &CiudadHandler{ciudadRepo: ciudadRepo}
}

// CreateCiudad crea una nueva ciudad
func (h *CiudadHandler) CreateCiudad(c *fiber.Ctx) error {
	var ciudad models.Ciudad
	
	if err := c.BodyParser(&ciudad); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.ciudadRepo.CreateCiudad(&ciudad); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede crear la ciudad",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(ciudad)
}

// GetCiudad obtiene una ciudad por ID
func (h *CiudadHandler) GetCiudad(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de ciudad inválido",
		})
	}

	ciudad, err := h.ciudadRepo.GetCiudadByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Ciudad no encontrada",
		})
	}

	return c.JSON(ciudad)
}

// GetAllCiudades obtiene todas las ciudades
func (h *CiudadHandler) GetAllCiudades(c *fiber.Ctx) error {
	ciudades, err := h.ciudadRepo.GetAllCiudades()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las ciudades",
		})
	}

	return c.JSON(ciudades)
}

// UpdateCiudad actualiza una ciudad
func (h *CiudadHandler) UpdateCiudad(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de ciudad inválido",
		})
	}

	ciudad, err := h.ciudadRepo.GetCiudadByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Ciudad no encontrada",
		})
	}

	if err := c.BodyParser(ciudad); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.ciudadRepo.UpdateCiudad(ciudad); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede actualizar la ciudad",
		})
	}

	return c.JSON(ciudad)
}

// DeleteCiudad elimina una ciudad
func (h *CiudadHandler) DeleteCiudad(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de ciudad inválido",
		})
	}

	if err := h.ciudadRepo.DeleteCiudad(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede eliminar la ciudad",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Ciudad eliminada exitosamente",
	})
}

// GetCiudadesByProvincia obtiene ciudades por provincia
func (h *CiudadHandler) GetCiudadesByProvincia(c *fiber.Ctx) error {
	provinciaID, err := strconv.Atoi(c.Params("provincia_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de provincia inválido",
		})
	}
	
	ciudades, err := h.ciudadRepo.GetCiudadesByProvincia(uint(provinciaID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las ciudades",
		})
	}

	return c.JSON(ciudades)
}

// GetCiudadByNombre busca ciudades por nombre
func (h *CiudadHandler) GetCiudadByNombre(c *fiber.Ctx) error {
	nombre := c.Params("nombre")
	
	ciudades, err := h.ciudadRepo.GetCiudadByNombre(nombre)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las ciudades",
		})
	}

	return c.JSON(ciudades)
}