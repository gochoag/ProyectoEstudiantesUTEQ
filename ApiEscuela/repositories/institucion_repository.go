package repositories

import (
	"ApiEscuela/models"

	"gorm.io/gorm"
)

type InstitucionRepository struct {
	db *gorm.DB
}

func NewInstitucionRepository(db *gorm.DB) *InstitucionRepository {
	return &InstitucionRepository{db: db}
}

// GetDB retorna la instancia de la base de datos para uso interno
func (r *InstitucionRepository) GetDB() *gorm.DB {
	return r.db
}

// CreateInstitucion crea una nueva institución
func (r *InstitucionRepository) CreateInstitucion(institucion *models.Institucion) error {
	return r.db.Create(institucion).Error
}

// GetInstitucionByID obtiene una institución por ID
func (r *InstitucionRepository) GetInstitucionByID(id uint) (*models.Institucion, error) {
	var institucion models.Institucion
	err := r.db.Preload("Estudiantes").Preload("ProgramasVisita").
		First(&institucion, id).Error
	if err != nil {
		return nil, err
	}
	return &institucion, nil
}

// GetAllInstituciones obtiene todas las instituciones
func (r *InstitucionRepository) GetAllInstituciones() ([]models.Institucion, error) {
	var instituciones []models.Institucion
	err := r.db.Preload("Estudiantes").Preload("ProgramasVisita").
		Find(&instituciones).Error
	return instituciones, err
}

// UpdateInstitucion actualiza una institución
func (r *InstitucionRepository) UpdateInstitucion(institucion *models.Institucion) error {
	return r.db.Save(institucion).Error
}

// DeleteInstitucion elimina una institución
func (r *InstitucionRepository) DeleteInstitucion(id uint) error {
	return r.db.Delete(&models.Institucion{}, id).Error
}

// GetInstitucionesByNombre busca instituciones por nombre
func (r *InstitucionRepository) GetInstitucionesByNombre(nombre string) ([]models.Institucion, error) {
	var instituciones []models.Institucion
	err := r.db.Where("nombre ILIKE ?", "%"+nombre+"%").
		Preload("Estudiantes").Preload("ProgramasVisita").
		Find(&instituciones).Error
	return instituciones, err
}

// GetInstitucionesByAutoridad busca instituciones por autoridad
func (r *InstitucionRepository) GetInstitucionesByAutoridad(autoridad string) ([]models.Institucion, error) {
	var instituciones []models.Institucion
	err := r.db.Where("autoridad ILIKE ?", "%"+autoridad+"%").
		Preload("Estudiantes").Preload("ProgramasVisita").
		Find(&instituciones).Error
	return instituciones, err
}
