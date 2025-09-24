package models

import "gorm.io/gorm"

// TipoUsuario representa los diferentes tipos de usuarios del sistema
type TipoUsuario struct {
	gorm.Model
	Nombre      string    `json:"nombre" gorm:"not null"`
	Descripcion string    `json:"descripcion"`
	
	// Relaciones
	Usuarios []Usuario `json:"usuarios,omitempty" gorm:"foreignKey:TipoUsuarioID"`
}