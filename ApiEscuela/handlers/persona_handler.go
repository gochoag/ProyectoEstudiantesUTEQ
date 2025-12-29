package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type PersonaHandler struct {
	personaRepo *repositories.PersonaRepository
}

func NewPersonaHandler(personaRepo *repositories.PersonaRepository) *PersonaHandler {
	return &PersonaHandler{personaRepo: personaRepo}
}

// CreatePersona crea una nueva persona
func (h *PersonaHandler) CreatePersona(c *fiber.Ctx) error {
	var persona models.Persona

	// Parsear JSON
	if err := c.BodyParser(&persona); err != nil {
		return SendError(c, 400, "invalid_json", "No se puede procesar el JSON. Verifique el formato de los datos", err.Error())
	}

	// Validar campos requeridos
	if validationErrors := h.validatePersonaRequiredFields(&persona); len(validationErrors) > 0 {
		return SendValidationError(c, "Faltan campos requeridos", validationErrors)
	}

	// Validar datos completos
	if validationErrors := h.validatePersona(&persona, false); len(validationErrors) > 0 {
		return SendValidationError(c, "Los datos proporcionados no son válidos", validationErrors)
	}

	// Limpiar datos
	persona.Nombre = strings.TrimSpace(persona.Nombre)
	persona.Cedula = strings.TrimSpace(persona.Cedula)

	// Convertir cadenas vacías a nil para campos opcionales
	if persona.Correo != nil {
		correoTrimmed := strings.TrimSpace(*persona.Correo)
		if correoTrimmed == "" {
			persona.Correo = nil
		} else {
			persona.Correo = &correoTrimmed
		}
	}

	if persona.Telefono != nil {
		telefonoTrimmed := strings.TrimSpace(*persona.Telefono)
		if telefonoTrimmed == "" {
			persona.Telefono = nil
		} else {
			persona.Telefono = &telefonoTrimmed
		}
	}

	// Verificar si ya existe una persona con la misma cédula
	if existingPersona, err := h.personaRepo.GetPersonaByCedula(persona.Cedula); err == nil && existingPersona != nil {
		return SendError(c, 409, "duplicate_cedula", "Ya existe una persona con esta cédula", "La cédula debe ser única")
	}

	// Verificar si ya existe una persona con el mismo correo (si se proporciona)
	if persona.Correo != nil && *persona.Correo != "" {
		if existingPersonas, err := h.personaRepo.GetPersonasByCorreo(*persona.Correo); err == nil && len(existingPersonas) > 0 {
			return SendError(c, 409, "duplicate_email", "Ya existe una persona con este correo electrónico", "El correo debe ser único")
		}
	}

	// Crear persona
	if err := h.personaRepo.CreatePersona(&persona); err != nil {
		// Manejar errores específicos del repositorio
		switch err.Error() {
		case "cedula repetida":
			return SendError(c, 409, "duplicate_cedula", "Ya existe una persona con esta cédula", "La cédula debe ser única")
		case "correo repetido":
			return SendError(c, 409, "duplicate_email", "Ya existe una persona con este correo electrónico", "El correo debe ser único")
		case "persona ya existe":
			return SendError(c, 409, "persona_duplicada", "Ya existe una persona con estos datos", "Verifique que los datos sean únicos")
		default:
			return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudo crear la persona")
		}
	}

	return SendSuccess(c, 201, persona)
}

// GetPersona obtiene una persona por ID
func (h *PersonaHandler) GetPersona(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "missing_id", "El ID de la persona es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "invalid_id", "El ID de la persona no es válido", "El ID debe ser un número entero positivo")
	}

	persona, err := h.personaRepo.GetPersonaByID(uint(id))
	if err != nil {
		return SendError(c, 404, "person_not_found", "No se encontró la persona solicitada", "Verifique que el ID sea correcto")
	}

	return SendSuccess(c, 200, persona)
}

// GetAllPersonas obtiene todas las personas
func (h *PersonaHandler) GetAllPersonas(c *fiber.Ctx) error {
	personas, err := h.personaRepo.GetAllPersonas()
	if err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudieron obtener las personas")
	}

	return SendSuccess(c, 200, personas)
}

// UpdatePersona actualiza una persona
func (h *PersonaHandler) UpdatePersona(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "missing_id", "El ID de la persona es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "invalid_id", "El ID de la persona no es válido", "El ID debe ser un número entero positivo")
	}

	// Verificar que la persona existe
	existingPersona, err := h.personaRepo.GetPersonaByID(uint(id))
	if err != nil {
		return SendError(c, 404, "person_not_found", "No se encontró la persona solicitada", "Verifique que el ID sea correcto")
	}

	// Parsear datos de actualización
	var updateData models.Persona
	if err := c.BodyParser(&updateData); err != nil {
		return SendError(c, 400, "invalid_json", "No se puede procesar el JSON. Verifique el formato de los datos", err.Error())
	}

	// Validar campos requeridos
	if validationErrors := h.validatePersonaRequiredFields(&updateData); len(validationErrors) > 0 {
		return SendValidationError(c, "Faltan campos requeridos", validationErrors)
	}

	// Validar datos de actualización
	if validationErrors := h.validatePersona(&updateData, true); len(validationErrors) > 0 {
		return SendValidationError(c, "Los datos proporcionados no son válidos", validationErrors)
	}

	// Actualizar campos (mantener ID original)
	persona := *existingPersona
	persona.Nombre = strings.TrimSpace(updateData.Nombre)
	persona.Cedula = strings.TrimSpace(updateData.Cedula)
	persona.FechaNacimiento = updateData.FechaNacimiento

	// Convertir cadenas vacías a nil para campos opcionales
	if updateData.Correo != nil {
		correoTrimmed := strings.TrimSpace(*updateData.Correo)
		if correoTrimmed == "" {
			persona.Correo = nil
		} else {
			persona.Correo = &correoTrimmed
		}
	} else {
		persona.Correo = nil
	}

	if updateData.Telefono != nil {
		telefonoTrimmed := strings.TrimSpace(*updateData.Telefono)
		if telefonoTrimmed == "" {
			persona.Telefono = nil
		} else {
			persona.Telefono = &telefonoTrimmed
		}
	} else {
		persona.Telefono = nil
	}

	// Verificar si la nueva cédula ya existe en otra persona
	if persona.Cedula != existingPersona.Cedula {
		if existingPersonaByCedula, _ := h.personaRepo.GetPersonaByCedula(persona.Cedula); existingPersonaByCedula != nil {
			return SendError(c, 409, "duplicate_cedula", "Ya existe otra persona con esta cédula", "La cédula debe ser única")
		}
	}

	// Verificar si el nuevo correo ya existe en otra persona (si se proporciona)
	if persona.Correo != nil && *persona.Correo != "" {
		existingCorreoIsDifferent := existingPersona.Correo == nil || *existingPersona.Correo != *persona.Correo
		if existingCorreoIsDifferent {
			if existingPersonas, _ := h.personaRepo.GetPersonasByCorreo(*persona.Correo); len(existingPersonas) > 0 {
				// Verificar que no sea la misma persona
				for _, p := range existingPersonas {
					if p.ID != persona.ID {
						return SendError(c, 409, "duplicate_email", "Ya existe otra persona con este correo electrónico", "El correo debe ser único")
					}
				}
			}
		}
	}

	// Actualizar en base de datos
	if err := h.personaRepo.UpdatePersona(&persona); err != nil {
		// Manejar errores específicos del repositorio
		switch err.Error() {
		case "cedula repetida":
			return SendError(c, 409, "duplicate_cedula", "Ya existe otra persona con esta cédula", "La cédula debe ser única")
		case "correo repetido":
			return SendError(c, 409, "duplicate_email", "Ya existe otra persona con este correo electrónico", "El correo debe ser único")
		case "persona ya existe":
			return SendError(c, 409, "persona_duplicada", "Ya existe otra persona con estos datos", "Verifique que los datos sean únicos")
		default:
			return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudo actualizar la persona")
		}
	}

	return SendSuccess(c, 200, persona)
}

// DeletePersona elimina una persona
func (h *PersonaHandler) DeletePersona(c *fiber.Ctx) error {
	idStr := c.Params("id")
	if idStr == "" {
		return SendError(c, 400, "missing_id", "El ID de la persona es requerido", "Proporcione un ID válido")
	}

	id, err := strconv.Atoi(idStr)
	if err != nil || id <= 0 {
		return SendError(c, 400, "invalid_id", "El ID de la persona no es válido", "El ID debe ser un número entero positivo")
	}

	// Verificar que la persona existe antes de eliminar
	persona, err := h.personaRepo.GetPersonaByID(uint(id))
	if err != nil {
		return SendError(c, 404, "person_not_found", "No se encontró la persona solicitada", "Verifique que el ID sea correcto")
	}

	// Verificar si la persona tiene relaciones (estudiantes, autoridades, usuarios)
	if len(persona.Estudiantes) > 0 || len(persona.EstudiantesUniv) > 0 || len(persona.AutoridadesUTEQ) > 0 || len(persona.Usuarios) > 0 {
		return SendError(c, 409, "person_in_use", "No se puede eliminar la persona porque está siendo utilizada", "La persona tiene relaciones activas que impiden su eliminación")
	}

	if err := h.personaRepo.DeletePersona(uint(id)); err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudo eliminar la persona")
	}

	return SendSuccess(c, 200, fiber.Map{
		"message": "Persona eliminada exitosamente",
		"id":      id,
	})
}

// GetPersonaByCedula obtiene una persona por cédula
func (h *PersonaHandler) GetPersonaByCedula(c *fiber.Ctx) error {
	cedula := c.Params("cedula")
	if cedula == "" {
		return SendError(c, 400, "missing_cedula", "La cédula es requerida", "Proporcione una cédula válida")
	}

	// Validar formato de cédula (más flexible)
	cedulaRegex := regexp.MustCompile(`^\d{7,10}$`)
	if !cedulaRegex.MatchString(strings.TrimSpace(cedula)) {
		return SendError(c, 400, "invalid_cedula", "El formato de la cédula no es válido", "La cédula debe tener entre 7 y 10 dígitos numéricos")
	}

	persona, err := h.personaRepo.GetPersonaByCedula(strings.TrimSpace(cedula))
	if err != nil {
		return SendError(c, 404, "person_not_found", "No se encontró la persona solicitada", "Verifique que la cédula sea correcta")
	}

	return SendSuccess(c, 200, persona)
}

// GetPersonasByCorreo obtiene personas por correo
func (h *PersonaHandler) GetPersonasByCorreo(c *fiber.Ctx) error {
	correo := c.Params("correo")
	if correo == "" {
		return SendError(c, 400, "missing_email", "El correo electrónico es requerido", "Proporcione un correo válido")
	}

	// Validar formato de correo
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(strings.TrimSpace(correo)) {
		return SendError(c, 400, "invalid_email", "El formato del correo electrónico no es válido", "Proporcione un correo con formato válido")
	}

	personas, err := h.personaRepo.GetPersonasByCorreo(strings.TrimSpace(correo))
	if err != nil {
		return SendError(c, 500, "database_error", "Error interno del servidor", "No se pudieron obtener las personas")
	}

	return SendSuccess(c, 200, personas)
}

// validatePersona valida los datos de una persona
func (h *PersonaHandler) validatePersona(persona *models.Persona, isUpdate bool) []ValidationError {
	var errors []ValidationError

	// Validar nombre
	nombre := strings.TrimSpace(persona.Nombre)
	if nombre == "" {
		errors = append(errors, ValidationError{
			Field:   "nombre",
			Message: "El nombre es requerido",
			Value:   persona.Nombre,
		})
	} else if len(nombre) < 2 {
		errors = append(errors, ValidationError{
			Field:   "nombre",
			Message: "El nombre debe tener al menos 2 caracteres",
			Value:   persona.Nombre,
		})
	} else if len(nombre) > 100 {
		errors = append(errors, ValidationError{
			Field:   "nombre",
			Message: "El nombre no puede exceder 100 caracteres",
			Value:   persona.Nombre,
		})
	}

	// Validar cédula
	cedula := strings.TrimSpace(persona.Cedula)
	if cedula == "" {
		errors = append(errors, ValidationError{
			Field:   "cedula",
			Message: "La cédula es requerida",
			Value:   persona.Cedula,
		})
	} else {
		// Validar formato de cédula (más flexible)
		cedulaRegex := regexp.MustCompile(`^\d{6,15}$`)
		if !cedulaRegex.MatchString(cedula) {
			errors = append(errors, ValidationError{
				Field:   "cedula",
				Message: "La cédula debe tener entre 6 y 15 dígitos numéricos",
				Value:   persona.Cedula,
			})
		}
	}

	// Validar correo (opcional pero si se proporciona debe ser válido)
	if persona.Correo != nil {
		correo := strings.TrimSpace(*persona.Correo)
		if correo != "" {
			emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
			if !emailRegex.MatchString(correo) {
				errors = append(errors, ValidationError{
					Field:   "correo",
					Message: "El formato del correo electrónico no es válido",
					Value:   correo,
				})
			} else if len(correo) > 255 {
				errors = append(errors, ValidationError{
					Field:   "correo",
					Message: "El correo no puede exceder 255 caracteres",
					Value:   correo,
				})
			}
		}
	}

	// Validar teléfono (opcional pero si se proporciona debe ser válido)
	if persona.Telefono != nil {
		telefono := strings.TrimSpace(*persona.Telefono)
		if telefono != "" {
			// Verificar que tenga al menos 7 dígitos
			digitCount := 0
			for _, char := range telefono {
				if char >= '0' && char <= '9' {
					digitCount++
				}
			}
			if digitCount < 7 {
				errors = append(errors, ValidationError{
					Field:   "telefono",
					Message: "El teléfono debe contener al menos 7 dígitos",
					Value:   telefono,
				})
			}
		}
	}

	// Validar fecha de nacimiento (opcional pero si se proporciona debe ser válida)
	if !persona.FechaNacimiento.IsZero() {
		now := time.Now()
		// Verificar que la fecha no sea futura
		if persona.FechaNacimiento.After(now) {
			errors = append(errors, ValidationError{
				Field:   "fecha_nacimiento",
				Message: "La fecha de nacimiento no puede ser futura",
				Value:   persona.FechaNacimiento.Format("2006-01-02"),
			})
		}
	}

	return errors
}

// validatePersonaRequiredFields valida que los campos requeridos estén presentes
func (h *PersonaHandler) validatePersonaRequiredFields(persona *models.Persona) []ValidationError {
	var errors []ValidationError

	if strings.TrimSpace(persona.Nombre) == "" {
		errors = append(errors, ValidationError{
			Field:   "nombre",
			Message: "El campo nombre es requerido",
		})
	}

	if strings.TrimSpace(persona.Cedula) == "" {
		errors = append(errors, ValidationError{
			Field:   "cedula",
			Message: "El campo cédula es requerido",
		})
	}

	// Validar que al menos uno de los campos de contacto (correo o teléfono) esté presente
	correo := ""
	if persona.Correo != nil {
		correo = strings.TrimSpace(*persona.Correo)
	}

	telefono := ""
	if persona.Telefono != nil {
		telefono = strings.TrimSpace(*persona.Telefono)
	}

	if correo == "" && telefono == "" {
		errors = append(errors, ValidationError{
			Field:   "contacto",
			Message: "Debe proporcionar al menos un teléfono o un correo electrónico",
		})
	}

	return errors
}
