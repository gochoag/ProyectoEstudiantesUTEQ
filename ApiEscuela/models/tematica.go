package models

import "gorm.io/gorm"

// Tematica representa una temática de actividades
type Tematica struct {
	gorm.Model
	Nombre      string      `json:"nombre" gorm:"not null"`
	Descripcion string      `json:"descripcion"`
	
	// Relaciones
	Actividades []Actividad `json:"actividades,omitempty" gorm:"foreignKey:TematicaID"`
}