package models

import "gorm.io/gorm"

// VisitaDetalle representa el detalle de una visita con actividades
type VisitaDetalle struct {
	gorm.Model
	ProgramaVisitaID uint `json:"programa_visita_id" gorm:"not null"`
	ActividadID      uint `json:"actividad_id" gorm:"not null"`
	
	// Relaciones
	ProgramaVisita ProgramaVisita `json:"programa_visita,omitempty" gorm:"foreignKey:ProgramaVisitaID"`
	Actividad      Actividad      `json:"actividad,omitempty" gorm:"foreignKey:ActividadID"`
}