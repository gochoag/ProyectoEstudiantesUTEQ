package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type VisitaDetalleEstudiantesUniversitariosHandler struct {
	visitaDetalleEstudiantesRepo *repositories.VisitaDetalleEstudiantesUniversitariosRepository
}

func NewVisitaDetalleEstudiantesUniversitariosHandler(visitaDetalleEstudiantesRepo *repositories.VisitaDetalleEstudiantesUniversitariosRepository) *VisitaDetalleEstudiantesUniversitariosHandler {
	return &VisitaDetalleEstudiantesUniversitariosHandler{visitaDetalleEstudiantesRepo: visitaDetalleEstudiantesRepo}
}

// CreateVisitaDetalleEstudiantesUniversitarios crea una nueva relación entre estudiante universitario y programa de visita
func (h *VisitaDetalleEstudiantesUniversitariosHandler) CreateVisitaDetalleEstudiantesUniversitarios(c *fiber.Ctx) error {
	var relacion models.VisitaDetalleEstudiantesUniversitarios
	
	if err := c.BodyParser(&relacion); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	// Verificar si la relación ya existe
	exists, err := h.visitaDetalleEstudiantesRepo.ExistsRelation(relacion.EstudianteUniversitarioID, relacion.ProgramaVisitaID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Error al verificar la relación existente",
		})
	}

	if exists {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "La relación entre el estudiante y el programa de visita ya existe",
		})
	}

	if err := h.visitaDetalleEstudiantesRepo.CreateVisitaDetalleEstudiantesUniversitarios(&relacion); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede crear la relación",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(relacion)
}

// GetVisitaDetalleEstudiantesUniversitarios obtiene una relación por ID
func (h *VisitaDetalleEstudiantesUniversitariosHandler) GetVisitaDetalleEstudiantesUniversitarios(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de relación inválido",
		})
	}

	relacion, err := h.visitaDetalleEstudiantesRepo.GetVisitaDetalleEstudiantesUniversitariosByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Relación no encontrada",
		})
	}

	return c.JSON(relacion)
}

// GetAllVisitaDetalleEstudiantesUniversitarios obtiene todas las relaciones
func (h *VisitaDetalleEstudiantesUniversitariosHandler) GetAllVisitaDetalleEstudiantesUniversitarios(c *fiber.Ctx) error {
	relaciones, err := h.visitaDetalleEstudiantesRepo.GetAllVisitaDetalleEstudiantesUniversitarios()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las relaciones",
		})
	}

	return c.JSON(relaciones)
}

// UpdateVisitaDetalleEstudiantesUniversitarios actualiza una relación
func (h *VisitaDetalleEstudiantesUniversitariosHandler) UpdateVisitaDetalleEstudiantesUniversitarios(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de relación inválido",
		})
	}

	relacion, err := h.visitaDetalleEstudiantesRepo.GetVisitaDetalleEstudiantesUniversitariosByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Relación no encontrada",
		})
	}

	if err := c.BodyParser(relacion); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.visitaDetalleEstudiantesRepo.UpdateVisitaDetalleEstudiantesUniversitarios(relacion); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede actualizar la relación",
		})
	}

	return c.JSON(relacion)
}

// DeleteVisitaDetalleEstudiantesUniversitarios elimina una relación
func (h *VisitaDetalleEstudiantesUniversitariosHandler) DeleteVisitaDetalleEstudiantesUniversitarios(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de relación inválido",
		})
	}

	if err := h.visitaDetalleEstudiantesRepo.DeleteVisitaDetalleEstudiantesUniversitarios(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede eliminar la relación",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Relación eliminada exitosamente",
	})
}

// GetEstudiantesByProgramaVisita obtiene estudiantes por programa de visita
func (h *VisitaDetalleEstudiantesUniversitariosHandler) GetEstudiantesByProgramaVisita(c *fiber.Ctx) error {
	programaVisitaID, err := strconv.Atoi(c.Params("programa_visita_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de programa de visita inválido",
		})
	}
	
	relaciones, err := h.visitaDetalleEstudiantesRepo.GetEstudiantesByProgramaVisita(uint(programaVisitaID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los estudiantes",
		})
	}

	return c.JSON(relaciones)
}

// GetProgramasVisitaByEstudiante obtiene programas de visita por estudiante universitario
func (h *VisitaDetalleEstudiantesUniversitariosHandler) GetProgramasVisitaByEstudiante(c *fiber.Ctx) error {
	estudianteID, err := strconv.Atoi(c.Params("estudiante_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de estudiante inválido",
		})
	}
	
	relaciones, err := h.visitaDetalleEstudiantesRepo.GetProgramasVisitaByEstudiante(uint(estudianteID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los programas de visita",
		})
	}

	return c.JSON(relaciones)
}

// DeleteByProgramaVisita elimina todas las relaciones de un programa de visita específico
func (h *VisitaDetalleEstudiantesUniversitariosHandler) DeleteByProgramaVisita(c *fiber.Ctx) error {
	programaVisitaID, err := strconv.Atoi(c.Params("programa_visita_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de programa de visita inválido",
		})
	}

	if err := h.visitaDetalleEstudiantesRepo.DeleteByProgramaVisita(uint(programaVisitaID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden eliminar las relaciones",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Todas las relaciones del programa de visita eliminadas exitosamente",
	})
}

// DeleteByEstudiante elimina todas las relaciones de un estudiante específico
func (h *VisitaDetalleEstudiantesUniversitariosHandler) DeleteByEstudiante(c *fiber.Ctx) error {
	estudianteID, err := strconv.Atoi(c.Params("estudiante_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de estudiante inválido",
		})
	}

	if err := h.visitaDetalleEstudiantesRepo.DeleteByEstudiante(uint(estudianteID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden eliminar las relaciones",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Todas las relaciones del estudiante eliminadas exitosamente",
	})
}

// GetEstadisticasParticipacion obtiene estadísticas de participación de estudiantes
func (h *VisitaDetalleEstudiantesUniversitariosHandler) GetEstadisticasParticipacion(c *fiber.Ctx) error {
	estadisticas, err := h.visitaDetalleEstudiantesRepo.GetEstadisticasParticipacion()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener las estadísticas",
		})
	}

	return c.JSON(estadisticas)
}