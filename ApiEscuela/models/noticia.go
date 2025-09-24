package models

import "gorm.io/gorm"

// Noticia representa una noticia del sistema
type Noticia struct {
	gorm.Model
	Titulo      string `json:"titulo" gorm:"not null"`
	Descripcion string `json:"descripcion"`
	URLNoticia  string `json:"url_noticia"`
	UsuarioID   uint   `json:"usuario_id" gorm:"not null"`

	// Relaciones
	Usuario Usuario `json:"usuario,omitempty" gorm:"foreignKey:UsuarioID"`
}
