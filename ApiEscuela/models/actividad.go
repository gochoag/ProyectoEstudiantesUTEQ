package models

import "gorm.io/gorm"

// Actividad representa una actividad dentro de una temática
type Actividad struct {
	gorm.Model
	Actividad   string `json:"actividad" gorm:"not null"`
	TematicaID  uint   `json:"tematica_id" gorm:"not null"`
	Duracion    int    `json:"duracion"` // en minutos
	
	// Relaciones
	Tematica       Tematica        `json:"tematica,omitempty" gorm:"foreignKey:TematicaID"`
	VisitaDetalles []VisitaDetalle `json:"visita_detalles,omitempty" gorm:"foreignKey:ActividadID"`
}