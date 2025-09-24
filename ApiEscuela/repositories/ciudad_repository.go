package repositories

import (
	"ApiEscuela/models"

	"gorm.io/gorm"
)

type CiudadRepository struct {
	db *gorm.DB
}

func NewCiudadRepository(db *gorm.DB) *CiudadRepository {
	return &CiudadRepository{db: db}
}

// GetDB retorna la instancia de la base de datos para uso interno
func (r *CiudadRepository) GetDB() *gorm.DB {
	return r.db
}

// CreateCiudad crea una nueva ciudad
func (r *CiudadRepository) CreateCiudad(ciudad *models.Ciudad) error {
	return r.db.Create(ciudad).Error
}

// GetCiudadByID obtiene una ciudad por ID
func (r *CiudadRepository) GetCiudadByID(id uint) (*models.Ciudad, error) {
	var ciudad models.Ciudad
	err := r.db.Preload("Provincia").Preload("Estudiantes").
		First(&ciudad, id).Error
	if err != nil {
		return nil, err
	}
	return &ciudad, nil
}

// GetAllCiudades obtiene todas las ciudades
func (r *CiudadRepository) GetAllCiudades() ([]models.Ciudad, error) {
	var ciudades []models.Ciudad
	err := r.db.Preload("Provincia").Find(&ciudades).Error
	return ciudades, err
}

// UpdateCiudad actualiza una ciudad
func (r *CiudadRepository) UpdateCiudad(ciudad *models.Ciudad) error {
	return r.db.Save(ciudad).Error
}

// DeleteCiudad elimina una ciudad
func (r *CiudadRepository) DeleteCiudad(id uint) error {
	return r.db.Delete(&models.Ciudad{}, id).Error
}

// GetCiudadesByProvincia obtiene ciudades por provincia
func (r *CiudadRepository) GetCiudadesByProvincia(provinciaID uint) ([]models.Ciudad, error) {
	var ciudades []models.Ciudad
	err := r.db.Where("provincia_id = ?", provinciaID).
		Preload("Provincia").Find(&ciudades).Error
	return ciudades, err
}

// GetCiudadByNombre busca ciudad por nombre
func (r *CiudadRepository) GetCiudadByNombre(nombre string) ([]models.Ciudad, error) {
	var ciudades []models.Ciudad
	err := r.db.Where("ciudad ILIKE ?", "%"+nombre+"%").
		Preload("Provincia").Find(&ciudades).Error
	return ciudades, err
}
