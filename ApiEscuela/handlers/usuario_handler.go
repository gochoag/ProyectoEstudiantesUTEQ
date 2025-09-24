package handlers

import (
	"ApiEscuela/models"
	"ApiEscuela/repositories"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type UsuarioHandler struct {
	usuarioRepo *repositories.UsuarioRepository
}

func NewUsuarioHandler(usuarioRepo *repositories.UsuarioRepository) *UsuarioHandler {
	return &UsuarioHandler{usuarioRepo: usuarioRepo}
}

// CreateUsuario crea un nuevo usuario
func (h *UsuarioHandler) CreateUsuario(c *fiber.Ctx) error {
	var usuario models.Usuario
	
	if err := c.BodyParser(&usuario); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	if err := h.usuarioRepo.CreateUsuario(&usuario); err != nil {
		switch err {
		case repositories.ErrUsuarioDuplicado:
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "usuario repetido"})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No se puede crear el usuario"})
		}
	}

	// No devolver la contraseña en la respuesta
	usuario.Contraseña = ""
	return c.Status(fiber.StatusCreated).JSON(usuario)
}

// GetUsuario obtiene un usuario por ID
func (h *UsuarioHandler) GetUsuario(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de usuario inválido",
		})
	}

	usuario, err := h.usuarioRepo.GetUsuarioByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Usuario no encontrado",
		})
	}

	// No devolver la contraseña
	usuario.Contraseña = ""
	return c.JSON(usuario)
}

// GetAllUsuarios obtiene todos los usuarios
func (h *UsuarioHandler) GetAllUsuarios(c *fiber.Ctx) error {
	usuarios, err := h.usuarioRepo.GetAllUsuarios()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los usuarios",
		})
	}

	// No devolver las contraseñas
	for i := range usuarios {
		usuarios[i].Contraseña = ""
	}

	return c.JSON(usuarios)
}

// UpdateUsuario actualiza un usuario
func (h *UsuarioHandler) UpdateUsuario(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de usuario inválido",
		})
	}

	usuario, err := h.usuarioRepo.GetUsuarioByID(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Usuario no encontrado",
		})
	}

	// Estructura para recibir los datos de actualización
	var updateData struct {
		Usuario       string `json:"usuario"`
		PersonaID     uint   `json:"persona_id"`
		TipoUsuarioID uint   `json:"tipo_usuario_id"`
		Verificado    *bool  `json:"verificado"` // Puntero para detectar si se envió el campo
	}
	
	if err := c.BodyParser(&updateData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	// Actualizar solo los campos que se enviaron
	if updateData.Usuario != "" {
		usuario.Usuario = updateData.Usuario
	}
	if updateData.PersonaID != 0 {
		usuario.PersonaID = updateData.PersonaID
	}
	if updateData.TipoUsuarioID != 0 {
		usuario.TipoUsuarioID = updateData.TipoUsuarioID
	}
	if updateData.Verificado != nil {
		usuario.Verificado = *updateData.Verificado
	}

	if err := h.usuarioRepo.UpdateUsuario(usuario); err != nil {
		switch err {
		case repositories.ErrUsuarioDuplicado:
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "usuario repetido"})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "No se puede actualizar el usuario"})
		}
	}

	// No devolver la contraseña
	usuario.Contraseña = ""
	return c.JSON(usuario)
}

// DeleteUsuario elimina un usuario
func (h *UsuarioHandler) DeleteUsuario(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de usuario inválido",
		})
	}

	if err := h.usuarioRepo.DeleteUsuario(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede eliminar el usuario",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Usuario eliminado exitosamente",
	})
}

// GetUsuarioByUsername busca usuario por nombre de usuario
func (h *UsuarioHandler) GetUsuarioByUsername(c *fiber.Ctx) error {
	username := c.Params("username")
	
	usuario, err := h.usuarioRepo.GetUsuarioByUsername(username)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Usuario no encontrado",
		})
	}

	// No devolver la contraseña
	usuario.Contraseña = ""
	return c.JSON(usuario)
}

// GetUsuariosByTipo obtiene usuarios por tipo
func (h *UsuarioHandler) GetUsuariosByTipo(c *fiber.Ctx) error {
	tipoUsuarioID, err := strconv.Atoi(c.Params("tipo_usuario_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de tipo de usuario inválido",
		})
	}
	
	usuarios, err := h.usuarioRepo.GetUsuariosByTipo(uint(tipoUsuarioID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los usuarios",
		})
	}

	// No devolver las contraseñas
	for i := range usuarios {
		usuarios[i].Contraseña = ""
	}

	return c.JSON(usuarios)
}

// GetUsuariosByPersona obtiene usuarios por persona
func (h *UsuarioHandler) GetUsuariosByPersona(c *fiber.Ctx) error {
	personaID, err := strconv.Atoi(c.Params("persona_id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de persona inválido",
		})
	}
	
	usuarios, err := h.usuarioRepo.GetUsuariosByPersona(uint(personaID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los usuarios",
		})
	}

	// No devolver las contraseñas
	for i := range usuarios {
		usuarios[i].Contraseña = ""
	}

	return c.JSON(usuarios)
}

// Login valida credenciales de usuario
func (h *UsuarioHandler) Login(c *fiber.Ctx) error {
	var loginData struct {
		Usuario    string `json:"usuario"`
		Contraseña string `json:"contraseña"`
	}
	
	if err := c.BodyParser(&loginData); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No se puede procesar el JSON",
		})
	}

	usuario, err := h.usuarioRepo.ValidateLogin(loginData.Usuario, loginData.Contraseña)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Credenciales inválidas",
		})
	}

	// No devolver la contraseña
	usuario.Contraseña = ""
	return c.JSON(fiber.Map{
		"message": "Login exitoso",
		"usuario": usuario,
	})
}

// GetAllUsuariosIncludingDeleted obtiene todos los usuarios incluyendo eliminados
func (h *UsuarioHandler) GetAllUsuariosIncludingDeleted(c *fiber.Ctx) error {
	usuarios, err := h.usuarioRepo.GetAllUsuariosIncludingDeleted()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los usuarios",
		})
	}

	// No devolver las contraseñas
	for i := range usuarios {
		usuarios[i].Contraseña = ""
	}

	return c.JSON(usuarios)
}

// GetDeletedUsuarios obtiene solo los usuarios eliminados
func (h *UsuarioHandler) GetDeletedUsuarios(c *fiber.Ctx) error {
	usuarios, err := h.usuarioRepo.GetDeletedUsuarios()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se pueden obtener los usuarios eliminados",
		})
	}

	// No devolver las contraseñas
	for i := range usuarios {
		usuarios[i].Contraseña = ""
	}

	return c.JSON(usuarios)
}

// RestoreUsuario restaura un usuario eliminado
func (h *UsuarioHandler) RestoreUsuario(c *fiber.Ctx) error {
	id, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "ID de usuario inválido",
		})
	}

	// Verificar que el usuario existe (incluyendo eliminados)
	usuario, err := h.usuarioRepo.GetUsuarioByIDIncludingDeleted(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Usuario no encontrado",
		})
	}

	// Verificar que el usuario está eliminado
	if usuario.DeletedAt.Time.IsZero() {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "El usuario no está eliminado",
		})
	}

	if err := h.usuarioRepo.RestoreUsuario(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "No se puede restaurar el usuario",
		})
	}

	return c.JSON(fiber.Map{
		"message": "Usuario restaurado exitosamente",
	})
}