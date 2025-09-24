package models

import "gorm.io/gorm"

// VisitaDetalleEstudiantesUniversitarios representa la relación entre estudiantes universitarios y programas de visita
type VisitaDetalleEstudiantesUniversitarios struct {
	gorm.Model
	EstudianteUniversitarioID   uint `json:"estudiante_universitario_id" gorm:"not null"`
	ProgramaVisitaID            uint `json:"programa_visita_id" gorm:"not null"`
	
	// Relaciones
	EstudianteUniversitario   EstudianteUniversitario   `json:"estudiante_universitario,omitempty" gorm:"foreignKey:EstudianteUniversitarioID"`
	ProgramaVisita            ProgramaVisita            `json:"programa_visita,omitempty" gorm:"foreignKey:ProgramaVisitaID"`
}