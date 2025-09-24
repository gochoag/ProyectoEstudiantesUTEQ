package repositories

import (
	"ApiEscuela/models"
	"errors"
	"strings"

	"gorm.io/gorm"
)

type AutoridadUTEQRepository struct {
	db *gorm.DB
}

var (
	ErrAutoridadDuplicada = errors.New("autoridad ya existe")
)

func classifyUniqueAutoridadError(err error) error {
	// Detección por mensaje si no está disponible pgconn
	msg := err.Error()
	if strings.Contains(msg, "duplicate key value") || strings.Contains(msg, "UNIQUE constraint") {
		if strings.Contains(msg, "persona_id") {
			return ErrAutoridadDuplicada
		}
		return ErrAutoridadDuplicada
	}
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return ErrAutoridadDuplicada
	}
	return err
}

func NewAutoridadUTEQRepository(db *gorm.DB) *AutoridadUTEQRepository {
	return &AutoridadUTEQRepository{db: db}
}

// CreateAutoridadUTEQ crea una nueva autoridad UTEQ
func (r *AutoridadUTEQRepository) CreateAutoridadUTEQ(autoridad *models.AutoridadUTEQ) error {
	// Verificar que la persona existe
	var personaCount int64
	if err := r.db.Model(&models.Persona{}).Where("id = ?", autoridad.PersonaID).Count(&personaCount).Error; err != nil {
		return err
	}
	if personaCount == 0 {
		return errors.New("persona no encontrada")
	}

	// Prevalidar que no exista otra autoridad con la misma persona
	var count int64
	if err := r.db.Model(&models.AutoridadUTEQ{}).Where("persona_id = ?", autoridad.PersonaID).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return ErrAutoridadDuplicada
	}
	if err := r.db.Create(autoridad).Error; err != nil {
		return classifyUniqueAutoridadError(err)
	}
	return nil
}

// GetAutoridadUTEQByID obtiene una autoridad UTEQ por ID
func (r *AutoridadUTEQRepository) GetAutoridadUTEQByID(id uint) (*models.AutoridadUTEQ, error) {
	var autoridad models.AutoridadUTEQ
	err := r.db.Preload("Persona").Preload("DetalleAutoridadDetallesVisitas").
		Preload("Dudas").First(&autoridad, id).Error
	if err != nil {
		return nil, err
	}
	return &autoridad, nil
}

// GetAllAutoridadesUTEQ obtiene todas las autoridades UTEQ
func (r *AutoridadUTEQRepository) GetAllAutoridadesUTEQ() ([]models.AutoridadUTEQ, error) {
	var autoridades []models.AutoridadUTEQ
	err := r.db.Preload("Persona").Preload("DetalleAutoridadDetallesVisitas").
		Preload("Dudas").Find(&autoridades).Error
	return autoridades, err
}

// UpdateAutoridadUTEQ actualiza una autoridad UTEQ
func (r *AutoridadUTEQRepository) UpdateAutoridadUTEQ(autoridad *models.AutoridadUTEQ) error {
	// Verificar duplicado por persona en otro registro
	var count int64
	if err := r.db.Model(&models.AutoridadUTEQ{}).
		Where("persona_id = ? AND id <> ?", autoridad.PersonaID, autoridad.ID).
		Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return ErrAutoridadDuplicada
	}
	if err := r.db.Save(autoridad).Error; err != nil {
		return classifyUniqueAutoridadError(err)
	}
	return nil
}

// DeleteAutoridadUTEQ elimina una autoridad UTEQ y en cascada su usuario y persona
func (r *AutoridadUTEQRepository) DeleteAutoridadUTEQ(id uint) error {
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

	// Obtener la autoridad con su persona
	var autoridad models.AutoridadUTEQ
	if err := tx.Preload("Persona").First(&autoridad, id).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Eliminar la autoridad (soft delete)
	if err := tx.Delete(&autoridad).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Eliminar usuarios asociados a la persona (soft delete)
	if err := tx.Where("persona_id = ?", autoridad.PersonaID).Delete(&models.Usuario{}).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Eliminar la persona (soft delete)
	if err := tx.Delete(&models.Persona{}, autoridad.PersonaID).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

// RestoreAutoridadUTEQ restaura una autoridad UTEQ eliminada y en cascada su usuario y persona
func (r *AutoridadUTEQRepository) RestoreAutoridadUTEQ(id uint) error {
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

	// Obtener la autoridad eliminada con su persona
	var autoridad models.AutoridadUTEQ
	if err := tx.Unscoped().Preload("Persona").First(&autoridad, id).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Restaurar la persona
	if err := tx.Unscoped().Model(&models.Persona{}).Where("id = ?", autoridad.PersonaID).Update("deleted_at", nil).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Restaurar usuarios asociados a la persona
	if err := tx.Unscoped().Model(&models.Usuario{}).Where("persona_id = ?", autoridad.PersonaID).Update("deleted_at", nil).Error; err != nil {
		tx.Rollback()
		return err
	}

	// Restaurar la autoridad
	if err := tx.Unscoped().Model(&autoridad).Update("deleted_at", nil).Error; err != nil {
		tx.Rollback()
		return err
	}

	return tx.Commit().Error
}

// GetAllAutoridadesUTEQIncludingDeleted obtiene todas las autoridades UTEQ incluyendo las eliminadas
func (r *AutoridadUTEQRepository) GetAllAutoridadesUTEQIncludingDeleted() ([]models.AutoridadUTEQ, error) {
	var autoridades []models.AutoridadUTEQ
	err := r.db.Unscoped().Preload("Persona").Preload("DetalleAutoridadDetallesVisitas").
		Preload("Dudas").Find(&autoridades).Error
	return autoridades, err
}

// GetDeletedAutoridadesUTEQ obtiene solo las autoridades UTEQ eliminadas
func (r *AutoridadUTEQRepository) GetDeletedAutoridadesUTEQ() ([]models.AutoridadUTEQ, error) {
	var autoridades []models.AutoridadUTEQ
	err := r.db.Unscoped().Where("deleted_at IS NOT NULL").
		Preload("Persona").Preload("DetalleAutoridadDetallesVisitas").
		Preload("Dudas").Find(&autoridades).Error
	return autoridades, err
}

// GetAutoridadesUTEQByCargo obtiene autoridades por cargo
func (r *AutoridadUTEQRepository) GetAutoridadesUTEQByCargo(cargo string) ([]models.AutoridadUTEQ, error) {
	var autoridades []models.AutoridadUTEQ
	err := r.db.Where("cargo ILIKE ?", "%"+cargo+"%").
		Preload("Persona").Preload("DetalleAutoridadDetallesVisitas").
		Preload("Dudas").Find(&autoridades).Error
	return autoridades, err
}

// GetAutoridadUTEQByPersona obtiene autoridad UTEQ por persona
func (r *AutoridadUTEQRepository) GetAutoridadUTEQByPersona(personaID uint) (*models.AutoridadUTEQ, error) {
	var autoridad models.AutoridadUTEQ
	err := r.db.Where("persona_id = ?", personaID).
		Preload("Persona").Preload("DetalleAutoridadDetallesVisitas").
		Preload("Dudas").First(&autoridad).Error
	if err != nil {
		return nil, err
	}
	return &autoridad, nil
}
