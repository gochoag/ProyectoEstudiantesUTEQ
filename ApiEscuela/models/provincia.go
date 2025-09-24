package models

import "gorm.io/gorm"

// Provincia representa una provincia del país
type Provincia struct {
	gorm.Model
	Provincia string    `json:"provincia" gorm:"not null"`
	Ciudades  []Ciudad  `json:"ciudades,omitempty" gorm:"foreignKey:ProvinciaID"`
}