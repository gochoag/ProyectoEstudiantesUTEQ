package repositories

import (
	"ApiEscuela/models"
	"time"
	"gorm.io/gorm"
)

type ProgramaVisitaRepository struct {
	db *gorm.DB
}

func NewProgramaVisitaRepository(db *gorm.DB) *ProgramaVisitaRepository {
	return &ProgramaVisitaRepository{db: db}
}

// CreateProgramaVisita crea un nuevo programa de visita
func (r *ProgramaVisitaRepository) CreateProgramaVisita(programa *models.ProgramaVisita) error {
	return r.db.Create(programa).Error
}

// GetProgramaVisitaByID obtiene un programa de visita por ID
func (r *ProgramaVisitaRepository) GetProgramaVisitaByID(id uint) (*models.ProgramaVisita, error) {
	var programa models.ProgramaVisita
	err := r.db.Preload("Institucion").
		First(&programa, id).Error
	if err != nil {
		return nil, err
	}
	return &programa, nil
}

// GetAllProgramasVisita obtiene todos los programas de visita
func (r *ProgramaVisitaRepository) GetAllProgramasVisita() ([]models.ProgramaVisita, error) {
	var programas []models.ProgramaVisita
	err := r.db.Preload("Institucion").
		Find(&programas).Error
	return programas, err
}

// UpdateProgramaVisita actualiza un programa de visita
func (r *ProgramaVisitaRepository) UpdateProgramaVisita(programa *models.ProgramaVisita) error {
	return r.db.Save(programa).Error
}

// DeleteProgramaVisita elimina un programa de visita
func (r *ProgramaVisitaRepository) DeleteProgramaVisita(id uint) error {
	return r.db.Delete(&models.ProgramaVisita{}, id).Error
}

// GetProgramasVisitaByFecha obtiene programas por fecha
func (r *ProgramaVisitaRepository) GetProgramasVisitaByFecha(fecha time.Time) ([]models.ProgramaVisita, error) {
	var programas []models.ProgramaVisita
	startOfDay := time.Date(fecha.Year(), fecha.Month(), fecha.Day(), 0, 0, 0, 0, fecha.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)
	
	err := r.db.Where("fecha >= ? AND fecha < ?", startOfDay, endOfDay).
		Preload("Institucion").
		Find(&programas).Error
	return programas, err
}

// GetProgramasVisitaByInstitucion obtiene programas por institución
func (r *ProgramaVisitaRepository) GetProgramasVisitaByInstitucion(institucionID uint) ([]models.ProgramaVisita, error) {
	var programas []models.ProgramaVisita
	err := r.db.Where("institucion_id = ?", institucionID).
		Preload("Institucion").
		Find(&programas).Error
	return programas, err
}

// GetProgramasVisitaByRangoFecha obtiene programas en un rango de fechas
func (r *ProgramaVisitaRepository) GetProgramasVisitaByRangoFecha(fechaInicio, fechaFin time.Time) ([]models.ProgramaVisita, error) {
	var programas []models.ProgramaVisita
	err := r.db.Where("fecha BETWEEN ? AND ?", fechaInicio, fechaFin).
		Preload("Institucion").
		Find(&programas).Error
	return programas, err
}