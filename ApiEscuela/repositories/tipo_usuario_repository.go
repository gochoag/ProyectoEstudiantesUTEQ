package repositories

import (
	"ApiEscuela/models"
	"gorm.io/gorm"
)

type TipoUsuarioRepository struct {
	db *gorm.DB
}

func NewTipoUsuarioRepository(db *gorm.DB) *TipoUsuarioRepository {
	return &TipoUsuarioRepository{db: db}
}

// CreateTipoUsuario crea un nuevo tipo de usuario
func (r *TipoUsuarioRepository) CreateTipoUsuario(tipoUsuario *models.TipoUsuario) error {
	return r.db.Create(tipoUsuario).Error
}

// GetTipoUsuarioByID obtiene un tipo de usuario por ID
func (r *TipoUsuarioRepository) GetTipoUsuarioByID(id uint) (*models.TipoUsuario, error) {
	var tipoUsuario models.TipoUsuario
	err := r.db.Preload("Usuarios").First(&tipoUsuario, id).Error
	if err != nil {
		return nil, err
	}
	return &tipoUsuario, nil
}

// GetAllTiposUsuario obtiene todos los tipos de usuario
func (r *TipoUsuarioRepository) GetAllTiposUsuario() ([]models.TipoUsuario, error) {
	var tiposUsuario []models.TipoUsuario
	err := r.db.Preload("Usuarios").Find(&tiposUsuario).Error
	return tiposUsuario, err
}

// UpdateTipoUsuario actualiza un tipo de usuario
func (r *TipoUsuarioRepository) UpdateTipoUsuario(tipoUsuario *models.TipoUsuario) error {
	return r.db.Save(tipoUsuario).Error
}

// DeleteTipoUsuario elimina un tipo de usuario
func (r *TipoUsuarioRepository) DeleteTipoUsuario(id uint) error {
	return r.db.Delete(&models.TipoUsuario{}, id).Error
}

// GetTipoUsuarioByNombre busca tipo de usuario por nombre
func (r *TipoUsuarioRepository) GetTipoUsuarioByNombre(nombre string) (*models.TipoUsuario, error) {
	var tipoUsuario models.TipoUsuario
	err := r.db.Where("nombre ILIKE ?", "%"+nombre+"%").
		Preload("Usuarios").First(&tipoUsuario).Error
	if err != nil {
		return nil, err
	}
	return &tipoUsuario, nil
}