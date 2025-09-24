package repositories

import (
	"ApiEscuela/models"
	"gorm.io/gorm"
)

type ProvinciaRepository struct {
	db *gorm.DB
}

func NewProvinciaRepository(db *gorm.DB) *ProvinciaRepository {
	return &ProvinciaRepository{db: db}
}

// CreateProvincia crea una nueva provincia
func (r *ProvinciaRepository) CreateProvincia(provincia *models.Provincia) error {
	return r.db.Create(provincia).Error
}

// GetProvinciaByID obtiene una provincia por ID
func (r *ProvinciaRepository) GetProvinciaByID(id uint) (*models.Provincia, error) {
	var provincia models.Provincia
	err := r.db.Preload("Ciudades").First(&provincia, id).Error
	if err != nil {
		return nil, err
	}
	return &provincia, nil
}

// GetAllProvincias obtiene todas las provincias
func (r *ProvinciaRepository) GetAllProvincias() ([]models.Provincia, error) {
	var provincias []models.Provincia
	err := r.db.Preload("Ciudades").Find(&provincias).Error
	return provincias, err
}

// UpdateProvincia actualiza una provincia
func (r *ProvinciaRepository) UpdateProvincia(provincia *models.Provincia) error {
	return r.db.Save(provincia).Error
}

// DeleteProvincia elimina una provincia
func (r *ProvinciaRepository) DeleteProvincia(id uint) error {
	return r.db.Delete(&models.Provincia{}, id).Error
}

// GetProvinciaByNombre busca provincia por nombre
func (r *ProvinciaRepository) GetProvinciaByNombre(nombre string) (*models.Provincia, error) {
	var provincia models.Provincia
	err := r.db.Where("provincia ILIKE ?", "%"+nombre+"%").
		Preload("Ciudades").First(&provincia).Error
	if err != nil {
		return nil, err
	}
	return &provincia, nil
}