package services

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"encoding/base64"
	"fmt"
	"net/smtp"
	"os"
	"strings"
)

// ComunicadoService maneja la lógica de negocio para comunicados
type ComunicadoService struct {
	comunicadoRepo  *repositories.ComunicadoRepository
	estudianteRepo  *repositories.EstudianteRepository
	institucionRepo *repositories.InstitucionRepository
}

// NewComunicadoService crea una nueva instancia del servicio
func NewComunicadoService(
	comunicadoRepo *repositories.ComunicadoRepository,
	estudianteRepo *repositories.EstudianteRepository,
	institucionRepo *repositories.InstitucionRepository,
) *ComunicadoService {
	return &ComunicadoService{
		comunicadoRepo:  comunicadoRepo,
		estudianteRepo:  estudianteRepo,
		institucionRepo: institucionRepo,
	}
}

// Attachment representa un archivo adjunto para correo
type Attachment struct {
	Name     string
	Data     []byte
	MimeType string
}

// DestinatarioInfo representa la información de destinatarios
type DestinatarioInfo struct {
	Tipo string `json:"tipo"` // "todos", "instituciones", "estudiantes", "todas_instituciones"
	IDs  []uint `json:"ids"`  // IDs de instituciones o estudiantes específicos
}

// EmailResult representa el resultado del envío de correos
type EmailResult struct {
	Enviados int
	Total    int
	Errores  []string
}

// GetCorreosDestinatarios obtiene la lista de correos según el tipo de destinatario
func (s *ComunicadoService) GetCorreosDestinatarios(destinatario DestinatarioInfo) ([]string, error) {
	var correosDestinatarios []string

	switch destinatario.Tipo {
	case "todos":
		// Todos los estudiantes habilitados
		estudiantes, err := s.estudianteRepo.GetAllEstudiantes()
		if err != nil {
			return nil, fmt.Errorf("error al obtener los estudiantes: %v", err)
		}
		for _, est := range estudiantes {
			if est.Persona.Correo != "" {
				correosDestinatarios = append(correosDestinatarios, est.Persona.Correo)
			}
		}

	case "instituciones":
		// Instituciones específicas (correo de la institución)
		for _, id := range destinatario.IDs {
			institucion, err := s.institucionRepo.GetInstitucionByID(id)
			if err == nil && institucion.Correo != "" {
				correosDestinatarios = append(correosDestinatarios, institucion.Correo)
			}
		}

	case "estudiantes":
		// Estudiantes específicos
		for _, id := range destinatario.IDs {
			estudiante, err := s.estudianteRepo.GetEstudianteByID(id)
			if err == nil && estudiante.Persona.Correo != "" {
				correosDestinatarios = append(correosDestinatarios, estudiante.Persona.Correo)
			}
		}

	case "todas_instituciones":
		// Todas las instituciones (correo de cada institución)
		instituciones, err := s.institucionRepo.GetAllInstituciones()
		if err != nil {
			return nil, fmt.Errorf("error al obtener las instituciones: %v", err)
		}
		for _, inst := range instituciones {
			if inst.Correo != "" {
				correosDestinatarios = append(correosDestinatarios, inst.Correo)
			}
		}

	default:
		return nil, fmt.Errorf("tipo de destinatario no válido: %s", destinatario.Tipo)
	}

	return correosDestinatarios, nil
}

// SendEmailWithAttachments envía un correo con archivos adjuntos a múltiples destinatarios usando BCC
func (s *ComunicadoService) SendEmailWithAttachments(recipients []string, subject, htmlBody string, attachments []Attachment) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")
	from := os.Getenv("SMTP_FROM")
	fromName := os.Getenv("SMTP_FROM_NAME")

	if host == "" || port == "" || user == "" || pass == "" || from == "" {
		return fmt.Errorf("configuración SMTP incompleta")
	}

	if len(recipients) == 0 {
		return fmt.Errorf("no hay destinatarios")
	}

	addr := host + ":" + port
	auth := smtp.PlainAuth("", user, pass, host)

	boundary := "==BOUNDARY_COMUNICADO_UTEQ=="

	var msgBuilder strings.Builder

	// Headers - Usamos BCC para todos los destinatarios (no se muestra en el header To)
	msgBuilder.WriteString(fmt.Sprintf("From: %s <%s>\r\n", fromName, from))
	// El campo To muestra el remitente o un texto genérico para que los destinatarios no vean los otros correos
	msgBuilder.WriteString(fmt.Sprintf("To: %s\r\n", from))
	msgBuilder.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	msgBuilder.WriteString("MIME-Version: 1.0\r\n")

	if len(attachments) > 0 {
		// Correo con adjuntos
		msgBuilder.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=\"%s\"\r\n", boundary))
		msgBuilder.WriteString("\r\n")

		// Parte HTML
		msgBuilder.WriteString(fmt.Sprintf("--%s\r\n", boundary))
		msgBuilder.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
		msgBuilder.WriteString("Content-Transfer-Encoding: 7bit\r\n")
		msgBuilder.WriteString("\r\n")
		msgBuilder.WriteString(htmlBody)
		msgBuilder.WriteString("\r\n")

		// Adjuntos
		for _, att := range attachments {
			msgBuilder.WriteString(fmt.Sprintf("--%s\r\n", boundary))
			msgBuilder.WriteString(fmt.Sprintf("Content-Type: %s; name=\"%s\"\r\n", att.MimeType, att.Name))
			msgBuilder.WriteString("Content-Transfer-Encoding: base64\r\n")
			msgBuilder.WriteString(fmt.Sprintf("Content-Disposition: attachment; filename=\"%s\"\r\n", att.Name))
			msgBuilder.WriteString("\r\n")

			// Codificar en base64 con líneas de 76 caracteres
			encoded := base64.StdEncoding.EncodeToString(att.Data)
			for i := 0; i < len(encoded); i += 76 {
				end := i + 76
				if end > len(encoded) {
					end = len(encoded)
				}
				msgBuilder.WriteString(encoded[i:end])
				msgBuilder.WriteString("\r\n")
			}
		}

		msgBuilder.WriteString(fmt.Sprintf("--%s--\r\n", boundary))
	} else {
		// Correo sin adjuntos
		msgBuilder.WriteString("Content-Type: text/html; charset=\"UTF-8\"\r\n")
		msgBuilder.WriteString("\r\n")
		msgBuilder.WriteString(htmlBody)
	}

	// Enviar un solo correo a todos los destinatarios (BCC - los destinatarios van en el envelope, no en los headers)
	return smtp.SendMail(addr, auth, from, recipients, []byte(msgBuilder.String()))
}

// SendBulkEmails envía UN SOLO correo a todos los destinatarios usando BCC
// Esto es más eficiente que enviar correos individuales
func (s *ComunicadoService) SendBulkEmails(correos []string, subject, htmlBody string, attachments []Attachment) EmailResult {
	result := EmailResult{
		Total:   len(correos),
		Errores: []string{},
	}

	if len(correos) == 0 {
		return result
	}

	// Enviar un solo correo a todos los destinatarios
	err := s.SendEmailWithAttachments(correos, subject, htmlBody, attachments)
	if err != nil {
		result.Errores = append(result.Errores, fmt.Sprintf("Error al enviar correo masivo: %v", err))
	} else {
		result.Enviados = len(correos)
	}

	return result
}

// CreateComunicado crea un nuevo comunicado en la base de datos
func (s *ComunicadoService) CreateComunicado(comunicado *models.Comunicado) error {
	return s.comunicadoRepo.CreateComunicado(comunicado)
}

// GetComunicadoByID obtiene un comunicado por ID
func (s *ComunicadoService) GetComunicadoByID(id uint) (*models.Comunicado, error) {
	return s.comunicadoRepo.GetComunicadoByID(id)
}

// GetAllComunicados obtiene todos los comunicados
func (s *ComunicadoService) GetAllComunicados() ([]models.Comunicado, error) {
	return s.comunicadoRepo.GetAllComunicados()
}

// DeleteComunicado elimina un comunicado
func (s *ComunicadoService) DeleteComunicado(id uint) error {
	return s.comunicadoRepo.DeleteComunicado(id)
}

// SearchComunicados busca comunicados por asunto
func (s *ComunicadoService) SearchComunicados(termino string) ([]models.Comunicado, error) {
	return s.comunicadoRepo.SearchComunicados(termino)
}
