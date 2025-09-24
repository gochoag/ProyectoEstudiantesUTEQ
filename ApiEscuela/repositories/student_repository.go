package repositories

import (
	"ApiEscuela/models"
	"errors"
	"strings"
	"gorm.io/gorm"
)

type EstudianteRepository struct {
	db *gorm.DB
}

var (
	ErrEstudianteDuplicado = errors.New("estudiante ya existe")
)

func classifyUniqueEstudianteError(err error) error {
	msg := err.Error()
	if strings.Contains(msg, "duplicate key value") || strings.Contains(msg, "UNIQUE constraint") {
		if strings.Contains(msg, "persona_id") || strings.Contains(msg, "persona") {
			return ErrEstudianteDuplicado
		}
		return ErrEstudianteDuplicado
	}
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return ErrEstudianteDuplicado
	}
	return err
}

func NewEstudianteRepository(db *gorm.DB) *EstudianteRepository {
	return &EstudianteRepository{db: db}
}

// CreateEstudiante crea un nuevo estudiante
func (r *EstudianteRepository) CreateEstudiante(estudiante *models.Estudiante) error {
	// Prevalidar que no exista estudiante para la misma persona
	var count int64
	if err := r.db.Model(&models.Estudiante{}).Where("persona_id = ?", estudiante.PersonaID).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return ErrEstudianteDuplicado
	}
	if err := r.db.Create(estudiante).Error; err != nil {
		return classifyUniqueEstudianteError(err)
	}
	return nil
}

// GetEstudianteByID obtiene un estudiante por ID
func (r *EstudianteRepository) GetEstudianteByID(id uint) (*models.Estudiante, error) {
	var estudiante models.Estudiante
	err := r.db.Preload("Persona").Preload("Institucion").
		Preload("Ciudad").Preload("Ciudad.Provincia").
		Preload("Dudas").First(&estudiante, id).Error
	if err != nil {
		return nil, err
	}
	return &estudiante, nil
}

// GetAllEstudiantes obtiene todos los estudiantes
func (r *EstudianteRepository) GetAllEstudiantes() ([]models.Estudiante, error) {
	var estudiantes []models.Estudiante
	err := r.db.Preload("Persona").Preload("Institucion").
		Preload("Ciudad").Preload("Ciudad.Provincia").
		Find(&estudiantes).Error
	return estudiantes, err
}

// UpdateEstudiante actualiza un estudiante
func (r *EstudianteRepository) UpdateEstudiante(estudiante *models.Estudiante) error {
	// Verificar duplicado por persona en otro registro
	var count int64
	if err := r.db.Model(&models.Estudiante{}).Where("persona_id = ? AND id <> ?", estudiante.PersonaID, estudiante.ID).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return ErrEstudianteDuplicado
	}
	if err := r.db.Save(estudiante).Error; err != nil {
		return classifyUniqueEstudianteError(err)
	}
	return nil
}

// DeleteEstudiante elimina un estudiante y en cascada su usuario y persona
func (r *EstudianteRepository) DeleteEstudiante(id uint) error {
	// Iniciar transacción
	tx := r.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Obtener el estudiante con su persona
	var estudiante models.Estudiante
	if err := tx.Preload("Persona").First(&estudiante, id).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Eliminar el estudiante (soft delete)
	if err := tx.Delete(&estudiante).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Eliminar usuarios asociados a la persona (soft delete)
	if err := tx.Where("persona_id = ?", estudiante.PersonaID).Delete(&models.Usuario{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Eliminar la persona (soft delete)
	if err := tx.Delete(&models.Persona{}, estudiante.PersonaID).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

// RestoreEstudiante restaura un estudiante eliminado y en cascada su usuario y persona
func (r *EstudianteRepository) RestoreEstudiante(id uint) error {
	// Iniciar transacción
	tx := r.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Obtener el estudiante eliminado con su persona
	var estudiante models.Estudiante
	if err := tx.Unscoped().Preload("Persona").First(&estudiante, id).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Restaurar la persona
	if err := tx.Unscoped().Model(&models.Persona{}).Where("id = ?", estudiante.PersonaID).Update("deleted_at", nil).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Restaurar usuarios asociados a la persona
	if err := tx.Unscoped().Model(&models.Usuario{}).Where("persona_id = ?", estudiante.PersonaID).Update("deleted_at", nil).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Restaurar el estudiante
	if err := tx.Unscoped().Model(&estudiante).Update("deleted_at", nil).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

// GetAllEstudiantesIncludingDeleted obtiene todos los estudiantes incluyendo los eliminados
func (r *EstudianteRepository) GetAllEstudiantesIncludingDeleted() ([]models.Estudiante, error) {
	var estudiantes []models.Estudiante
	err := r.db.Unscoped().Preload("Persona").Preload("Institucion").
		Preload("Ciudad").Preload("Ciudad.Provincia").
		Find(&estudiantes).Error
	return estudiantes, err
}

// GetDeletedEstudiantes obtiene solo los estudiantes eliminados
func (r *EstudianteRepository) GetDeletedEstudiantes() ([]models.Estudiante, error) {
	var estudiantes []models.Estudiante
	err := r.db.Unscoped().Where("deleted_at IS NOT NULL").
		Preload("Persona").Preload("Institucion").
		Preload("Ciudad").Preload("Ciudad.Provincia").
		Find(&estudiantes).Error
	return estudiantes, err
}

// GetEstudiantesByCity obtiene estudiantes por ciudad
func (r *EstudianteRepository) GetEstudiantesByCity(ciudadID uint) ([]models.Estudiante, error) {
	var estudiantes []models.Estudiante
	err := r.db.Where("ciudad_id = ?", ciudadID).
		Preload("Persona").Preload("Institucion").
		Preload("Ciudad").Preload("Ciudad.Provincia").
		Find(&estudiantes).Error
	return estudiantes, err
}

// GetEstudiantesByInstitucion obtiene estudiantes por institución
func (r *EstudianteRepository) GetEstudiantesByInstitucion(institucionID uint) ([]models.Estudiante, error) {
	var estudiantes []models.Estudiante
	err := r.db.Where("institucion_id = ?", institucionID).
		Preload("Persona").Preload("Institucion").
		Preload("Ciudad").Preload("Ciudad.Provincia").
		Find(&estudiantes).Error
	return estudiantes, err
}

// GetEstudiantesByEspecialidad obtiene estudiantes por especialidad
func (r *EstudianteRepository) GetEstudiantesByEspecialidad(especialidad string) ([]models.Estudiante, error) {
	var estudiantes []models.Estudiante
	err := r.db.Where("especialidad ILIKE ?", "%"+especialidad+"%").
		Preload("Persona").Preload("Institucion").
		Preload("Ciudad").Preload("Ciudad.Provincia").
		Find(&estudiantes).Error
	return estudiantes, err
}