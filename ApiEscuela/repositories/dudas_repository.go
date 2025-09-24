package repositories

import (
	"ApiEscuela/models"
	"time"
	"gorm.io/gorm"
)

type DudasRepository struct {
	db *gorm.DB
}

func NewDudasRepository(db *gorm.DB) *DudasRepository {
	return &DudasRepository{db: db}
}

// CreateDudas crea una nueva duda
func (r *DudasRepository) CreateDudas(duda *models.Dudas) error {
	// Establecer la fecha de pregunta automáticamente si no está establecida
	if duda.FechaPregunta.IsZero() {
		duda.FechaPregunta = time.Now()
	}
	return r.db.Create(duda).Error
}

// GetDudasByID obtiene una duda por ID
func (r *DudasRepository) GetDudasByID(id uint) (*models.Dudas, error) {
	var duda models.Dudas
	err := r.db.Preload("Estudiante").Preload("Estudiante.Persona").
		Preload("Estudiante.Institucion").Preload("Estudiante.Ciudad").
		Preload("AutoridadUTEQ").Preload("AutoridadUTEQ.Persona").
		First(&duda, id).Error
	if err != nil {
		return nil, err
	}
	return &duda, nil
}

// GetAllDudas obtiene todas las dudas
func (r *DudasRepository) GetAllDudas() ([]models.Dudas, error) {
	var dudas []models.Dudas
	err := r.db.Preload("Estudiante").Preload("Estudiante.Persona").
		Preload("Estudiante.Institucion").Preload("Estudiante.Ciudad").
		Preload("AutoridadUTEQ").Preload("AutoridadUTEQ.Persona").
		Find(&dudas).Error
	return dudas, err
}

// UpdateDudas actualiza una duda
func (r *DudasRepository) UpdateDudas(duda *models.Dudas) error {
	return r.db.Save(duda).Error
}

// DeleteDudas elimina una duda
func (r *DudasRepository) DeleteDudas(id uint) error {
	return r.db.Delete(&models.Dudas{}, id).Error
}

// GetDudasByEstudiante obtiene dudas por estudiante
func (r *DudasRepository) GetDudasByEstudiante(estudianteID uint) ([]models.Dudas, error) {
	var dudas []models.Dudas
	err := r.db.Where("estudiante_id = ?", estudianteID).
		Preload("Estudiante").Preload("Estudiante.Persona").
		Preload("Estudiante.Institucion").Preload("Estudiante.Ciudad").
		Preload("AutoridadUTEQ").Preload("AutoridadUTEQ.Persona").
		Find(&dudas).Error
	return dudas, err
}

// GetDudasByAutoridad obtiene dudas asignadas a una autoridad
func (r *DudasRepository) GetDudasByAutoridad(autoridadID uint) ([]models.Dudas, error) {
	var dudas []models.Dudas
	err := r.db.Where("autoridad_uteq_id = ?", autoridadID).
		Preload("Estudiante").Preload("Estudiante.Persona").
		Preload("Estudiante.Institucion").Preload("Estudiante.Ciudad").
		Preload("AutoridadUTEQ").Preload("AutoridadUTEQ.Persona").
		Find(&dudas).Error
	return dudas, err
}

// GetDudasSinResponder obtiene dudas sin respuesta
func (r *DudasRepository) GetDudasSinResponder() ([]models.Dudas, error) {
	var dudas []models.Dudas
	err := r.db.Where("respuesta IS NULL OR respuesta = ''").
		Preload("Estudiante").Preload("Estudiante.Persona").
		Preload("Estudiante.Institucion").Preload("Estudiante.Ciudad").
		Preload("AutoridadUTEQ").Preload("AutoridadUTEQ.Persona").
		Find(&dudas).Error
	return dudas, err
}

// GetDudasRespondidas obtiene dudas con respuesta
func (r *DudasRepository) GetDudasRespondidas() ([]models.Dudas, error) {
	var dudas []models.Dudas
	err := r.db.Where("respuesta IS NOT NULL AND respuesta != ''").
		Preload("Estudiante").Preload("Estudiante.Persona").
		Preload("Estudiante.Institucion").Preload("Estudiante.Ciudad").
		Preload("AutoridadUTEQ").Preload("AutoridadUTEQ.Persona").
		Find(&dudas).Error
	return dudas, err
}

// GetDudasSinAsignar obtiene dudas sin autoridad asignada
func (r *DudasRepository) GetDudasSinAsignar() ([]models.Dudas, error) {
	var dudas []models.Dudas
	err := r.db.Where("autoridad_uteq_id IS NULL").
		Preload("Estudiante").Preload("Estudiante.Persona").
		Preload("Estudiante.Institucion").Preload("Estudiante.Ciudad").
		Find(&dudas).Error
	return dudas, err
}

// BuscarDudasPorPregunta busca dudas por contenido de la pregunta
func (r *DudasRepository) BuscarDudasPorPregunta(termino string) ([]models.Dudas, error) {
	var dudas []models.Dudas
	err := r.db.Where("pregunta ILIKE ?", "%"+termino+"%").
		Preload("Estudiante").Preload("Estudiante.Persona").
		Preload("Estudiante.Institucion").Preload("Estudiante.Ciudad").
		Preload("AutoridadUTEQ").Preload("AutoridadUTEQ.Persona").
		Find(&dudas).Error
	return dudas, err
}


// ResponderDuda actualiza la respuesta de una duda
func (r *DudasRepository) ResponderDuda(dudaID uint, respuesta string,autoridadID uint) error {
	now := time.Now()
	return r.db.Model(&models.Dudas{}).Where("id = ?", dudaID).
		Updates(map[string]interface{}{
			"respuesta":        &respuesta,
			"fecha_respuesta":  &now,
			"autoridad_uteq_id":  &autoridadID,
		}).Error
}

// GetDudasByPrivacidad obtiene dudas por tipo de privacidad
func (r *DudasRepository) GetDudasByPrivacidad(privacidad string) ([]models.Dudas, error) {
	var dudas []models.Dudas
	err := r.db.Where("privacidad = ?", privacidad).
		Preload("Estudiante").Preload("Estudiante.Persona").
		Preload("Estudiante.Institucion").Preload("Estudiante.Ciudad").
		Preload("AutoridadUTEQ").Preload("AutoridadUTEQ.Persona").
		Find(&dudas).Error
	return dudas, err
}