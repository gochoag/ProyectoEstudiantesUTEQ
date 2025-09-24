package repositories

import (
	"ApiEscuela/models"
	"gorm.io/gorm"
)

type ActividadRepository struct {
	db *gorm.DB
}

func NewActividadRepository(db *gorm.DB) *ActividadRepository {
	return &ActividadRepository{db: db}
}

// CreateActividad crea una nueva actividad
func (r *ActividadRepository) CreateActividad(actividad *models.Actividad) error {
	return r.db.Create(actividad).Error
}

// GetActividadByID obtiene una actividad por ID
func (r *ActividadRepository) GetActividadByID(id uint) (*models.Actividad, error) {
	var actividad models.Actividad
	err := r.db.Preload("Tematica").Preload("VisitaDetalles").
		First(&actividad, id).Error
	if err != nil {
		return nil, err
	}
	return &actividad, nil
}

// GetAllActividades obtiene todas las actividades
func (r *ActividadRepository) GetAllActividades() ([]models.Actividad, error) {
	var actividades []models.Actividad
	err := r.db.Preload("Tematica").Preload("VisitaDetalles").
		Find(&actividades).Error
	return actividades, err
}

// UpdateActividad actualiza una actividad
func (r *ActividadRepository) UpdateActividad(actividad *models.Actividad) error {
	return r.db.Save(actividad).Error
}

// DeleteActividad elimina una actividad
func (r *ActividadRepository) DeleteActividad(id uint) error {
	return r.db.Delete(&models.Actividad{}, id).Error
}

// GetActividadesByTematica obtiene actividades por temática
func (r *ActividadRepository) GetActividadesByTematica(tematicaID uint) ([]models.Actividad, error) {
	var actividades []models.Actividad
	err := r.db.Where("tematica_id = ?", tematicaID).
		Preload("Tematica").Preload("VisitaDetalles").
		Find(&actividades).Error
	return actividades, err
}

// GetActividadesByNombre busca actividades por nombre
func (r *ActividadRepository) GetActividadesByNombre(nombre string) ([]models.Actividad, error) {
	var actividades []models.Actividad
	err := r.db.Where("actividad ILIKE ?", "%"+nombre+"%").
		Preload("Tematica").Preload("VisitaDetalles").
		Find(&actividades).Error
	return actividades, err
}

// GetActividadesByDuracion obtiene actividades por duración
func (r *ActividadRepository) GetActividadesByDuracion(duracionMin, duracionMax int) ([]models.Actividad, error) {
	var actividades []models.Actividad
	err := r.db.Where("duracion BETWEEN ? AND ?", duracionMin, duracionMax).
		Preload("Tematica").Preload("VisitaDetalles").
		Find(&actividades).Error
	return actividades, err
}