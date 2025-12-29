package models

import (
	"time"

	"gorm.io/gorm"
)

// Persona representa la información básica de una persona
type Persona struct {
	gorm.Model
	Nombre          string    `json:"nombre" gorm:"not null"`
	FechaNacimiento time.Time `json:"fecha_nacimiento"`
	Correo          *string   `json:"correo" gorm:"unique"`
	Telefono        *string   `json:"telefono"`
	Cedula          string    `json:"cedula" gorm:"unique;not null"`

	// Relaciones
	Estudiantes     []Estudiante              `json:"estudiantes,omitempty" gorm:"foreignKey:PersonaID"`
	EstudiantesUniv []EstudianteUniversitario `json:"estudiantes_universitarios,omitempty" gorm:"foreignKey:PersonaID"`
	AutoridadesUTEQ []AutoridadUTEQ           `json:"autoridades_uteq,omitempty" gorm:"foreignKey:PersonaID"`
	Usuarios        []Usuario                 `json:"usuarios,omitempty" gorm:"foreignKey:PersonaID"`
}
