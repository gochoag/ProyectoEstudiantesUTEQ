# ApiEscuela - Sistema de Gestión de Visitas Educativas UTEQ

Un backend completo desarrollado en Go para la gestión integral de visitas educativas a la UTEQ, incluyendo estudiantes, instituciones, programas de visita, actividades, sistema de dudas y **autenticación JWT completa**.

## 🚀 Características Principales

- **🔐 Autenticación JWT**: Sistema completo de seguridad con tokens
- **📊 15 Entidades**: Gestión completa de todos los aspectos del sistema
- **🔗 3 Tablas Transaccionales**: Relaciones muchos-a-muchos optimizadas
- **🌐 90+ Endpoints**: API REST completa y documentada
- **🛡️ Middleware de Seguridad**: Protección automática de rutas
- **🗑️ Soft Delete**: Eliminación segura con restauración
- **📈 Estadísticas**: Reportes y análisis integrados
- **🚨 Sistema de Errores Mejorado**: Respuestas estructuradas y específicas

## 📋 Tabla de Contenidos

1. [🔐 Sistema de Autenticación](#-sistema-de-autenticación)
2. [🏗️ Arquitectura](#️-arquitectura)
3. [🔗 Tablas Transaccionales](#-tablas-transaccionales)
4. [🚀 API Endpoints](#-api-endpoints)
5. [🚨 Sistema de Errores](#-sistema-de-errores)
6. [📝 Ejemplos de Uso](#-ejemplos-de-uso)
7. [⚙️ Instalación](#️-instalación)
8. [🛠️ Tecnologías](#️-tecnologías)
9. [🔁 Recuperación de contraseña (OTP)](#-recuperación-de-contraseña-otp)
10. [⚠️ Manejo de errores por entidad](#️-manejo-de-errores-por-entidad-duplicados-y-validaciones)

## 🔐 Sistema de Autenticación

### 🌐 Estructura de URLs

#### **Rutas Públicas (Sin autenticación)**
- `POST /auth/login` - Iniciar sesión
- `POST /auth/register` - Registrar usuario
- `POST /auth/validate-token` - Validar token
- `POST /auth/recover-password` - Generar y enviar OTP por cédula
- `POST /auth/verify-code` - Verificar OTP
- `POST /auth/reset-password` - Restablecer contraseña por usuario_id
- `GET /` - Página de bienvenida
- `GET /health` - Estado de salud

#### **Rutas Protegidas (Requieren JWT)**
Todas las rutas bajo `/api/*` requieren el header:
```
Authorization: Bearer tu_token_jwt_aqui
```

### 🔑 Flujo de Autenticación

1. **Login** para obtener token:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario": "tu_usuario", "contraseña": "tu_contraseña"}'
```

2. **Usar token** en peticiones protegidas:
```bash
curl -X GET http://localhost:3000/api/estudiantes \
  -H "Authorization: Bearer tu_token_jwt_aqui"
```

### 🛡️ Características de Seguridad

- **JWT Tokens**: Expiración de 24 horas
- **Contraseñas Encriptadas**: bcrypt con salt automático
- **Middleware Automático**: Validación en todas las rutas `/api/*`
- **Renovación de Tokens**: Endpoint `/api/auth/refresh-token`

## 🏗️ Arquitectura

### 📊 Entidades del Sistema (15 modelos)

#### **🏛️ Entidades Principales**
| Entidad | Descripción |
|---------|-------------|
| **Persona** | Información básica de personas |
| **Estudiante** | Estudiantes de instituciones educativas |
| **EstudianteUniversitario** | Estudiantes universitarios de la UTEQ |
| **AutoridadUTEQ** | Autoridades de la UTEQ |
| **Usuario** | Sistema de autenticación |
| **TipoUsuario** | Tipos de usuarios |
| **Institucion** | Instituciones educativas visitantes |
| **ProgramaVisita** | Programas de visitas programadas |
| **Actividad** | Actividades disponibles |
| **Tematica** | Temáticas de actividades |
| **Dudas** | Sistema de preguntas y respuestas |
| **Ciudad** | Ciudades del país |
| **Provincia** | Provincias del país |

#### **🔗 Tablas Transaccionales (Relaciones Muchos-a-Muchos)**
| Tabla Transaccional | Relaciona | Descripción |
|---------------------|-----------|-------------|
| **VisitaDetalleEstudiantesUniversitarios** | Programas ↔ Estudiantes | Estudiantes asignados a programas de visita |
| **DetalleAutoridadDetallesVisita** | Programas ↔ Autoridades | Autoridades UTEQ asignadas a programas |
| **VisitaDetalle** | Programas ↔ Actividades | Actividades programadas en cada visita |

### 🏛️ Patrón de Capas

```
ApiEscuela/
├── models/          # Entidades y relaciones
├── repositories/    # Acceso a datos con GORM
├── services/        # Lógica de negocio (AuthService)
├── handlers/        # Controladores HTTP
├── middleware/      # Autenticación JWT
├── routers/         # Configuración de rutas
└── main.go         # Punto de entrada
```

## 🔗 Tablas Transaccionales

### 📋 Características Comunes

Todas las tablas transaccionales comparten:
- ✅ **10 endpoints** idénticos cada una
- ✅ **Validación de duplicados** (no permite relaciones repetidas)
- ✅ **Eliminaciones masivas** (por programa o entidad relacionada)
- ✅ **Estadísticas automáticas** de asignación
- ✅ **CRUD completo** con relaciones cargadas automáticamente

### 🎓 **VisitaDetalleEstudiantesUniversitarios**

**Relaciona**: Programas de Visita ↔ Estudiantes Universitarios

**Campos**: `ID`, `programa_visita_id`, `estudiante_universitario_id`

**Endpoints**:
```bash
POST   /api/visita-detalle-estudiantes-universitarios           # Asignar estudiante
GET    /api/visita-detalle-estudiantes-universitarios           # Obtener todas
GET    /api/visita-detalle-estudiantes-universitarios/:id       # Obtener por ID
PUT    /api/visita-detalle-estudiantes-universitarios/:id       # Actualizar
DELETE /api/visita-detalle-estudiantes-universitarios/:id       # Eliminar
GET    /api/visita-detalle-estudiantes-universitarios/programa-visita/:programa_visita_id # Estudiantes por programa
GET    /api/visita-detalle-estudiantes-universitarios/estudiante/:estudiante_id # Programas por estudiante
DELETE /api/visita-detalle-estudiantes-universitarios/programa-visita/:programa_visita_id # Eliminar todos los estudiantes de un programa
DELETE /api/visita-detalle-estudiantes-universitarios/estudiante/:estudiante_id # Eliminar todos los programas de un estudiante
GET    /api/visita-detalle-estudiantes-universitarios/estadisticas # Estadísticas de participación
```

### 👨‍🏫 **DetalleAutoridadDetallesVisita**

**Relaciona**: Programas de Visita ↔ Autoridades UTEQ

**Campos**: `ID`, `programa_visita_id`, `autoridad_uteq_id`

**Endpoints**:
```bash
POST   /api/detalle-autoridad-detalles-visita                   # Asignar autoridad
GET    /api/detalle-autoridad-detalles-visita                   # Obtener todas
GET    /api/detalle-autoridad-detalles-visita/:id               # Obtener por ID
PUT    /api/detalle-autoridad-detalles-visita/:id               # Actualizar
DELETE /api/detalle-autoridad-detalles-visita/:id               # Eliminar
GET    /api/detalle-autoridad-detalles-visita/programa-visita/:programa_visita_id # Autoridades por programa
GET    /api/detalle-autoridad-detalles-visita/autoridad/:autoridad_id # Programas por autoridad
DELETE /api/detalle-autoridad-detalles-visita/programa-visita/:programa_visita_id # Eliminar todas las autoridades de un programa
DELETE /api/detalle-autoridad-detalles-visita/autoridad/:autoridad_id # Eliminar todos los programas de una autoridad
GET    /api/detalle-autoridad-detalles-visita/estadisticas      # Estadísticas de asignación
```

### 🎯 **VisitaDetalle**

**Relaciona**: Programas de Visita ↔ Actividades

**Campos**: `ID`, `programa_visita_id`, `actividad_id`

**Endpoints**:
```bash
POST   /api/visita-detalles                                     # Asignar actividad
GET    /api/visita-detalles                                     # Obtener todas
GET    /api/visita-detalles/:id                                 # Obtener por ID
PUT    /api/visita-detalles/:id                                 # Actualizar
DELETE /api/visita-detalles/:id                                 # Eliminar
GET    /api/visita-detalles/programa/:programa_id               # Actividades por programa
GET    /api/visita-detalles/actividad/:actividad_id             # Programas por actividad
DELETE /api/visita-detalles/programa/:programa_id               # Eliminar todas las actividades de un programa
DELETE /api/visita-detalles/actividad/:actividad_id             # Eliminar todos los programas de una actividad
GET    /api/visita-detalles/estadisticas                        # Estadísticas de actividades
```

### 📊 **Ejemplo de Estadísticas**

```json
{
  "total_participaciones": 15,
  "total_estudiantes_unicos": 8,
  "total_programas_con_estudiantes": 5,
  "promedio_estudiantes_por_programa": 3.0
}
```

## 🚀 API Endpoints

Base URL: `http://localhost:3000`

### 🔐 Autenticación

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/login` | Iniciar sesión | ❌ |
| `POST` | `/auth/register` | Registrar usuario | ❌ |
| `POST` | `/auth/validate-token` | Validar token | ❌ |
| `GET` | `/api/auth/profile` | Perfil del usuario | ✅ |
| `POST` | `/api/auth/change-password` | Cambiar contraseña | ✅ |
| `POST` | `/api/auth/refresh-token` | Renovar token | ✅ |

### 📚 Endpoints por Entidad

#### 👤 **Personas**
```
POST   /api/personas                    # Crear persona
GET    /api/personas                    # Obtener todas las personas
GET    /api/personas/:id                # Obtener persona por ID
PUT    /api/personas/:id                # Actualizar persona
DELETE /api/personas/:id                # Eliminar persona
GET    /api/personas/cedula/:cedula     # Buscar por cédula
GET    /api/personas/correo/:correo     # Buscar por correo
```

#### 🎓 **Estudiantes**
```
POST   /api/estudiantes                           # Crear estudiante
GET    /api/estudiantes                           # Obtener estudiantes activos
GET    /api/estudiantes/all-including-deleted     # Obtener todos (activos + eliminados)
GET    /api/estudiantes/deleted                   # Obtener solo eliminados
GET    /api/estudiantes/:id                       # Obtener estudiante por ID
PUT    /api/estudiantes/:id                       # Actualizar estudiante
DELETE /api/estudiantes/:id                       # Eliminar estudiante (cascada)
PUT    /api/estudiantes/:id/restore               # Restaurar estudiante (cascada)
GET    /api/estudiantes/ciudad/:ciudad_id         # Filtrar por ciudad
GET    /api/estudiantes/institucion/:institucion_id # Filtrar por institución
GET    /api/estudiantes/especialidad/:especialidad # Filtrar por especialidad
```

#### 🎓 **Estudiantes Universitarios**
```
POST   /api/estudiantes-universitarios            # Crear estudiante universitario
GET    /api/estudiantes-universitarios            # Obtener todos
GET    /api/estudiantes-universitarios/:id        # Obtener por ID
PUT    /api/estudiantes-universitarios/:id        # Actualizar
DELETE /api/estudiantes-universitarios/:id        # Eliminar
GET    /api/estudiantes-universitarios/semestre/:semestre # Filtrar por semestre
GET    /api/estudiantes-universitarios/persona/:persona_id # Filtrar por persona
```

#### 👨‍🏫 **Autoridades UTEQ**
```
POST   /api/autoridades-uteq                      # Crear autoridad
GET    /api/autoridades-uteq                      # Obtener autoridades activas
GET    /api/autoridades-uteq/all-including-deleted # Obtener todas (activas + eliminadas)
GET    /api/autoridades-uteq/deleted              # Obtener solo eliminadas
GET    /api/autoridades-uteq/:id                  # Obtener autoridad por ID
PUT    /api/autoridades-uteq/:id                  # Actualizar autoridad
DELETE /api/autoridades-uteq/:id                  # Eliminar autoridad (cascada)
PUT    /api/autoridades-uteq/:id/restore          # Restaurar autoridad (cascada)
GET    /api/autoridades-uteq/cargo/:cargo         # Filtrar por cargo
GET    /api/autoridades-uteq/persona/:persona_id  # Filtrar por persona
```

#### 👥 **Usuarios**
```
POST   /api/usuarios                              # Crear usuario
GET    /api/usuarios                              # Obtener usuarios activos
GET    /api/usuarios/all-including-deleted        # Obtener todos (activos + eliminados)
GET    /api/usuarios/deleted                      # Obtener solo eliminados
GET    /api/usuarios/:id                          # Obtener usuario por ID
PUT    /api/usuarios/:id                          # Actualizar usuario
DELETE /api/usuarios/:id                          # Eliminar usuario (soft delete)
PUT    /api/usuarios/:id/restore                  # Restaurar usuario eliminado
GET    /api/usuarios/username/:username           # Buscar por nombre de usuario
GET    /api/usuarios/tipo/:tipo_usuario_id        # Filtrar por tipo
GET    /api/usuarios/persona/:persona_id          # Filtrar por persona
```

#### 🏢 **Tipos de Usuario**
```
POST   /api/tipos-usuario                         # Crear tipo de usuario
GET    /api/tipos-usuario                         # Obtener todos los tipos
GET    /api/tipos-usuario/:id                     # Obtener tipo por ID
PUT    /api/tipos-usuario/:id                     # Actualizar tipo
DELETE /api/tipos-usuario/:id                     # Eliminar tipo
GET    /api/tipos-usuario/nombre/:nombre          # Buscar por nombre
```

#### 🏫 **Instituciones**
```
POST   /api/instituciones                         # Crear institución
GET    /api/instituciones                         # Obtener todas las instituciones
GET    /api/instituciones/:id                     # Obtener institución por ID
PUT    /api/instituciones/:id                     # Actualizar institución
DELETE /api/instituciones/:id                     # Eliminar institución
GET    /api/instituciones/nombre/:nombre          # Buscar por nombre
GET    /api/instituciones/autoridad/:autoridad    # Buscar por autoridad
```

#### 📅 **Programas de Visita**
```
POST   /api/programas-visita                      # Crear programa
GET    /api/programas-visita                      # Obtener todos los programas
GET    /api/programas-visita/:id                  # Obtener programa por ID
PUT    /api/programas-visita/:id                  # Actualizar programa
DELETE /api/programas-visita/:id                  # Eliminar programa
GET    /api/programas-visita/fecha/:fecha         # Filtrar por fecha (YYYY-MM-DD)
GET    /api/programas-visita/institucion/:institucion_id # Filtrar por institución
GET    /api/programas-visita/rango-fecha?inicio=YYYY-MM-DD&fin=YYYY-MM-DD # Rango de fechas
```

#### 🎯 **Actividades**
```
POST   /api/actividades                           # Crear actividad
GET    /api/actividades                           # Obtener todas las actividades
GET    /api/actividades/:id                       # Obtener actividad por ID
PUT    /api/actividades/:id                       # Actualizar actividad
DELETE /api/actividades/:id                       # Eliminar actividad
GET    /api/actividades/tematica/:tematica_id     # Filtrar por temática
GET    /api/actividades/nombre/:nombre            # Buscar por nombre
GET    /api/actividades/duracion?min=30&max=120   # Filtrar por duración
```

#### 📚 **Temáticas**
```
POST   /api/tematicas                             # Crear temática
GET    /api/tematicas                             # Obtener todas las temáticas
GET    /api/tematicas/:id                         # Obtener temática por ID
PUT    /api/tematicas/:id                         # Actualizar temática
DELETE /api/tematicas/:id                         # Eliminar temática
GET    /api/tematicas/nombre/:nombre              # Buscar por nombre
GET    /api/tematicas/descripcion/:descripcion    # Buscar por descripción
```

#### ❓ **Dudas**
```
POST   /api/dudas                                 # Crear duda
GET    /api/dudas                                 # Obtener todas las dudas
GET    /api/dudas/:id                             # Obtener duda por ID
PUT    /api/dudas/:id                             # Actualizar duda
DELETE /api/dudas/:id                             # Eliminar duda
GET    /api/dudas/estudiante/:estudiante_id       # Filtrar por estudiante
GET    /api/dudas/autoridad/:autoridad_id         # Filtrar por autoridad
GET    /api/dudas/sin-responder                   # Dudas pendientes
GET    /api/dudas/respondidas                     # Dudas respondidas
GET    /api/dudas/sin-asignar                     # Dudas sin asignar
GET    /api/dudas/privacidad/:privacidad          # Filtrar por privacidad (publico/privado)
GET    /api/dudas/buscar/:termino                 # Búsqueda en preguntas
PUT    /api/dudas/:duda_id/asignar                # Asignar autoridad
PUT    /api/dudas/:duda_id/responder              # Responder duda
```

#### 🌍 **Provincias**
```
POST   /api/provincias                            # Crear provincia
GET    /api/provincias                            # Obtener todas las provincias
GET    /api/provincias/:id                        # Obtener provincia por ID
PUT    /api/provincias/:id                        # Actualizar provincia
DELETE /api/provincias/:id                        # Eliminar provincia
GET    /api/provincias/nombre/:nombre             # Buscar por nombre
```

#### 🏙️ **Ciudades**
```
POST   /api/ciudades                              # Crear ciudad
GET    /api/ciudades                              # Obtener todas las ciudades
GET    /api/ciudades/:id                          # Obtener ciudad por ID
PUT    /api/ciudades/:id                          # Actualizar ciudad
DELETE /api/ciudades/:id                          # Eliminar ciudad
GET    /api/ciudades/provincia/:provincia_id      # Ciudades por provincia
GET    /api/ciudades/nombre/:nombre               # Buscar por nombre
```

### 🔗 Resumen de Operaciones

**Total de Endpoints**: 90+

**Operaciones CRUD Estándar** (todas las entidades):
- `POST /api/{entidad}` - Crear
- `GET /api/{entidad}` - Listar todos
- `GET /api/{entidad}/:id` - Obtener por ID
- `PUT /api/{entidad}/:id` - Actualizar
- `DELETE /api/{entidad}/:id` - Eliminar

### 🆕 Funcionalidades Especiales

#### **Soft Delete y Restauración**
```bash
# Obtener eliminados
GET /api/{entidad}/deleted

# Obtener todos (activos + eliminados)
GET /api/{entidad}/all-including-deleted

# Restaurar eliminado
PUT /api/{entidad}/:id/restore
```

#### **Eliminación en Cascada**
- **Estudiantes**: Elimina estudiante → usuario → persona
- **Autoridades UTEQ**: Elimina autoridad → usuario → persona

#### **Filtros Avanzados**
```bash
# Por rango de fechas
GET /api/programas-visita/rango-fecha?inicio=2024-01-01&fin=2024-12-31

# Por duración
GET /api/actividades/duracion?min=30&max=120

# Por privacidad
GET /api/dudas/privacidad/publico
```

#### **Estadísticas de Tablas Transaccionales**
```bash
GET /api/visita-detalles/estadisticas
GET /api/visita-detalle-estudiantes-universitarios/estadisticas
GET /api/detalle-autoridad-detalles-visita/estadisticas
```

## 🚨 Sistema de Errores

### 📋 Estructura Estándar

```json
{
  "error": "Descripción corta",
  "error_code": "CODIGO_ESPECIFICO",
  "message": "Mensaje detallado con solución",
  "status_code": 401,
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/api/estudiantes",
  "method": "GET"
}
```

### 🔐 Códigos de Error Principales

| Código | Descripción | Solución |
|--------|-------------|----------|
| `AUTH_TOKEN_MISSING` | Sin token | Incluir header Authorization |
| `AUTH_TOKEN_EXPIRED` | Token expirado | Hacer login o refresh |
| `AUTH_TOKEN_MALFORMED` | Token inválido | Verificar formato JWT |
| `LOGIN_USER_NOT_FOUND` | Usuario no existe | Verificar credenciales |
| `LOGIN_PASSWORD_INCORRECT_HASH` | Contraseña incorrecta | Verificar contraseña |

### 🧪 Probar Errores

```bash
# Sin token
curl -X GET http://localhost:3000/api/estudiantes

# Token malformado
curl -X GET http://localhost:3000/api/estudiantes \
  -H "Authorization: Bearer token_invalido"

# Relación duplicada en tabla transaccional
curl -X POST http://localhost:3000/api/visita-detalles \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"programa_visita_id": 1, "actividad_id": 1}'
# Respuesta: 409 Conflict - "La relación ya existe"
```

## 📝 Ejemplos de Uso

### 🔐 Flujo Completo de Autenticación

```bash
# 1. Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario": "test_user", "contraseña": "password123"}'

# Respuesta: {"token": "eyJhbGciOiJIUzI1NiIs...", ...}

# 2. Usar token (reemplazar TOKEN)
curl -X GET http://localhost:3000/api/estudiantes \
  -H "Authorization: Bearer TOKEN"

# 3. Renovar token
curl -X POST http://localhost:3000/api/auth/refresh-token \
  -H "Authorization: Bearer TOKEN"
```

### 🔗 Gestión de Tablas Transaccionales

```bash
# 1. Crear programa de visita
curl -X POST http://localhost:3000/api/programas-visita \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fecha": "2024-04-15T09:00:00Z", "institucion_id": 1}'

# 2. Asignar estudiantes al programa
curl -X POST http://localhost:3000/api/visita-detalle-estudiantes-universitarios \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"programa_visita_id": 1, "estudiante_universitario_id": 1}'

# 3. Asignar autoridades al programa
curl -X POST http://localhost:3000/api/detalle-autoridad-detalles-visita \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"programa_visita_id": 1, "autoridad_uteq_id": 1}'

# 4. Asignar actividades al programa
curl -X POST http://localhost:3000/api/visita-detalles \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"programa_visita_id": 1, "actividad_id": 1}'

# 5. Ver estudiantes del programa
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/visita-detalle-estudiantes-universitarios/programa-visita/1

# 6. Ver estadísticas
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/visita-detalle-estudiantes-universitarios/estadisticas
```

### 📚 Gestión de Datos

```bash
# Crear persona
curl -X POST http://localhost:3000/api/personas \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "cedula": "1234567890",
    "correo": "juan@email.com",
    "telefono": "0987654321"
  }'

# Crear estudiante
curl -X POST http://localhost:3000/api/estudiantes \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "persona_id": 1,
    "institucion_id": 1,
    "ciudad_id": 1,
    "especialidad": "Ingeniería en Sistemas"
  }'

# Obtener estudiantes eliminados
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/estudiantes/deleted

# Restaurar estudiante
curl -X PUT -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/estudiantes/1/restore
```

### 🔍 Búsquedas y Filtros

```bash
# Buscar por cédula
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/personas/cedula/1234567890

# Filtrar por especialidad
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/estudiantes/especialidad/Ingeniería

# Dudas por privacidad
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/dudas/privacidad/publico

# Programas por rango de fechas
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:3000/api/programas-visita/rango-fecha?inicio=2024-01-01&fin=2024-12-31"
```

## ⚙️ Instalación

### Prerrequisitos
- Go 1.24+
- PostgreSQL
- Acceso a la base de datos UTEQ

### Pasos

```bash
# 1. Clonar repositorio
git clone <repository-url>
cd ApiEscuela

# 2. Instalar dependencias
go mod tidy

# 3. Configurar variables de entorno
cp env.example .env
# Editar .env con tus valores reales

# 4. Ejecutar aplicación
go run main.go
```

La aplicación estará disponible en `http://localhost:3000`

## 🔐 Configuración de Variables de Entorno

### Archivos de Configuración

- **`.env`**: Variables de entorno para desarrollo (NO se sube a Git)
- **`env.example`**: Plantilla con todas las variables necesarias
- **`config.env`**: Archivo de respaldo (solo referencia)

### Variables Requeridas

```bash
# Configuración de la aplicación
APP_PORT=3000
APP_ENV=development

# Base de datos
# Para desarrollo local (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_USER=tu_usuario_db
DB_PASSWORD=tu_password_db
DB_NAME=apiescuela

# Para producción (Neon/Heroku)
# DATABASE_URL=postgres://usuario:password@host:puerto/database?sslmode=require

# Configuración SMTP para envío de correos
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password
SMTP_FROM=tu_email@gmail.com
SMTP_FROM_NAME=ApiEscuela

# JWT Secret (cambiar por una clave segura en producción)
JWT_SECRET=tu_jwt_secret_muy_seguro_aqui

# Configuración de archivos
UPLOAD_MAX_SIZE=52428800
UPLOAD_ALLOWED_TYPES=jpg,jpeg,png,gif,mp4,avi,mov,pdf,doc,docx,txt
```

### Configuración para Producción

#### **Para Render.com (Recomendado):**

1. **Configurar variables de entorno en Render:**
   - Ir a tu servicio en Render Dashboard
   - Sección "Environment"
   - Agregar las siguientes variables:

   ```bash
   DATABASE_URL=postgres://usuario:password@host:puerto/database?sslmode=require
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=tu_email@gmail.com
   SMTP_PASS=tu_app_password
   SMTP_FROM=tu_email@gmail.com
   SMTP_FROM_NAME=ApiEscuela
   JWT_SECRET=tu_clave_secreta_de_32_caracteres
   APP_PORT=3000
   APP_ENV=production
   ```

2. **Configurar SMTP** (Gmail):
   - Habilitar autenticación de 2 factores
   - Generar contraseña de aplicación
   - Usar la contraseña de aplicación en `SMTP_PASS`

3. **Generar JWT Secret seguro**:
   ```bash
   # Generar clave aleatoria de 32 caracteres
   openssl rand -hex 32
   ```

#### **Para desarrollo local:**

1. **Crear archivo `.env`** desde la plantilla:
   ```bash
   cp env.example .env
   # Editar .env con tus valores reales
   ```

2. **Configurar las mismas variables** que en producción

### ⚠️ Importante - Seguridad

- ✅ **Todas las credenciales** están en `.env` (protegido por Git)
- ✅ **NO hay credenciales hardcodeadas** en el código
- ✅ **La aplicación falla** si faltan variables de entorno
- ✅ **Configuración obligatoria** antes de ejecutar

### Seguridad

- ✅ **`.env` está en `.gitignore`** - No se sube al repositorio
- ✅ **`env.example`** - Plantilla segura para otros desarrolladores
- ✅ **Variables sensibles protegidas** - Contraseñas y claves secretas

## 🛠️ Tecnologías

- **Go 1.24**: Lenguaje de programación
- **Fiber v2**: Framework web HTTP de alto rendimiento
- **GORM**: ORM con soporte completo para PostgreSQL
- **PostgreSQL**: Base de datos relacional
- **JWT (golang-jwt/jwt/v5)**: Autenticación basada en tokens
- **bcrypt**: Encriptación segura de contraseñas
- **Viper**: Gestión de configuración

## 🔒 Seguridad

### JWT Configuration
- **Algoritmo**: HS256 (HMAC SHA-256)
- **Expiración**: 24 horas
- **Claims**: user_id, username, tipo_usuario_id

### Password Security
- **Encriptación**: bcrypt con salt automático
- **Longitud mínima**: 6 caracteres

### Route Protection
- **Middleware automático**: Validación en rutas `/api/*`
- **Context injection**: Info del usuario disponible en handlers

## 📚 Guías de Pruebas

### 🧪 Documentación de Pruebas Disponible

- **`PRUEBAS_PROGRAMA_BASICO.md`**: Guía para probar ProgramaVisita
- **`PRUEBAS_VISITA_ESTUDIANTE.md`**: Guía para VisitaDetalleEstudiantesUniversitarios
- **`PRUEBAS_DETALLE_AUTORIDAD.md`**: Guía para DetalleAutoridadDetallesVisita
- **`PRUEBAS_VISITA_DETALLE.md`**: Guía para VisitaDetalle

Cada guía incluye:
- ✅ Ejemplos paso a paso
- ✅ Casos de prueba específicos
- ✅ Manejo de errores
- ✅ Validaciones y formatos

## ⚠️ Migración desde Versión Anterior

### Cambios Importantes

1. **URLs actualizadas**: Agregar `/api/` antes de todas las rutas protegidas
2. **Header requerido**: `Authorization: Bearer TOKEN` en todas las peticiones
3. **Flujo obligatorio**: Login → Token → Peticiones autenticadas
4. **Nuevas tablas transaccionales**: 3 nuevas entidades con 30 endpoints adicionales

### Ejemplo de Migración

```javascript
// Antes
fetch('/estudiantes')

// Ahora
const token = localStorage.getItem('token');
fetch('/api/estudiantes', {
  headers: { 'Authorization': `Bearer ${token}` }
})
```

## 🚀 Estado del Proyecto

✅ **Sistema Completo y Funcional**
- 15 entidades implementadas
- 3 tablas transaccionales optimizadas
- 90+ endpoints API
- Sistema de autenticación JWT completo
- Sistema de errores estructurado
- Documentación completa con guías de pruebas

## 📞 Soporte

Para soporte técnico o consultas, contactar al equipo de desarrollo de la UTEQ.

### Problemas Comunes

1. **Error 401**: Verificar header `Authorization: Bearer TOKEN`
2. **Token expirado**: Usar `/api/auth/refresh-token` o hacer login
3. **URLs incorrectas**: Asegurar prefijo `/api/` en rutas protegidas
4. **Error 409 en tablas transaccionales**: Relación duplicada, verificar IDs

---

**Desarrollado para la Universidad Técnica Estatal de Quevedo (UTEQ)**

**🔐 Versión 2.1 - Sistema Completo con Tablas Transaccionales**

---

## 🔁 Recuperación de contraseña (OTP)

Flujo público para recuperación de contraseña basado en código temporal (OTP) enviado por correo.

Características:
- Código OTP numérico de 6 dígitos.
- Generado con semilla (tiempo + personaID) para variabilidad.
- Persistencia por usuario en la tabla `codigosusuarios` con expiración de 3 minutos.
- Evita reenvío si existe un código vigente.

Tabla relacionada: codigosusuarios
- id (gorm.Model)
- usuario_id (uint, index, not null)
- codigo (string, size:10, index, not null)
- expira_en (datetime, index, not null)

Endpoints públicos
1) Generar/Enviar código
- POST /auth/recover-password
- Body JSON:
  {
    "cedula": "1250328067"
  }
- Respuestas esperadas:
  - 200: { "message": "Si la cédula existe, se envió un correo con la contraseña temporal" }
  - 400: { "error": "codigo ya enviado" } si existe un código vigente para algún usuario de esa cédula
  - 400: { "error": "la persona no tiene un correo registrado" }
  - 400: { "error": "no existen usuarios asociados a la persona" }
  - 400/404: { "error": "persona no encontrada" } si la cédula no existe

2) Verificar código
- POST /auth/verify-code
- Body JSON:
  {
    "codigo": "123456"
  }
- Respuestas:
  - 200: { "estado": "verificado", "usuario_id": <id> }
  - 400: { "estado": "caducado" }
  - 404: { "estado": "no existe" }

3) Restablecer contraseña por usuario
- POST /auth/reset-password
- Body JSON:
  {
    "usuario_id": 123,
    "clave": "nuevaClave"
  }
- Respuestas:
  - 200: { "message": "clave actualizada" }
  - 400: { "error": "usuario no encontrado" | "usuario_id y clave son requeridos" | "La clave debe tener al menos 6 caracteres" }

Notas
- En este entorno de pruebas el guardado de contraseña NO está hasheado. Para producción se recomienda habilitar bcrypt.
- El OTP se guarda por cada usuario asociado a la persona encontrada.
- Si hay múltiples usuarios para una misma cédula, se genera el mismo OTP y se crea un registro por usuario.

Configuración SMTP (pruebas)
- Valores por defecto embebidos en el código (Gmail App Password):
  - SMTP_HOST=smtp.gmail.com
  - SMTP_PORT=587
  - SMTP_USER=
  - SMTP_PASS=
  - SMTP_FROM=
  - SMTP_FROM_NAME=
- En producción, se puede sobrescribir con variables de entorno (mismos nombres) sin cambiar código.

Ejemplos curl
1) Solicitar OTP:
```
curl -X POST http://localhost:3000/auth/recover-password \
  -H "Content-Type: application/json" \
  -d '{"cedula":"1250328067"}'
```

2) Verificar OTP:
```
curl -X POST http://localhost:3000/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"codigo":"123456"}'
```

3) Restablecer contraseña:
```
curl -X POST http://localhost:3000/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"usuario_id":123, "clave":"nuevaClave123"}'
```

---

## ⚠️ Manejo de errores por entidad (duplicados y validaciones)

Se implementó manejo de errores específico para restricciones únicas y duplicados por entidad. Cuando se detecta un duplicado, la API responde con:
- HTTP 409 Conflict
- Body JSON con el campo "error" y un mensaje claro

Internamente se clasifican errores de PostgreSQL (PgError 23505 unique_violation) y gorm.ErrDuplicatedKey.

Entidades cubiertas y mensajes
- Persona
  - cedula repetida → 409 { "error": "cedula repetida" }
  - correo repetido → 409 { "error": "correo repetido" }
  - persona ya existe → 409 { "error": "persona ya existe" }
- Usuario
  - usuario repetido → 409 { "error": "usuario repetido" }
- Autoridad UTEQ
  - autoridad ya existe (duplicado por persona_id) → 409 { "error": "autoridad ya existe" }
- Estudiante
  - estudiante ya existe (duplicado por persona_id) → 409 { "error": "estudiante ya existe" }
- Estudiante Universitario
  - estudiante universitario ya existe (duplicado por persona_id) → 409 { "error": "estudiante universitario ya existe" }

Notas
- Además de clasificar errores de BD, se realizan prevalidaciones antes de crear/actualizar para evitar duplicados evidentes.
- Otros errores no relacionados con duplicados siguen devolviendo 500 con mensajes genéricos (por ejemplo: "No se puede crear ...").
- Si en tu esquema existen otras restricciones únicas (por ejemplo, combinaciones de campos), se pueden extender los detectores para devolver mensajes específicos.