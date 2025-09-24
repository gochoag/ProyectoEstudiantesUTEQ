package repositories

import (
	"ApiEscuela/models"
	"gorm.io/gorm"
)

type VisitaDetalleRepository struct {
	db *gorm.DB
}

func NewVisitaDetalleRepository(db *gorm.DB) *VisitaDetalleRepository {
	return &VisitaDetalleRepository{db: db}
}

// CreateVisitaDetalle crea un nuevo detalle de visita
func (r *VisitaDetalleRepository) CreateVisitaDetalle(detalle *models.VisitaDetalle) error {
	return r.db.Create(detalle).Error
}

// GetVisitaDetalleByID obtiene un detalle de visita por ID
func (r *VisitaDetalleRepository) GetVisitaDetalleByID(id uint) (*models.VisitaDetalle, error) {
	var detalle models.VisitaDetalle
	err := r.db.Preload("ProgramaVisita").
		Preload("ProgramaVisita.Institucion").
		Preload("Actividad").
		First(&detalle, id).Error
	if err != nil {
		return nil, err
	}
	return &detalle, nil
}

// GetAllVisitaDetalles obtiene todos los detalles de visita
func (r *VisitaDetalleRepository) GetAllVisitaDetalles() ([]models.VisitaDetalle, error) {
	var detalles []models.VisitaDetalle
	err := r.db.Preload("ProgramaVisita").
		Preload("ProgramaVisita.Institucion").
		Preload("Actividad").
		Find(&detalles).Error
	return detalles, err
}

// UpdateVisitaDetalle actualiza un detalle de visita
func (r *VisitaDetalleRepository) UpdateVisitaDetalle(detalle *models.VisitaDetalle) error {
	return r.db.Save(detalle).Error
}

// DeleteVisitaDetalle elimina un detalle de visita
func (r *VisitaDetalleRepository) DeleteVisitaDetalle(id uint) error {
	return r.db.Delete(&models.VisitaDetalle{}, id).Error
}

// GetVisitaDetallesByActividad obtiene detalles por actividad
func (r *VisitaDetalleRepository) GetVisitaDetallesByActividad(actividadID uint) ([]models.VisitaDetalle, error) {
	var detalles []models.VisitaDetalle
	err := r.db.Where("actividad_id = ?", actividadID).
		Preload("ProgramaVisita").
		Preload("ProgramaVisita.Institucion").
		Preload("Actividad").
		Find(&detalles).Error
	return detalles, err
}

// GetVisitaDetallesByPrograma obtiene detalles por programa de visita
func (r *VisitaDetalleRepository) GetVisitaDetallesByPrograma(programaID uint) ([]models.VisitaDetalle, error) {
	var detalles []models.VisitaDetalle
	err := r.db.Where("programa_visita_id = ?", programaID).
		Preload("ProgramaVisita").
		Preload("ProgramaVisita.Institucion").
		Preload("Actividad").
		Find(&detalles).Error
	return detalles, err
}

// DeleteVisitaDetallesByPrograma elimina todos los detalles de un programa de visita específico
func (r *VisitaDetalleRepository) DeleteVisitaDetallesByPrograma(programaID uint) error {
	return r.db.Where("programa_visita_id = ?", programaID).Delete(&models.VisitaDetalle{}).Error
}

// DeleteVisitaDetallesByActividad elimina todos los detalles de una actividad específica
func (r *VisitaDetalleRepository) DeleteVisitaDetallesByActividad(actividadID uint) error {
	return r.db.Where("actividad_id = ?", actividadID).Delete(&models.VisitaDetalle{}).Error
}

// ExistsRelation verifica si ya existe una relación entre programa de visita y actividad
func (r *VisitaDetalleRepository) ExistsRelation(programaVisitaID, actividadID uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.VisitaDetalle{}).
		Where("programa_visita_id = ? AND actividad_id = ?", programaVisitaID, actividadID).
		Count(&count).Error
	return count > 0, err
}

// GetEstadisticasActividades obtiene estadísticas de actividades en visitas
func (r *VisitaDetalleRepository) GetEstadisticasActividades() (map[string]interface{}, error) {
	var totalDetalles int64
	var totalActividadesUnicas int64
	var totalProgramasUnicos int64

	// Contar total de detalles
	if err := r.db.Model(&models.VisitaDetalle{}).Count(&totalDetalles).Error; err != nil {
		return nil, err
	}

	// Contar actividades únicas
	if err := r.db.Model(&models.VisitaDetalle{}).
		Distinct("actividad_id").Count(&totalActividadesUnicas).Error; err != nil {
		return nil, err
	}

	// Contar programas únicos
	if err := r.db.Model(&models.VisitaDetalle{}).
		Distinct("programa_visita_id").Count(&totalProgramasUnicos).Error; err != nil {
		return nil, err
	}

	// Calcular promedio de actividades por programa
	var promedioActividadesPorPrograma float64
	if totalProgramasUnicos > 0 {
		promedioActividadesPorPrograma = float64(totalDetalles) / float64(totalProgramasUnicos)
	}

	return map[string]interface{}{
		"total_asignaciones_actividades":    totalDetalles,
		"total_actividades_unicas":         totalActividadesUnicas,
		"total_programas_con_actividades":  totalProgramasUnicos,
		"promedio_actividades_por_programa": promedioActividadesPorPrograma,
	}, nil
}