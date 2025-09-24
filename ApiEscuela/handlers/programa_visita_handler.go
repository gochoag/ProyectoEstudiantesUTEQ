package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

type ProgramaVisitaHandler struct {
	programaRepo *repositories.ProgramaVisitaRepository
}

func NewProgramaVisitaHandler(programaRepo *repositories.ProgramaVisitaRepository) *ProgramaVisitaHandler {
	return &ProgramaVisitaHandler{programaRepo: programaRepo}
}

// CreateProgramaVisita crea un nuevo programa de visita
func (h *ProgramaVisitaHandler) CreateProgramaVisita(c *fiber.Ctx) error {
	var programa models.ProgramaVisita
	
	if err := c.BodyParser(&programa); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.programaRepo.CreateProgramaVisita(&programa); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede crear el programa de visita",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(programa)
}

// GetProgramaVisita obtiene un programa de visita por ID
func (h *ProgramaVisitaHandler) GetProgramaVisita(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de programa de visita inválido",
		})
	}

	programa, err := h.programaRepo.GetProgramaVisitaByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Programa de visita no encontrado",
		})
	}

	return c.JSON(programa)
}

// GetAllProgramasVisita obtiene todos los programas de visita
func (h *ProgramaVisitaHandler) GetAllProgramasVisita(c *fiber.Ctx) error {
	programas, err := h.programaRepo.GetAllProgramasVisita()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los programas de visita",
		})
	}

	return c.JSON(programas)
}

// UpdateProgramaVisita actualiza un programa de visita
func (h *ProgramaVisitaHandler) UpdateProgramaVisita(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de programa de visita inválido",
		})
	}

	programa, err := h.programaRepo.GetProgramaVisitaByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Programa de visita no encontrado",
		})
	}

	if err := c.BodyParser(programa); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.programaRepo.UpdateProgramaVisita(programa); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede actualizar el programa de visita",
		})
	}

	return c.JSON(programa)
}

// DeleteProgramaVisita elimina un programa de visita
func (h *ProgramaVisitaHandler) DeleteProgramaVisita(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de programa de visita inválido",
		})
	}

	if err := h.programaRepo.DeleteProgramaVisita(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede eliminar el programa de visita",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Programa de visita eliminado exitosamente",
	})
}

// GetProgramasVisitaByFecha obtiene programas por fecha
func (h *ProgramaVisitaHandler) GetProgramasVisitaByFecha(c *fiber.Ctx) error {
	fechaStr := c.Params("fecha")
	fecha, err := time.Parse("2006-01-02", fechaStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Formato de fecha inválido. Use YYYY-MM-DD",
		})
	}
	
	programas, err := h.programaRepo.GetProgramasVisitaByFecha(fecha)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los programas de visita",
		})
	}

	return c.JSON(programas)
}


// GetProgramasVisitaByInstitucion obtiene programas por institución
func (h *ProgramaVisitaHandler) GetProgramasVisitaByInstitucion(c *fiber.Ctx) error {
	institucionID, err := strconv.Atoi(c.Params("institucion_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de institución inválido",
		})
	}
	
	programas, err := h.programaRepo.GetProgramasVisitaByInstitucion(uint(institucionID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los programas de visita",
		})
	}

	return c.JSON(programas)
}

// GetProgramasVisitaByRangoFecha obtiene programas en un rango de fechas
func (h *ProgramaVisitaHandler) GetProgramasVisitaByRangoFecha(c *fiber.Ctx) error {
	fechaInicioStr := c.Query("inicio")
	fechaFinStr := c.Query("fin")
	
	if fechaInicioStr == "" || fechaFinStr == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Se requieren parámetros 'inicio' y 'fin' en formato YYYY-MM-DD",
		})
	}

	fechaInicio, err := time.Parse("2006-01-02", fechaInicioStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Formato de fecha de inicio inválido. Use YYYY-MM-DD",
		})
	}

	fechaFin, err := time.Parse("2006-01-02", fechaFinStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Formato de fecha de fin inválido. Use YYYY-MM-DD",
		})
	}
	
	programas, err := h.programaRepo.GetProgramasVisitaByRangoFecha(fechaInicio, fechaFin)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los programas de visita",
		})
	}

	return c.JSON(programas)
}