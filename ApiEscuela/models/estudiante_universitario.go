package models

import "gorm.io/gorm"

// EstudianteUniversitario representa un estudiante universitario
type EstudianteUniversitario struct {
	gorm.Model
	PersonaID uint   `json:"persona_id" gorm:"not null"`
	Semestre  int    `json:"semestre"`
	
	// Relaciones
	Persona                                 Persona                                   `json:"persona,omitempty" gorm:"foreignKey:PersonaID"`
	VisitaDetalleEstudiantesUniversitarios []VisitaDetalleEstudiantesUniversitarios `json:"visita_detalle_estudiantes_universitarios,omitempty" gorm:"foreignKey:EstudianteUniversitarioID"`
}