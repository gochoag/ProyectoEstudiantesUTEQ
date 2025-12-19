package models

import "gorm.io/gorm"

// Institucion representa una institución educativa
type Institucion struct {
	gorm.Model
	Nombre    string `json:"nombre" gorm:"not null"`
	Autoridad string `json:"autoridad"`
	Contacto  string `json:"contacto"`
	Correo    string `json:"correo"`
	Direccion string `json:"direccion"`

	// Relaciones
	Estudiantes     []Estudiante     `json:"estudiantes,omitempty" gorm:"foreignKey:InstitucionID"`
	ProgramasVisita []ProgramaVisita `json:"programas_visita,omitempty" gorm:"foreignKey:InstitucionID"`
}
