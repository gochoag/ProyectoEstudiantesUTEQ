package services

import (
	"ApiEscuela/middleware"
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	mrand "math/rand"
	"net/smtp"
	"os"
	"strings"
	"time"
	"unicode"

	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	usuarioRepo       *repositories.UsuarioRepository
	personaRepo       *repositories.PersonaRepository
	codigoUsuarioRepo *repositories.CodigoUsuarioRepository
}

var ErrPersonaNoEncontrada = errors.New("persona no encontrada")

func NewAuthService(usuarioRepo *repositories.UsuarioRepository, personaRepo *repositories.PersonaRepository, codigoUsuarioRepo *repositories.CodigoUsuarioRepository) *AuthService {
	return &AuthService{
		usuarioRepo:       usuarioRepo,
		personaRepo:       personaRepo,
		codigoUsuarioRepo: codigoUsuarioRepo,
	}
}

// LoginRequest representa la estructura de datos para el login
type LoginRequest struct {
	Usuario    string `json:"usuario" validate:"required"`
	Contraseña string `json:"contraseña" validate:"required"`
}

// LoginResponse representa la respuesta del login
type LoginResponse struct {
	Token                  string          `json:"token"`
	Usuario                *models.Usuario `json:"usuario"`
	Message                string          `json:"message"`
	RequiereCambioPassword bool            `json:"requiere_cambio_password"`
}

// RegisterRequest representa la estructura de datos para el registro
type RegisterRequest struct {
	Usuario       string `json:"usuario" validate:"required"`
	Contraseña    string `json:"contraseña" validate:"required,min=6"`
	PersonaID     uint   `json:"persona_id" validate:"required"`
	TipoUsuarioID uint   `json:"tipo_usuario_id" validate:"required"`
}

// HashPassword encripta una contraseña
func (s *AuthService) HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword verifica si una contraseña coincide con su hash
func (s *AuthService) CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// Login autentica un usuario y devuelve un token JWT
func (s *AuthService) Login(loginReq LoginRequest) (*LoginResponse, error) {
	// Buscar usuario por nombre de usuario
	usuario, err := s.usuarioRepo.GetUsuarioByUsername(loginReq.Usuario)
	if err != nil {
		// Intentar buscar incluyendo eliminados para debugging
		usuarioDeleted, errDeleted := s.usuarioRepo.GetUsuarioByUsernameIncludingDeleted(loginReq.Usuario)
		if errDeleted == nil && usuarioDeleted != nil {
			// El usuario existe pero está eliminado
			return nil, errors.New("usuario eliminado - contacte al administrador")
		}
		// Usuario no existe
		return nil, errors.New("usuario no encontrado")
	}

	// Verificar si la contraseña está encriptada (hash bcrypt tiene al menos 60 caracteres)
	if len(usuario.Contraseña) < 60 {
		// Contraseña no está encriptada, comparar directamente
		if loginReq.Contraseña != usuario.Contraseña {
			return nil, errors.New("contraseña incorrecta (texto plano)")
		}
	} else {
		// Verificar contraseña encriptada
		if !s.CheckPassword(loginReq.Contraseña, usuario.Contraseña) {
			return nil, errors.New("contraseña incorrecta (hash bcrypt)")
		}
	}

	// Generar token JWT
	token, err := middleware.GenerateJWT(usuario.ID, usuario.Usuario, usuario.TipoUsuarioID)
	if err != nil {
		return nil, errors.New("error al generar token")
	}

	// Limpiar la contraseña antes de devolver el usuario
	usuario.Contraseña = ""

	// Verificar si el usuario necesita cambiar contraseña
	requiereCambioPassword := !usuario.Verificado
	message := "Login exitoso"
	if requiereCambioPassword {
		message = "Login exitoso - Debe cambiar su contraseña para continuar"
	}

	return &LoginResponse{
		Token:                  token,
		Usuario:                usuario,
		Message:                message,
		RequiereCambioPassword: requiereCambioPassword,
	}, nil
}

// Register registra un nuevo usuario
func (s *AuthService) Register(registerReq RegisterRequest) (*models.Usuario, error) {
	// Verificar si el usuario ya existe
	existingUser, _ := s.usuarioRepo.GetUsuarioByUsername(registerReq.Usuario)
	if existingUser != nil {
		return nil, errors.New("el usuario ya existe")
	}

	// Encriptar contraseña
	hashedPassword, err := s.HashPassword(registerReq.Contraseña)
	if err != nil {
		return nil, errors.New("error al encriptar contraseña")
	}

	// Crear nuevo usuario
	usuario := &models.Usuario{
		Usuario:       registerReq.Usuario,
		Contraseña:    hashedPassword,
		PersonaID:     registerReq.PersonaID,
		TipoUsuarioID: registerReq.TipoUsuarioID,
	}

	// Guardar usuario en la base de datos
	if err := s.usuarioRepo.CreateUsuario(usuario); err != nil {
		return nil, errors.New("error al crear usuario")
	}

	// Limpiar la contraseña antes de devolver
	usuario.Contraseña = ""

	return usuario, nil
}

// ChangePassword cambia la contraseña de un usuario
func (s *AuthService) ChangePassword(userID uint, oldPassword, newPassword string) error {
	// Obtener usuario
	usuario, err := s.usuarioRepo.GetUsuarioByID(userID)
	if err != nil {
		return errors.New("usuario no encontrado")
	}

	// Verificar contraseña actual (soporta tanto encriptada como texto plano)
	passwordValida := false

	// Verificar si la contraseña está encriptada (hash bcrypt tiene al menos 60 caracteres)
	if len(usuario.Contraseña) < 60 {
		// Contraseña no está encriptada, comparar directamente
		if oldPassword == usuario.Contraseña {
			passwordValida = true
		}
	} else {
		// Verificar contraseña encriptada con bcrypt
		if s.CheckPassword(oldPassword, usuario.Contraseña) {
			passwordValida = true
		}
	}

	if !passwordValida {
		return errors.New("contraseña actual incorrecta")
	}

	// Encriptar nueva contraseña
	hashedPassword, err := s.HashPassword(newPassword)
	if err != nil {
		return errors.New("error al encriptar nueva contraseña")
	}

	// Actualizar contraseña y marcar como verificado
	usuario.Contraseña = hashedPassword
	usuario.Verificado = true
	if err := s.usuarioRepo.UpdateUsuario(usuario); err != nil {
		return errors.New("error al actualizar contraseña")
	}

	return nil
}

// ResetPassword actualiza la contraseña de un usuario por ID (sin contraseña actual)
func (s *AuthService) ResetPassword(userID uint, newPassword string) error {
	if strings.TrimSpace(newPassword) == "" {
		return errors.New("clave requerida")
	}
	usuario, err := s.usuarioRepo.GetUsuarioByID(userID)
	if err != nil {
		return errors.New("usuario no encontrado")
	}
	usuario.Contraseña = newPassword
	usuario.Verificado = true
	if err := s.usuarioRepo.UpdateUsuario(usuario); err != nil {
		return errors.New("error al actualizar contraseña")
	}
	return nil
}

// GenerateNewToken genera un nuevo token JWT para un usuario
func (s *AuthService) GenerateNewToken(userID uint, username string, tipoUsuarioID uint) (string, error) {
	return middleware.GenerateJWT(userID, username, tipoUsuarioID)
}

// RecoverPassword genera una contraseña temporal y la envía por correo
func (s *AuthService) RecoverPassword(cedula string) error {
	if strings.TrimSpace(cedula) == "" {
		return errors.New("la cédula es requerida")
	}

	normCedula := normalizeCedula(cedula)
	persona, err := s.personaRepo.GetPersonaByCedula(normCedula)
	if err != nil || persona == nil {
		return ErrPersonaNoEncontrada
	}
	if strings.TrimSpace(persona.Correo) == "" {
		return errors.New("la persona no tiene un correo registrado")
	}

	// Preferir los usuarios pre-cargados en la persona; si no hay, hacer fallback al repositorio
	usuarios := persona.Usuarios
	if len(usuarios) == 0 {
		var errRepo error
		usuarios, errRepo = s.usuarioRepo.GetUsuariosByPersona(persona.ID)
		if errRepo != nil || len(usuarios) == 0 {
			return errors.New("no existen usuarios asociados a la persona")
		}
	}

	// Verificar y limpiar códigos expirados para cada usuario
	for _, u := range usuarios {
		// Buscar códigos válidos pero expirados por tiempo
		codigosExpirados, err := s.codigoUsuarioRepo.GetCodigosValidosExpirados(u.ID)
		if err != nil {
			return errors.New("error al verificar códigos existentes")
		}

		// Marcar códigos expirados como expirado
		for _, codigo := range codigosExpirados {
			if err := s.codigoUsuarioRepo.MarcarComoExpirado(codigo.ID); err != nil {
				fmt.Printf("DEBUG: Error al marcar código como expirado: %v\n", err)
			}
		}

		// Verificar si aún existe un código vigente después de limpiar
		vigente, err := s.codigoUsuarioRepo.ExisteVigentePorUsuario(u.ID)
		if err != nil {
			return errors.New("error al verificar códigos existentes")
		}
		if vigente {
			return errors.New("codigo ya enviado")
		}
	}

	// Generar código temporal numérico (6 dígitos) con semilla
	seed := time.Now().UnixNano() ^ int64(persona.ID)
	otp := generateNumericOTP(6, seed)

	// Guardar el código para cada usuario asociado
	for _, u := range usuarios {
		if err := s.codigoUsuarioRepo.Crear(u.ID, otp); err != nil {
			return errors.New("no se pudo guardar el código temporal")
		}
	}

	// Construir contenido de correo
	subject := "Recuperación de contraseña - ApiEscuela"
	usernames := make([]string, 0, len(usuarios))
	for _, u := range usuarios {
		usernames = append(usernames, u.Usuario)
	}
	body := fmt.Sprintf(
		"<p>Hola %s,</p><p>Has solicitado recuperar tu contraseña.</p><p>Usa el siguiente código temporal de 6 dígitos para completar el proceso:</p><h2 style=\"letter-spacing:2px\">%s</h2><p>Usuarios asociados: %s</p><p>Si no solicitaste este cambio, ignora este mensaje.</p>",
		persona.Nombre, otp, strings.Join(usernames, ", "),
	)

	return s.sendEmail(persona.Correo, subject, body)
}

// sendEmail envía un correo usando SMTP con contenido HTML básico
func (s *AuthService) sendEmail(to, subject, htmlBody string) error {
	// Obtener configuración SMTP desde variables de entorno
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")
	from := os.Getenv("SMTP_FROM")
	fromName := os.Getenv("SMTP_FROM_NAME")

	// Debug: Mostrar configuración SMTP (sin contraseña)
	fmt.Printf("DEBUG SMTP - Host: %s, Port: %s, User: %s, From: %s, FromName: %s\n", host, port, user, from, fromName)
	fmt.Printf("DEBUG SMTP - Pass length: %d\n", len(pass))

	// Verificar que todas las variables estén definidas
	if host == "" || port == "" || user == "" || pass == "" || from == "" || fromName == "" {
		return fmt.Errorf("configuración SMTP incompleta. Verifique las variables de entorno: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_FROM_NAME")
	}

	addr := host + ":" + port
	auth := smtp.PlainAuth("", user, pass, host)

	fmt.Printf("DEBUG SMTP - Conectando a: %s\n", addr)

	// Mensaje MIME
	headers := make(map[string]string)
	headers["From"] = fmt.Sprintf("%s <%s>", fromName, from)
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=\"UTF-8\""

	var msgBuilder strings.Builder
	for k, v := range headers {
		msgBuilder.WriteString(fmt.Sprintf("%s: %s\r\n", k, v))
	}
	msgBuilder.WriteString("\r\n")
	msgBuilder.WriteString(htmlBody)

	fmt.Printf("DEBUG SMTP - Enviando correo a: %s\n", to)
	err := smtp.SendMail(addr, auth, from, []string{to}, []byte(msgBuilder.String()))
	if err != nil {
		fmt.Printf("DEBUG SMTP - Error al enviar correo: %v\n", err)
	} else {
		fmt.Printf("DEBUG SMTP - Correo enviado exitosamente\n")
	}
	return err
}

// generateRandomPassword crea una contraseña aleatoria alfanumérica
func normalizeCedula(s string) string {
	s = strings.TrimSpace(s)
	var b strings.Builder
	for _, r := range s {
		if unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

// generateNumericOTP genera un OTP numérico de longitud fija usando una semilla
func generateNumericOTP(length int, seed int64) string {
	r := mrand.New(mrand.NewSource(seed))
	var b strings.Builder
	for i := 0; i < length; i++ {
		b.WriteByte(byte('0' + r.Intn(10)))
	}
	return b.String()
}

func generateRandomPassword(length int) (string, error) {
	const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
	b := make([]byte, length)
	for i := range b {
		idx, err := rand.Int(rand.Reader, big.NewInt(int64(len(letters))))
		if err != nil {
			return "", err
		}
		b[i] = letters[idx.Int64()]
	}
	return string(b), nil
}

// ValidateToken valida un token JWT y devuelve las claims
func (s *AuthService) ValidateToken(tokenString string) (bool, *middleware.JWTClaims) {
	claims, err := middleware.ValidateJWT(tokenString)
	if err != nil {
		return false, nil
	}
	return true, claims
}

// VerifyCodeResult contiene el resultado de la verificación de código
type VerifyCodeResult struct {
	Estado    string `json:"estado"`
	UsuarioID uint   `json:"usuario_id"`
	Cedula    string `json:"cedula"`
	CodigoID  uint   `json:"codigo_id"`
}

// VerifyCodigo verifica un código: no existe | caducado | verificado
func (s *AuthService) VerifyCodigo(codigo string) (string, uint, error) {
	codigo = strings.TrimSpace(codigo)
	if codigo == "" {
		return "", 0, errors.New("codigo requerido")
	}
	rec, err := s.codigoUsuarioRepo.FindLatestByCodigo(codigo)
	if err != nil || rec == nil {
		return "no existe", 0, nil
	}
	// Verificar estado del código
	if rec.Estado != "valido" {
		return "caducado", 0, nil
	}

	if rec.ExpiraEn == nil || time.Now().After(*rec.ExpiraEn) {
		// Marcar como expirado si ya pasó el tiempo
		s.codigoUsuarioRepo.MarcarComoExpirado(rec.ID)
		return "caducado", 0, nil
	}

	// No cambiar el estado en la verificación, solo validar

	return "verificado", rec.UsuarioID, nil
}

// VerifyCodigoWithDetails verifica un código y retorna información completa
func (s *AuthService) VerifyCodigoWithDetails(codigo string) (*VerifyCodeResult, error) {
	codigo = strings.TrimSpace(codigo)
	if codigo == "" {
		return nil, errors.New("codigo requerido")
	}

	rec, err := s.codigoUsuarioRepo.FindLatestByCodigo(codigo)
	if err != nil || rec == nil {
		return &VerifyCodeResult{Estado: "no existe"}, nil
	}

	// Verificar estado del código
	if rec.Estado != "valido" {
		return &VerifyCodeResult{Estado: "caducado"}, nil
	}

	if rec.ExpiraEn == nil || time.Now().After(*rec.ExpiraEn) {
		// Marcar como expirado si ya pasó el tiempo
		s.codigoUsuarioRepo.MarcarComoExpirado(rec.ID)
		return &VerifyCodeResult{Estado: "caducado"}, nil
	}

	// Obtener la cédula del usuario
	usuario, err := s.usuarioRepo.GetUsuarioByID(rec.UsuarioID)
	if err != nil || usuario == nil {
		return &VerifyCodeResult{Estado: "no existe"}, nil
	}

	// Obtener la cédula de la persona
	persona, err := s.personaRepo.GetPersonaByID(usuario.PersonaID)
	if err != nil || persona == nil {
		return &VerifyCodeResult{Estado: "no existe"}, nil
	}

	return &VerifyCodeResult{
		Estado:    "verificado",
		UsuarioID: rec.UsuarioID,
		Cedula:    persona.Cedula,
		CodigoID:  rec.ID,
	}, nil
}

// ResetPasswordByCodigoID resetea la contraseña usando el ID del código y marca el código como usado
func (s *AuthService) ResetPasswordByCodigoID(codigoID uint, usuarioID uint, nuevaClave string) error {
	// Obtener el código por ID
	rec, err := s.codigoUsuarioRepo.GetByID(codigoID)
	if err != nil || rec == nil {
		return errors.New("código no encontrado")
	}

	// Verificar que el código pertenece al usuario correcto
	if rec.UsuarioID != usuarioID {
		return errors.New("el código no pertenece al usuario especificado")
	}

	// Verificar estado del código
	if rec.Estado != "valido" {
		return errors.New("el código debe estar en estado válido para cambiar la contraseña")
	}

	// Verificar que el código no esté expirado
	if rec.ExpiraEn == nil || time.Now().After(*rec.ExpiraEn) {
		// Marcar como expirado si ya pasó el tiempo
		s.codigoUsuarioRepo.MarcarComoExpirado(codigoID)
		return errors.New("el código ha expirado")
	}

	// Cambiar la contraseña del usuario
	if err := s.usuarioRepo.UpdatePassword(usuarioID, nuevaClave); err != nil {
		return fmt.Errorf("error al actualizar la contraseña: %v", err)
	}

	// Marcar el código como verificado después de cambiar la contraseña
	if err := s.codigoUsuarioRepo.MarcarComoVerificado(codigoID); err != nil {
		fmt.Printf("DEBUG: Error al marcar código como verificado: %v\n", err)
		// No retornar error, la contraseña ya fue cambiada
	}

	return nil
}
