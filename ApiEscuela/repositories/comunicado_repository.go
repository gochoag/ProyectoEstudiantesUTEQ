package repositories

import (
	"ApiEscuela/models"

	"gorm.io/gorm"
)

type ComunicadoRepository struct {
	db *gorm.DB
}

func NewComunicadoRepository(db *gorm.DB) *ComunicadoRepository {
	return &ComunicadoRepository{db: db}
}

// GetDB retorna la instancia de la base de datos
func (r *ComunicadoRepository) GetDB() *gorm.DB {
	return r.db
}

// CreateComunicado crea un nuevo comunicado
func (r *ComunicadoRepository) CreateComunicado(comunicado *models.Comunicado) error {
	return r.db.Create(comunicado).Error
}

// GetComunicadoByID obtiene un comunicado por ID
func (r *ComunicadoRepository) GetComunicadoByID(id uint) (*models.Comunicado, error) {
	var comunicado models.Comunicado
	err := r.db.Preload("Usuario").Preload("Usuario.Persona").
		First(&comunicado, id).Error
	if err != nil {
		return nil, err
	}
	return &comunicado, nil
}

// GetAllComunicados obtiene todos los comunicados ordenados por fecha de creación descendente
func (r *ComunicadoRepository) GetAllComunicados() ([]models.Comunicado, error) {
	var comunicados []models.Comunicado
	err := r.db.Preload("Usuario").Preload("Usuario.Persona").
		Order("created_at DESC").
		Find(&comunicados).Error
	return comunicados, err
}

// UpdateComunicado actualiza un comunicado
func (r *ComunicadoRepository) UpdateComunicado(comunicado *models.Comunicado) error {
	return r.db.Save(comunicado).Error
}

// DeleteComunicado elimina un comunicado
func (r *ComunicadoRepository) DeleteComunicado(id uint) error {
	return r.db.Delete(&models.Comunicado{}, id).Error
}

// GetComunicadosByUsuario obtiene comunicados por usuario
func (r *ComunicadoRepository) GetComunicadosByUsuario(usuarioID uint) ([]models.Comunicado, error) {
	var comunicados []models.Comunicado
	err := r.db.Where("usuario_id = ?", usuarioID).
		Preload("Usuario").Preload("Usuario.Persona").
		Order("created_at DESC").
		Find(&comunicados).Error
	return comunicados, err
}

// SearchComunicados busca comunicados por asunto
func (r *ComunicadoRepository) SearchComunicados(termino string) ([]models.Comunicado, error) {
	var comunicados []models.Comunicado
	err := r.db.Where("asunto ILIKE ?", "%"+termino+"%").
		Preload("Usuario").Preload("Usuario.Persona").
		Order("created_at DESC").
		Find(&comunicados).Error
	return comunicados, err
}
