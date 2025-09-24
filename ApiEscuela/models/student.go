package models

import "gorm.io/gorm"

// Estudiante representa un estudiante del sistema
type Estudiante struct {
	gorm.Model
	PersonaID     uint        `json:"persona_id" gorm:"not null"`
	InstitucionID uint        `json:"institucion_id" gorm:"not null"`
	CiudadID      uint        `json:"ciudad_id" gorm:"not null"`
	Especialidad  string      `json:"especialidad"`
	
	// Relaciones
	Persona     Persona     `json:"persona,omitempty" gorm:"foreignKey:PersonaID"`
	Institucion Institucion `json:"institucion,omitempty" gorm:"foreignKey:InstitucionID"`
	Ciudad      Ciudad      `json:"ciudad,omitempty" gorm:"foreignKey:CiudadID"`
	Dudas       []Dudas     `json:"dudas,omitempty" gorm:"foreignKey:EstudianteID"`
}