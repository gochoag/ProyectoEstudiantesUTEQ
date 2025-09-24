package repositories

import (
	"ApiEscuela/models"
	"errors"
	"strings"

	"gorm.io/gorm"
)

type PersonaRepository struct {
	db *gorm.DB
}

var (
	ErrCedulaDuplicada = errors.New("cedula repetida")
	ErrCorreoDuplicado = errors.New("correo repetido")
	ErrPersonaYaExiste = errors.New("persona ya existe")
)

func classifyUniquePersonaError(err error) error {
	// Intento de detección por mensaje cuando no está disponible pgconn
	msg := err.Error()
	if strings.Contains(msg, "duplicate key value") || strings.Contains(msg, "UNIQUE constraint") {
		if strings.Contains(msg, "cedula") {
			return ErrCedulaDuplicada
		}
		if strings.Contains(msg, "correo") {
			return ErrCorreoDuplicado
		}
		return ErrPersonaYaExiste
	}
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return ErrPersonaYaExiste
	}
	return err
}

func NewPersonaRepository(db *gorm.DB) *PersonaRepository {
	return &PersonaRepository{db: db}
}

// GetDB retorna la instancia de la base de datos para uso interno
func (r *PersonaRepository) GetDB() *gorm.DB {
	return r.db
}

// CreatePersona crea una nueva persona
func (r *PersonaRepository) CreatePersona(persona *models.Persona) error {
	if err := r.db.Create(persona).Error; err != nil {
		return classifyUniquePersonaError(err)
	}
	return nil
}

// GetPersonaByID obtiene una persona por ID
func (r *PersonaRepository) GetPersonaByID(id uint) (*models.Persona, error) {
	var persona models.Persona
	err := r.db.Preload("Estudiantes").Preload("EstudiantesUniv").
		Preload("AutoridadesUTEQ").Preload("Usuarios").
		First(&persona, id).Error
	if err != nil {
		return nil, err
	}
	return &persona, nil
}

// GetPersonaByCedula obtiene una persona por cédula
func (r *PersonaRepository) GetPersonaByCedula(cedula string) (*models.Persona, error) {
	var persona models.Persona
	err := r.db.Where("cedula = ?", cedula).
		Preload("Estudiantes").Preload("EstudiantesUniv").
		Preload("AutoridadesUTEQ").Preload("Usuarios").
		First(&persona).Error
	if err != nil {
		return nil, err
	}
	return &persona, nil
}

// GetAllPersonas obtiene todas las personas
func (r *PersonaRepository) GetAllPersonas() ([]models.Persona, error) {
	var personas []models.Persona
	err := r.db.Preload("Estudiantes").Preload("EstudiantesUniv").
		Preload("AutoridadesUTEQ").Preload("Usuarios").
		Find(&personas).Error
	return personas, err
}

// UpdatePersona actualiza una persona
func (r *PersonaRepository) UpdatePersona(persona *models.Persona) error {
	if err := r.db.Save(persona).Error; err != nil {
		return classifyUniquePersonaError(err)
	}
	return nil
}

// DeletePersona elimina una persona
func (r *PersonaRepository) DeletePersona(id uint) error {
	return r.db.Delete(&models.Persona{}, id).Error
}

// GetPersonasByCorreo busca personas por correo (búsqueda parcial)
func (r *PersonaRepository) GetPersonasByCorreo(correo string) ([]models.Persona, error) {
	var personas []models.Persona
	err := r.db.Where("correo ILIKE ?", "%"+correo+"%").
		Preload("Estudiantes").Preload("EstudiantesUniv").
		Preload("AutoridadesUTEQ").Preload("Usuarios").
		Find(&personas).Error
	return personas, err
}
