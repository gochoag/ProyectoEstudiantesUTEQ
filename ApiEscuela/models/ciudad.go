package models

import "gorm.io/gorm"

// Ciudad representa una ciudad dentro de una provincia
type Ciudad struct {
	gorm.Model
	ProvinciaID uint       `json:"provincia_id" gorm:"not null"`
	Ciudad      string     `json:"ciudad" gorm:"not null"`
	Provincia   Provincia  `json:"provincia,omitempty" gorm:"foreignKey:ProvinciaID"`
	Estudiantes []Estudiante `json:"estudiantes,omitempty" gorm:"foreignKey:CiudadID"`
}