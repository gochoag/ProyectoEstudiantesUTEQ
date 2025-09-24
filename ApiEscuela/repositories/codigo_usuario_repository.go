package repositories

import (
	"ApiEscuela/models"
	"time"

	"gorm.io/gorm"
)

// Estados de códigos
const (
	EstadoValido     = "valido"
	EstadoVerificado = "verificado"
	EstadoExpirado   = "expirado"
)

type CodigoUsuarioRepository struct {
	db *gorm.DB
}

func NewCodigoUsuarioRepository(db *gorm.DB) *CodigoUsuarioRepository {
	return &CodigoUsuarioRepository{db: db}
}

// Crear inserta un nuevo código para un usuario con expiración de 3 minutos
func (r *CodigoUsuarioRepository) Crear(usuarioID uint, codigo string) error {
	expiraEn := time.Now().Add(3 * time.Minute)
	record := &models.CodigoUsuario{
		UsuarioID: usuarioID,
		Codigo:    codigo,
		ExpiraEn:  &expiraEn,
		Estado:    EstadoValido,
	}
	return r.db.Create(record).Error
}

// ExisteVigentePorUsuario verifica si el usuario tiene un código válido y no expirado
func (r *CodigoUsuarioRepository) ExisteVigentePorUsuario(usuarioID uint) (bool, error) {
	var count int64
	err := r.db.Model(&models.CodigoUsuario{}).
		Where("usuario_id = ? AND estado = ? AND expira_en IS NOT NULL AND expira_en > ?", usuarioID, EstadoValido, time.Now()).
		Count(&count).Error
	return count > 0, err
}

// FindLatestByCodigo obtiene el último registro creado para un código dado
func (r *CodigoUsuarioRepository) FindLatestByCodigo(codigo string) (*models.CodigoUsuario, error) {
	var rec models.CodigoUsuario
	err := r.db.Where("codigo = ?", codigo).Order("created_at DESC").First(&rec).Error
	if err != nil {
		return nil, err
	}
	return &rec, nil
}

// Update actualiza un registro de código de usuario
func (r *CodigoUsuarioRepository) Update(rec *models.CodigoUsuario) error {
	return r.db.Save(rec).Error
}

// GetByID obtiene un código por su ID
func (r *CodigoUsuarioRepository) GetByID(id uint) (*models.CodigoUsuario, error) {
	var rec models.CodigoUsuario
	err := r.db.First(&rec, id).Error
	if err != nil {
		return nil, err
	}
	return &rec, nil
}

// MarcarComoVerificado marca un código como verificado
func (r *CodigoUsuarioRepository) MarcarComoVerificado(id uint) error {
	return r.db.Model(&models.CodigoUsuario{}).Where("id = ?", id).Updates(map[string]interface{}{
		"estado":    EstadoVerificado,
		"expira_en": nil,
	}).Error
}

// MarcarComoExpirado marca un código como expirado
func (r *CodigoUsuarioRepository) MarcarComoExpirado(id uint) error {
	return r.db.Model(&models.CodigoUsuario{}).Where("id = ?", id).Update("estado", EstadoExpirado).Error
}

// GetCodigosValidosExpirados obtiene códigos que están en estado válido pero ya expiraron por tiempo
func (r *CodigoUsuarioRepository) GetCodigosValidosExpirados(usuarioID uint) ([]models.CodigoUsuario, error) {
	var codigos []models.CodigoUsuario
	err := r.db.Where("usuario_id = ? AND estado = ? AND expira_en IS NOT NULL AND expira_en <= ?", 
		usuarioID, EstadoValido, time.Now()).Find(&codigos).Error
	return codigos, err
}

// MigrarColumnaExpiraEn permite valores NULL en la columna expira_en
func (r *CodigoUsuarioRepository) MigrarColumnaExpiraEn() error {
	// Primero, agregar la columna estado si no existe
	if err := r.db.Exec("ALTER TABLE codigosusuarios ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'valido'").Error; err != nil {
		return err
	}
	
	// Crear índice para estado si no existe
	if err := r.db.Exec("CREATE INDEX IF NOT EXISTS idx_codigosusuarios_estado ON codigosusuarios(estado)").Error; err != nil {
		return err
	}
	
	// Modificar la columna expira_en para permitir NULL
	if err := r.db.Exec("ALTER TABLE codigosusuarios ALTER COLUMN expira_en DROP NOT NULL").Error; err != nil {
		return err
	}
	
	return nil
}
