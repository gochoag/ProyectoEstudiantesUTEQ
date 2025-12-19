package models

import "gorm.io/gorm"

// Comunicado representa un comunicado de mensajería masiva
type Comunicado struct {
	gorm.Model
	Asunto        string `json:"asunto" gorm:"type:text;not null"`
	Destinatarios string `json:"destinatarios" gorm:"type:jsonb"` // JSON: {tipo: "todos"|"instituciones"|"estudiantes"|"todas_instituciones", ids: []}
	Mensaje       string `json:"mensaje" gorm:"type:text"`        // HTML content from Quill
	Adjuntos      string `json:"adjuntos" gorm:"type:jsonb"`      // JSON array of file paths
	UsuarioID     uint   `json:"usuario_id" gorm:"not null"`      // Who sent it
	EnviadoA      int    `json:"enviado_a"`                       // Count of recipients
	Estado        string `json:"estado" gorm:"default:'enviado'"` // enviado, borrador

	// Relaciones
	Usuario Usuario `json:"usuario,omitempty" gorm:"foreignKey:UsuarioID"`
}
