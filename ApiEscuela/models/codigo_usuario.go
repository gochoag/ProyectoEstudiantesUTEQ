package models

import (
	"time"

	"gorm.io/gorm"
)

// CodigoUsuario representa un código temporal asociado a un usuario
// Tabla exacta: codigosusuarios
// ExpiraEn: fecha/hora de expiración (3 minutos desde su creación)
// Estado: valido, verificado, expirado
type CodigoUsuario struct {
	gorm.Model
	UsuarioID uint       `json:"usuario_id" gorm:"not null;index"`
	Usuario   Usuario    `json:"usuario,omitempty" gorm:"foreignKey:UsuarioID;references:ID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	Codigo    string     `json:"codigo" gorm:"not null;size:10;index"`
	ExpiraEn  *time.Time `json:"expira_en" gorm:"index;null"`
	Estado    string     `json:"estado" gorm:"not null;default:'valido';size:20;index"`
}

// TableName fuerza el nombre de la tabla a "codigosusuarios"
func (CodigoUsuario) TableName() string { return "codigosusuarios" }
