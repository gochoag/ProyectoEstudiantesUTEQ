package models

import "gorm.io/gorm"

// Usuario representa un usuario del sistema
type Usuario struct {
	gorm.Model
	Usuario       string `json:"usuario" gorm:"unique;not null"`
	Contraseña    string `json:"contraseña" gorm:"not null"`
	PersonaID     uint   `json:"persona_id" gorm:"not null"`
	TipoUsuarioID uint   `json:"tipo_usuario_id" gorm:"not null"`
	Verificado    bool   `json:"verificado" gorm:"default:false"`

	// Relaciones
	Persona     Persona     `json:"persona,omitempty" gorm:"foreignKey:PersonaID"`
	TipoUsuario TipoUsuario `json:"tipo_usuario,omitempty" gorm:"foreignKey:TipoUsuarioID"`
	Noticias    []Noticia   `json:"noticias,omitempty" gorm:"foreignKey:UsuarioID"`
}
