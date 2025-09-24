package models

import (
	"time"
	"gorm.io/gorm"
)

// Dudas representa las dudas que pueden tener los estudiantes
type Dudas struct {
	gorm.Model
	Pregunta         string     `json:"pregunta" gorm:"not null"`
	FechaPregunta    time.Time  `json:"fecha_pregunta" gorm:"not null;default:CURRENT_TIMESTAMP"`
	Respuesta        *string    `json:"respuesta,omitempty"`        // Opcional - puntero para permitir null
	FechaRespuesta   *time.Time `json:"fecha_respuesta,omitempty"`  // Opcional - se establece cuando se responde
	Privacidad       string     `json:"privacidad" gorm:"not null;default:'publico';check:privacidad IN ('privado','publico')"`
	EstudianteID     uint       `json:"estudiante_id" gorm:"not null"`
	AutoridadUTEQID  *uint      `json:"autoridad_uteq_id,omitempty"` // Opcional - puede no estar asignada
	
	// Relaciones
	Estudiante    Estudiante     `json:"estudiante,omitempty" gorm:"foreignKey:EstudianteID"`
	AutoridadUTEQ *AutoridadUTEQ `json:"autoridad_uteq,omitempty" gorm:"foreignKey:AutoridadUTEQID"`
}