package repositories

import (
	"ApiEscuela/models"
	"gorm.io/gorm"
)

type TematicaRepository struct {
	db *gorm.DB
}

func NewTematicaRepository(db *gorm.DB) *TematicaRepository {
	return &TematicaRepository{db: db}
}

// CreateTematica crea una nueva temática
func (r *TematicaRepository) CreateTematica(tematica *models.Tematica) error {
	return r.db.Create(tematica).Error
}

// GetTematicaByID obtiene una temática por ID
func (r *TematicaRepository) GetTematicaByID(id uint) (*models.Tematica, error) {
	var tematica models.Tematica
	err := r.db.Preload("Actividades").First(&tematica, id).Error
	if err != nil {
		return nil, err
	}
	return &tematica, nil
}

// GetAllTematicas obtiene todas las temáticas
func (r *TematicaRepository) GetAllTematicas() ([]models.Tematica, error) {
	var tematicas []models.Tematica
	err := r.db.Preload("Actividades").Find(&tematicas).Error
	return tematicas, err
}

// UpdateTematica actualiza una temática
func (r *TematicaRepository) UpdateTematica(tematica *models.Tematica) error {
	return r.db.Save(tematica).Error
}

// DeleteTematica elimina una temática
func (r *TematicaRepository) DeleteTematica(id uint) error {
	return r.db.Delete(&models.Tematica{}, id).Error
}

// GetTematicasByNombre busca temáticas por nombre
func (r *TematicaRepository) GetTematicasByNombre(nombre string) ([]models.Tematica, error) {
	var tematicas []models.Tematica
	err := r.db.Where("nombre ILIKE ?", "%"+nombre+"%").
		Preload("Actividades").Find(&tematicas).Error
	return tematicas, err
}

// GetTematicasByDescripcion busca temáticas por descripción
func (r *TematicaRepository) GetTematicasByDescripcion(descripcion string) ([]models.Tematica, error) {
	var tematicas []models.Tematica
	err := r.db.Where("descripcion ILIKE ?", "%"+descripcion+"%").
		Preload("Actividades").Find(&tematicas).Error
	return tematicas, err
}