package repositories

import (
	"ApiEscuela/models"

	"gorm.io/gorm"
)

type NoticiaRepository struct {
	db *gorm.DB
}

func NewNoticiaRepository(db *gorm.DB) *NoticiaRepository {
	return &NoticiaRepository{db: db}
}

// CreateNoticia crea una nueva noticia
func (r *NoticiaRepository) CreateNoticia(noticia *models.Noticia) error {
	return r.db.Create(noticia).Error
}

// GetNoticiaByID obtiene una noticia por ID
func (r *NoticiaRepository) GetNoticiaByID(id uint) (*models.Noticia, error) {
	var noticia models.Noticia
	err := r.db.Preload("Usuario").Preload("Usuario.Persona").
		First(&noticia, id).Error
	if err != nil {
		return nil, err
	}
	return &noticia, nil
}

// GetAllNoticias obtiene todas las noticias
func (r *NoticiaRepository) GetAllNoticias() ([]models.Noticia, error) {
	var noticias []models.Noticia
	err := r.db.Preload("Usuario").Preload("Usuario.Persona").
		Find(&noticias).Error
	return noticias, err
}

// UpdateNoticia actualiza una noticia
func (r *NoticiaRepository) UpdateNoticia(noticia *models.Noticia) error {
	return r.db.Save(noticia).Error
}

// DeleteNoticia elimina una noticia
func (r *NoticiaRepository) DeleteNoticia(id uint) error {
	return r.db.Delete(&models.Noticia{}, id).Error
}

// GetNoticiasByUsuario obtiene noticias por usuario
func (r *NoticiaRepository) GetNoticiasByUsuario(usuarioID uint) ([]models.Noticia, error) {
	var noticias []models.Noticia
	err := r.db.Where("usuario_id = ?", usuarioID).
		Preload("Usuario").Preload("Usuario.Persona").
		Find(&noticias).Error
	return noticias, err
}

// GetNoticiasByTitulo busca noticias por título
func (r *NoticiaRepository) GetNoticiasByTitulo(titulo string) ([]models.Noticia, error) {
	var noticias []models.Noticia
	err := r.db.Where("titulo ILIKE ?", "%"+titulo+"%").
		Preload("Usuario").Preload("Usuario.Persona").
		Find(&noticias).Error
	return noticias, err
}

// GetNoticiasByDescripcion busca noticias por descripción
func (r *NoticiaRepository) GetNoticiasByDescripcion(descripcion string) ([]models.Noticia, error) {
	var noticias []models.Noticia
	err := r.db.Where("descripcion ILIKE ?", "%"+descripcion+"%").
		Preload("Usuario").Preload("Usuario.Persona").
		Find(&noticias).Error
	return noticias, err
}

// SearchNoticias busca noticias por título o descripción
func (r *NoticiaRepository) SearchNoticias(termino string) ([]models.Noticia, error) {
	var noticias []models.Noticia
	err := r.db.Where("titulo ILIKE ? OR descripcion ILIKE ?", "%"+termino+"%", "%"+termino+"%").
		Preload("Usuario").Preload("Usuario.Persona").
		Find(&noticias).Error
	return noticias, err
}
