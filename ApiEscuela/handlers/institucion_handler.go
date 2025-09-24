package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type InstitucionHandler struct {
	institucionRepo *repositories.InstitucionRepository
}

func NewInstitucionHandler(institucionRepo *repositories.InstitucionRepository) *InstitucionHandler {
	return &InstitucionHandler{institucionRepo: institucionRepo}
}

// CreateInstitucion crea una nueva institución
func (h *InstitucionHandler) CreateInstitucion(c *fiber.Ctx) error {
	var institucion models.Institucion
	
	if err := c.BodyParser(&institucion); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.institucionRepo.CreateInstitucion(&institucion); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede crear la institución",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(institucion)
}

// GetInstitucion obtiene una institución por ID
func (h *InstitucionHandler) GetInstitucion(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de institución inválido",
		})
	}

	institucion, err := h.institucionRepo.GetInstitucionByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Institución no encontrada",
		})
	}

	return c.JSON(institucion)
}

// GetAllInstituciones obtiene todas las instituciones
func (h *InstitucionHandler) GetAllInstituciones(c *fiber.Ctx) error {
	instituciones, err := h.institucionRepo.GetAllInstituciones()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las instituciones",
		})
	}

	return c.JSON(instituciones)
}

// UpdateInstitucion actualiza una institución
func (h *InstitucionHandler) UpdateInstitucion(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de institución inválido",
		})
	}

	institucion, err := h.institucionRepo.GetInstitucionByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Institución no encontrada",
		})
	}

	if err := c.BodyParser(institucion); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.institucionRepo.UpdateInstitucion(institucion); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede actualizar la institución",
		})
	}

	return c.JSON(institucion)
}

// DeleteInstitucion elimina una institución
func (h *InstitucionHandler) DeleteInstitucion(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de institución inválido",
		})
	}

	if err := h.institucionRepo.DeleteInstitucion(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede eliminar la institución",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Institución eliminada exitosamente",
	})
}

// GetInstitucionesByNombre busca instituciones por nombre
func (h *InstitucionHandler) GetInstitucionesByNombre(c *fiber.Ctx) error {
	nombre := c.Params("nombre")
	
	instituciones, err := h.institucionRepo.GetInstitucionesByNombre(nombre)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las instituciones",
		})
	}

	return c.JSON(instituciones)
}

// GetInstitucionesByAutoridad busca instituciones por autoridad
func (h *InstitucionHandler) GetInstitucionesByAutoridad(c *fiber.Ctx) error {
	autoridad := c.Params("autoridad")
	
	instituciones, err := h.institucionRepo.GetInstitucionesByAutoridad(autoridad)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las instituciones",
		})
	}

	return c.JSON(instituciones)
}