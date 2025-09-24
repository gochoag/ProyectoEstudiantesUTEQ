package models

import (
	"time"
	"gorm.io/gorm"
)

// ProgramaVisita representa un programa de visita programado
type ProgramaVisita struct {
	gorm.Model
	Fecha         time.Time   `json:"fecha" gorm:"not null"`
	Fechafin         time.Time   `json:"fechafin" gorm:"null"`
	InstitucionID uint        `json:"institucion_id" gorm:"not null"`
	
	// Relaciones
	Institucion   Institucion   `json:"institucion,omitempty" gorm:"foreignKey:InstitucionID"`
}