package models

import "gorm.io/gorm"

// DetalleAutoridadDetallesVisita representa la relación entre un programa de visita y las autoridades asignadas
type DetalleAutoridadDetallesVisita struct {
	gorm.Model
	ProgramaVisitaID uint `json:"programa_visita_id" gorm:"not null"`
	AutoridadUTEQID  uint `json:"autoridad_uteq_id" gorm:"not null"`
	
	// Relaciones
	ProgramaVisita ProgramaVisita `json:"programa_visita,omitempty" gorm:"foreignKey:ProgramaVisitaID"`
	AutoridadUTEQ  AutoridadUTEQ  `json:"autoridad_uteq,omitempty" gorm:"foreignKey:AutoridadUTEQID"`
}