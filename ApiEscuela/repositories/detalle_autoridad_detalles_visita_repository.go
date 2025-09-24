package repositories

import (
	"ApiEscuela/models"
	"gorm.io/gorm"
)

type DetalleAutoridadDetallesVisitaRepository struct {
	db *gorm.DB
}

func NewDetalleAutoridadDetallesVisitaRepository(db *gorm.DB) *DetalleAutoridadDetallesVisitaRepository {
	return &DetalleAutoridadDetallesVisitaRepository{db: db}
}

// CreateDetalleAutoridadDetallesVisita crea un nuevo detalle de autoridad para visita
func (r *DetalleAutoridadDetallesVisitaRepository) CreateDetalleAutoridadDetallesVisita(detalle *models.DetalleAutoridadDetallesVisita) error {
	return r.db.Create(detalle).Error
}

// GetDetalleAutoridadDetallesVisitaByID obtiene un detalle por ID
func (r *DetalleAutoridadDetallesVisitaRepository) GetDetalleAutoridadDetallesVisitaByID(id uint) (*models.DetalleAutoridadDetallesVisita, error) {
	var detalle models.DetalleAutoridadDetallesVisita
	err := r.db.Preload("ProgramaVisita").
		Preload("ProgramaVisita.Institucion").
		Preload("AutoridadUTEQ").
		First(&detalle, id).Error
	if err != nil {
		return nil, err
	}
	return &detalle, nil
}

// GetAllDetalleAutoridadDetallesVisitas obtiene todos los detalles
func (r *DetalleAutoridadDetallesVisitaRepository) GetAllDetalleAutoridadDetallesVisitas() ([]models.DetalleAutoridadDetallesVisita, error) {
	var detalles []models.DetalleAutoridadDetallesVisita
	err := r.db.Preload("ProgramaVisita").
		Preload("ProgramaVisita.Institucion").
		Preload("AutoridadUTEQ").
		Find(&detalles).Error
	return detalles, err
}

// UpdateDetalleAutoridadDetallesVisita actualiza un detalle
func (r *DetalleAutoridadDetallesVisitaRepository) UpdateDetalleAutoridadDetallesVisita(detalle *models.DetalleAutoridadDetallesVisita) error {
	return r.db.Save(detalle).Error
}

// DeleteDetalleAutoridadDetallesVisita elimina un detalle
func (r *DetalleAutoridadDetallesVisitaRepository) DeleteDetalleAutoridadDetallesVisita(id uint) error {
	return r.db.Delete(&models.DetalleAutoridadDetallesVisita{}, id).Error
}

// GetDetallesByProgramaVisitaID obtiene todos los detalles de un programa de visita específico
func (r *DetalleAutoridadDetallesVisitaRepository) GetDetallesByProgramaVisitaID(programaVisitaID uint) ([]models.DetalleAutoridadDetallesVisita, error) {
	var detalles []models.DetalleAutoridadDetallesVisita
	err := r.db.Where("programa_visita_id = ?", programaVisitaID).
		Preload("ProgramaVisita").Preload("AutoridadUTEQ").Find(&detalles).Error
	return detalles, err
}

// GetDetallesByAutoridadID obtiene todos los detalles de una autoridad específica
func (r *DetalleAutoridadDetallesVisitaRepository) GetDetallesByAutoridadID(autoridadID uint) ([]models.DetalleAutoridadDetallesVisita, error) {
	var detalles []models.DetalleAutoridadDetallesVisita
	err := r.db.Where("autoridad_uteq_id = ?", autoridadID).
		Preload("ProgramaVisita").Preload("AutoridadUTEQ").Find(&detalles).Error
	return detalles, err
}

// DeleteDetallesByProgramaVisitaID elimina todos los detalles de un programa de visita
func (r *DetalleAutoridadDetallesVisitaRepository) DeleteDetallesByProgramaVisitaID(programaVisitaID uint) error {
	return r.db.Where("programa_visita_id = ?", programaVisitaID).Delete(&models.DetalleAutoridadDetallesVisita{}).Error
}

// DeleteDetallesByAutoridadID elimina todos los detalles de una autoridad específica
func (r *DetalleAutoridadDetallesVisitaRepository) DeleteDetallesByAutoridadID(autoridadID uint) error {
	return r.db.Where("autoridad_uteq_id = ?", autoridadID).Delete(&models.DetalleAutoridadDetallesVisita{}).Error
}

// ExistsRelation verifica si ya existe una relación entre programa de visita y autoridad
func (r *DetalleAutoridadDetallesVisitaRepository) ExistsRelation(programaVisitaID, autoridadID uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.DetalleAutoridadDetallesVisita{}).
		Where("programa_visita_id = ? AND autoridad_uteq_id = ?", programaVisitaID, autoridadID).
		Count(&count).Error
	return count > 0, err
}

// GetEstadisticasAsignacion obtiene estadísticas de asignación de autoridades
func (r *DetalleAutoridadDetallesVisitaRepository) GetEstadisticasAsignacion() (map[string]interface{}, error) {
	var totalAsignaciones int64
	var totalAutoridadesUnicas int64
	var totalProgramasUnicos int64

	// Contar total de asignaciones
	if err := r.db.Model(&models.DetalleAutoridadDetallesVisita{}).Count(&totalAsignaciones).Error; err != nil {
		return nil, err
	}

	// Contar autoridades únicas
	if err := r.db.Model(&models.DetalleAutoridadDetallesVisita{}).
		Distinct("autoridad_uteq_id").Count(&totalAutoridadesUnicas).Error; err != nil {
		return nil, err
	}

	// Contar programas únicos
	if err := r.db.Model(&models.DetalleAutoridadDetallesVisita{}).
		Distinct("programa_visita_id").Count(&totalProgramasUnicos).Error; err != nil {
		return nil, err
	}

	// Calcular promedio de autoridades por programa
	var promedioAutoridadesPorPrograma float64
	if totalProgramasUnicos > 0 {
		promedioAutoridadesPorPrograma = float64(totalAsignaciones) / float64(totalProgramasUnicos)
	}

	return map[string]interface{}{
		"total_asignaciones":                totalAsignaciones,
		"total_autoridades_unicas":         totalAutoridadesUnicas,
		"total_programas_con_autoridades":  totalProgramasUnicos,
		"promedio_autoridades_por_programa": promedioAutoridadesPorPrograma,
	}, nil
}