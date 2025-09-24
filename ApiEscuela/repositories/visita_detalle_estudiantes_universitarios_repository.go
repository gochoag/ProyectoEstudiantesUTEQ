package repositories

import (
	"ApiEscuela/models"
	"gorm.io/gorm"
)

type VisitaDetalleEstudiantesUniversitariosRepository struct {
	db *gorm.DB
}

func NewVisitaDetalleEstudiantesUniversitariosRepository(db *gorm.DB) *VisitaDetalleEstudiantesUniversitariosRepository {
	return &VisitaDetalleEstudiantesUniversitariosRepository{db: db}
}

// CreateVisitaDetalleEstudiantesUniversitarios crea una nueva relación entre estudiante universitario y programa de visita
func (r *VisitaDetalleEstudiantesUniversitariosRepository) CreateVisitaDetalleEstudiantesUniversitarios(relacion *models.VisitaDetalleEstudiantesUniversitarios) error {
	return r.db.Create(relacion).Error
}

// GetVisitaDetalleEstudiantesUniversitariosByID obtiene una relación por ID
func (r *VisitaDetalleEstudiantesUniversitariosRepository) GetVisitaDetalleEstudiantesUniversitariosByID(id uint) (*models.VisitaDetalleEstudiantesUniversitarios, error) {
	var relacion models.VisitaDetalleEstudiantesUniversitarios
	err := r.db.Preload("EstudianteUniversitario").
		Preload("ProgramaVisita").
		Preload("ProgramaVisita.Institucion").
		First(&relacion, id).Error
	if err != nil {
		return nil, err
	}
	return &relacion, nil
}

// GetAllVisitaDetalleEstudiantesUniversitarios obtiene todas las relaciones
func (r *VisitaDetalleEstudiantesUniversitariosRepository) GetAllVisitaDetalleEstudiantesUniversitarios() ([]models.VisitaDetalleEstudiantesUniversitarios, error) {
	var relaciones []models.VisitaDetalleEstudiantesUniversitarios
	err := r.db.Preload("EstudianteUniversitario").
		Preload("ProgramaVisita").
		Preload("ProgramaVisita.Institucion").
		Find(&relaciones).Error
	return relaciones, err
}

// UpdateVisitaDetalleEstudiantesUniversitarios actualiza una relación
func (r *VisitaDetalleEstudiantesUniversitariosRepository) UpdateVisitaDetalleEstudiantesUniversitarios(relacion *models.VisitaDetalleEstudiantesUniversitarios) error {
	return r.db.Save(relacion).Error
}

// DeleteVisitaDetalleEstudiantesUniversitarios elimina una relación
func (r *VisitaDetalleEstudiantesUniversitariosRepository) DeleteVisitaDetalleEstudiantesUniversitarios(id uint) error {
	return r.db.Delete(&models.VisitaDetalleEstudiantesUniversitarios{}, id).Error
}

// GetEstudiantesByProgramaVisita obtiene estudiantes por programa de visita
func (r *VisitaDetalleEstudiantesUniversitariosRepository) GetEstudiantesByProgramaVisita(programaVisitaID uint) ([]models.VisitaDetalleEstudiantesUniversitarios, error) {
	var relaciones []models.VisitaDetalleEstudiantesUniversitarios
	err := r.db.Where("programa_visita_id = ?", programaVisitaID).
		Preload("EstudianteUniversitario").
		Preload("ProgramaVisita").
		Preload("ProgramaVisita.Institucion").
		Find(&relaciones).Error
	return relaciones, err
}

// GetProgramasVisitaByEstudiante obtiene programas de visita por estudiante universitario
func (r *VisitaDetalleEstudiantesUniversitariosRepository) GetProgramasVisitaByEstudiante(estudianteID uint) ([]models.VisitaDetalleEstudiantesUniversitarios, error) {
	var relaciones []models.VisitaDetalleEstudiantesUniversitarios
	err := r.db.Where("estudiante_universitario_id = ?", estudianteID).
		Preload("EstudianteUniversitario").
		Preload("ProgramaVisita").
		Preload("ProgramaVisita.Institucion").
		Find(&relaciones).Error
	return relaciones, err
}

// DeleteByProgramaVisita elimina todas las relaciones de un programa de visita específico
func (r *VisitaDetalleEstudiantesUniversitariosRepository) DeleteByProgramaVisita(programaVisitaID uint) error {
	return r.db.Where("programa_visita_id = ?", programaVisitaID).Delete(&models.VisitaDetalleEstudiantesUniversitarios{}).Error
}

// DeleteByEstudiante elimina todas las relaciones de un estudiante específico
func (r *VisitaDetalleEstudiantesUniversitariosRepository) DeleteByEstudiante(estudianteID uint) error {
	return r.db.Where("estudiante_universitario_id = ?", estudianteID).Delete(&models.VisitaDetalleEstudiantesUniversitarios{}).Error
}

// ExistsRelation verifica si ya existe una relación entre estudiante y programa de visita
func (r *VisitaDetalleEstudiantesUniversitariosRepository) ExistsRelation(estudianteID, programaVisitaID uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.VisitaDetalleEstudiantesUniversitarios{}).
		Where("estudiante_universitario_id = ? AND programa_visita_id = ?", estudianteID, programaVisitaID).
		Count(&count).Error
	return count > 0, err
}

// GetEstadisticasParticipacion obtiene estadísticas de participación de estudiantes
func (r *VisitaDetalleEstudiantesUniversitariosRepository) GetEstadisticasParticipacion() (map[string]interface{}, error) {
	var totalRelaciones int64
	var totalEstudiantesUnicos int64
	var totalProgramasUnicos int64

	// Contar total de relaciones
	if err := r.db.Model(&models.VisitaDetalleEstudiantesUniversitarios{}).Count(&totalRelaciones).Error; err != nil {
		return nil, err
	}

	// Contar estudiantes únicos
	if err := r.db.Model(&models.VisitaDetalleEstudiantesUniversitarios{}).
		Distinct("estudiante_universitario_id").Count(&totalEstudiantesUnicos).Error; err != nil {
		return nil, err
	}

	// Contar programas únicos
	if err := r.db.Model(&models.VisitaDetalleEstudiantesUniversitarios{}).
		Distinct("programa_visita_id").Count(&totalProgramasUnicos).Error; err != nil {
		return nil, err
	}

	// Calcular promedio de estudiantes por programa
	var promedioEstudiantesPorPrograma float64
	if totalProgramasUnicos > 0 {
		promedioEstudiantesPorPrograma = float64(totalRelaciones) / float64(totalProgramasUnicos)
	}

	return map[string]interface{}{
		"total_participaciones":              totalRelaciones,
		"total_estudiantes_unicos":          totalEstudiantesUnicos,
		"total_programas_con_estudiantes":   totalProgramasUnicos,
		"promedio_estudiantes_por_programa": promedioEstudiantesPorPrograma,
	}, nil
}