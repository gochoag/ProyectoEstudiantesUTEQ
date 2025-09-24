package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type DetalleAutoridadDetallesVisitaHandler struct {
	detalleRepo *repositories.DetalleAutoridadDetallesVisitaRepository
}

func NewDetalleAutoridadDetallesVisitaHandler(detalleRepo *repositories.DetalleAutoridadDetallesVisitaRepository) *DetalleAutoridadDetallesVisitaHandler {
	return &DetalleAutoridadDetallesVisitaHandler{detalleRepo: detalleRepo}
}

// CreateDetalleAutoridadDetallesVisita crea un nuevo detalle de autoridad para visita
func (h *DetalleAutoridadDetallesVisitaHandler) CreateDetalleAutoridadDetallesVisita(c *fiber.Ctx) error {
	var detalle models.DetalleAutoridadDetallesVisita
	
	if err := c.BodyParser(&detalle); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	// Verificar si la relación ya existe
	exists, err := h.detalleRepo.ExistsRelation(detalle.ProgramaVisitaID, detalle.AutoridadUTEQID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al verificar la relación existente",
		})
	}

	if exists {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "La relación entre el programa de visita y la autoridad ya existe",
		})
	}

	if err := h.detalleRepo.CreateDetalleAutoridadDetallesVisita(&detalle); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede crear el detalle de autoridad",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(detalle)
}

// GetDetalleAutoridadDetallesVisita obtiene un detalle por ID
func (h *DetalleAutoridadDetallesVisitaHandler) GetDetalleAutoridadDetallesVisita(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de detalle inválido",
		})
	}

	detalle, err := h.detalleRepo.GetDetalleAutoridadDetallesVisitaByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Detalle no encontrado",
		})
	}

	return c.JSON(detalle)
}

// GetAllDetalleAutoridadDetallesVisitas obtiene todos los detalles
func (h *DetalleAutoridadDetallesVisitaHandler) GetAllDetalleAutoridadDetallesVisitas(c *fiber.Ctx) error {
	detalles, err := h.detalleRepo.GetAllDetalleAutoridadDetallesVisitas()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los detalles",
		})
	}

	return c.JSON(detalles)
}

// UpdateDetalleAutoridadDetallesVisita actualiza un detalle
func (h *DetalleAutoridadDetallesVisitaHandler) UpdateDetalleAutoridadDetallesVisita(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de detalle inválido",
		})
	}

	detalle, err := h.detalleRepo.GetDetalleAutoridadDetallesVisitaByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Detalle no encontrado",
		})
	}

	if err := c.BodyParser(detalle); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.detalleRepo.UpdateDetalleAutoridadDetallesVisita(detalle); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede actualizar el detalle",
		})
	}

	return c.JSON(detalle)
}

// DeleteDetalleAutoridadDetallesVisita elimina un detalle
func (h *DetalleAutoridadDetallesVisitaHandler) DeleteDetalleAutoridadDetallesVisita(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de detalle inválido",
		})
	}

	if err := h.detalleRepo.DeleteDetalleAutoridadDetallesVisita(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede eliminar el detalle",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Detalle eliminado exitosamente",
	})
}

// GetDetallesByProgramaVisita obtiene todos los detalles de un programa de visita
func (h *DetalleAutoridadDetallesVisitaHandler) GetDetallesByProgramaVisita(c *fiber.Ctx) error {
	programaVisitaID, err := strconv.Atoi(c.Params("programa_visita_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de programa de visita inválido",
		})
	}

	detalles, err := h.detalleRepo.GetDetallesByProgramaVisitaID(uint(programaVisitaID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los detalles del programa de visita",
		})
	}

	return c.JSON(detalles)
}

// GetDetallesByAutoridad obtiene todos los detalles de una autoridad
func (h *DetalleAutoridadDetallesVisitaHandler) GetDetallesByAutoridad(c *fiber.Ctx) error {
	autoridadID, err := strconv.Atoi(c.Params("autoridad_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de autoridad inválido",
		})
	}

	detalles, err := h.detalleRepo.GetDetallesByAutoridadID(uint(autoridadID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los detalles de la autoridad",
		})
	}

	return c.JSON(detalles)
}

// DeleteDetallesByProgramaVisita elimina todos los detalles de un programa de visita específico
func (h *DetalleAutoridadDetallesVisitaHandler) DeleteDetallesByProgramaVisita(c *fiber.Ctx) error {
	programaVisitaID, err := strconv.Atoi(c.Params("programa_visita_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de programa de visita inválido",
		})
	}

	if err := h.detalleRepo.DeleteDetallesByProgramaVisitaID(uint(programaVisitaID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden eliminar los detalles",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Todos los detalles del programa de visita eliminados exitosamente",
	})
}

// DeleteDetallesByAutoridad elimina todos los detalles de una autoridad específica
func (h *DetalleAutoridadDetallesVisitaHandler) DeleteDetallesByAutoridad(c *fiber.Ctx) error {
	autoridadID, err := strconv.Atoi(c.Params("autoridad_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de autoridad inválido",
		})
	}

	if err := h.detalleRepo.DeleteDetallesByAutoridadID(uint(autoridadID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden eliminar los detalles",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Todos los detalles de la autoridad eliminados exitosamente",
	})
}

// GetEstadisticasAsignacion obtiene estadísticas de asignación de autoridades
func (h *DetalleAutoridadDetallesVisitaHandler) GetEstadisticasAsignacion(c *fiber.Ctx) error {
	estadisticas, err := h.detalleRepo.GetEstadisticasAsignacion()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las estadísticas",
		})
	}

	return c.JSON(estadisticas)
}