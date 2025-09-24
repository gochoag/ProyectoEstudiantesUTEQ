package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type VisitaDetalleHandler struct {
	visitaDetalleRepo *repositories.VisitaDetalleRepository
}

func NewVisitaDetalleHandler(visitaDetalleRepo *repositories.VisitaDetalleRepository) *VisitaDetalleHandler {
	return &VisitaDetalleHandler{visitaDetalleRepo: visitaDetalleRepo}
}

// CreateVisitaDetalle crea un nuevo detalle de visita
func (h *VisitaDetalleHandler) CreateVisitaDetalle(c *fiber.Ctx) error {
	var detalle models.VisitaDetalle
	
	if err := c.BodyParser(&detalle); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	// Verificar si la relación ya existe
	exists, err := h.visitaDetalleRepo.ExistsRelation(detalle.ProgramaVisitaID, detalle.ActividadID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al verificar la relación existente",
		})
	}

	if exists {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "La relación entre el programa de visita y la actividad ya existe",
		})
	}

	if err := h.visitaDetalleRepo.CreateVisitaDetalle(&detalle); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede crear el detalle de visita",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(detalle)
}

// GetVisitaDetalle obtiene un detalle de visita por ID
func (h *VisitaDetalleHandler) GetVisitaDetalle(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de detalle de visita inválido",
		})
	}

	detalle, err := h.visitaDetalleRepo.GetVisitaDetalleByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Detalle de visita no encontrado",
		})
	}

	return c.JSON(detalle)
}

// GetAllVisitaDetalles obtiene todos los detalles de visita
func (h *VisitaDetalleHandler) GetAllVisitaDetalles(c *fiber.Ctx) error {
	detalles, err := h.visitaDetalleRepo.GetAllVisitaDetalles()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los detalles de visita",
		})
	}

	return c.JSON(detalles)
}

// UpdateVisitaDetalle actualiza un detalle de visita
func (h *VisitaDetalleHandler) UpdateVisitaDetalle(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de detalle de visita inválido",
		})
	}

	detalle, err := h.visitaDetalleRepo.GetVisitaDetalleByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Detalle de visita no encontrado",
		})
	}

	if err := c.BodyParser(detalle); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.visitaDetalleRepo.UpdateVisitaDetalle(detalle); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede actualizar el detalle de visita",
		})
	}

	return c.JSON(detalle)
}

// DeleteVisitaDetalle elimina un detalle de visita
func (h *VisitaDetalleHandler) DeleteVisitaDetalle(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de detalle de visita inválido",
		})
	}

	if err := h.visitaDetalleRepo.DeleteVisitaDetalle(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede eliminar el detalle de visita",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Detalle de visita eliminado exitosamente",
	})
}

// GetVisitaDetallesByActividad obtiene detalles por actividad
func (h *VisitaDetalleHandler) GetVisitaDetallesByActividad(c *fiber.Ctx) error {
	actividadID, err := strconv.Atoi(c.Params("actividad_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de actividad inválido",
		})
	}
	
	detalles, err := h.visitaDetalleRepo.GetVisitaDetallesByActividad(uint(actividadID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los detalles de visita",
		})
	}

	return c.JSON(detalles)
}

// GetVisitaDetallesByPrograma obtiene detalles por programa de visita
func (h *VisitaDetalleHandler) GetVisitaDetallesByPrograma(c *fiber.Ctx) error {
	programaID, err := strconv.Atoi(c.Params("programa_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de programa inválido",
		})
	}
	
	detalles, err := h.visitaDetalleRepo.GetVisitaDetallesByPrograma(uint(programaID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los detalles de visita",
		})
	}

	return c.JSON(detalles)
}

// DeleteVisitaDetallesByPrograma elimina todos los detalles de un programa de visita específico
func (h *VisitaDetalleHandler) DeleteVisitaDetallesByPrograma(c *fiber.Ctx) error {
	programaID, err := strconv.Atoi(c.Params("programa_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de programa inválido",
		})
	}

	if err := h.visitaDetalleRepo.DeleteVisitaDetallesByPrograma(uint(programaID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden eliminar los detalles",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Todos los detalles del programa eliminados exitosamente",
	})
}

// DeleteVisitaDetallesByActividad elimina todos los detalles de una actividad específica
func (h *VisitaDetalleHandler) DeleteVisitaDetallesByActividad(c *fiber.Ctx) error {
	actividadID, err := strconv.Atoi(c.Params("actividad_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de actividad inválido",
		})
	}

	if err := h.visitaDetalleRepo.DeleteVisitaDetallesByActividad(uint(actividadID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden eliminar los detalles",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Todos los detalles de la actividad eliminados exitosamente",
	})
}

// GetEstadisticasActividades obtiene estadísticas de actividades en visitas
func (h *VisitaDetalleHandler) GetEstadisticasActividades(c *fiber.Ctx) error {
	estadisticas, err := h.visitaDetalleRepo.GetEstadisticasActividades()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las estadísticas",
		})
	}

	return c.JSON(estadisticas)
}