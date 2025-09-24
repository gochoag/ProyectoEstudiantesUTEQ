package middleware

import (
	"errors"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims representa las claims del JWT
type JWTClaims struct {
	UserID        uint   `json:"user_id"`
	Username      string `json:"username"`
	TipoUsuarioID uint   `json:"tipo_usuario_id"`
	jwt.RegisteredClaims
}

// getJWTSecret obtiene la clave secreta desde variables de entorno
func getJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// Fallback para desarrollo (NO usar en producción)
		return []byte("default_secret_for_development_only")
	}
	return []byte(secret)
}

const loginRedirectPath = "/auth/login"

// GenerateJWT genera un nuevo token JWT
func GenerateJWT(userID uint, username string, tipoUsuarioID uint) (string, error) {
	claims := JWTClaims{
		UserID:        userID,
		Username:      username,
		TipoUsuarioID: tipoUsuarioID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)), // Token válido por 24 horas
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "ApiEscuela",
			Subject:   username,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJWTSecret())
}

// ValidateJWT valida un token JWT
func ValidateJWT(tokenString string) (*JWTClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return getJWTSecret(), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}

// ErrorResponse representa la estructura estándar de errores
type ErrorResponse struct {
	Error      string `json:"error"`
	ErrorCode  string `json:"error_code"`
	Message    string `json:"message"`
	StatusCode int    `json:"status_code"`
	Timestamp  string `json:"timestamp"`
	Path       string `json:"path"`
	Method     string `json:"method"`
	RedirectTo string `json:"redirect_to,omitempty"`
}

// JWTMiddleware es el middleware que protege las rutas
func JWTMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Obtener el token del header Authorization
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
				Error:      "No autorizado",
				ErrorCode:  "AUTH_TOKEN_MISSING",
				Message:    "Token de autorización requerido. Incluya el header: Authorization: Bearer <token>",
				StatusCode: 401,
				Timestamp:  time.Now().Format(time.RFC3339),
				Path:       c.Path(),
				Method:     c.Method(),
			})
		}

		// Verificar que el header tenga el formato "Bearer <token>"
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 {
			return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
				Error:      "Formato de token inválido",
				ErrorCode:  "AUTH_TOKEN_FORMAT_INVALID",
				Message:    "El header Authorization debe tener el formato: Bearer <token>",
				StatusCode: 401,
				Timestamp:  time.Now().Format(time.RFC3339),
				Path:       c.Path(),
				Method:     c.Method(),
			})
		}

		if tokenParts[0] != "Bearer" {
			return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
				Error:      "Tipo de token inválido",
				ErrorCode:  "AUTH_TOKEN_TYPE_INVALID",
				Message:    "El token debe ser de tipo Bearer. Use: Authorization: Bearer <token>",
				StatusCode: 401,
				Timestamp:  time.Now().Format(time.RFC3339),
				Path:       c.Path(),
				Method:     c.Method(),
			})
		}

		tokenString := tokenParts[1]
		if tokenString == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
				Error:      "Token vacío",
				ErrorCode:  "AUTH_TOKEN_EMPTY",
				Message:    "El token no puede estar vacío. Proporcione un token válido después de Bearer",
				StatusCode: 401,
				Timestamp:  time.Now().Format(time.RFC3339),
				Path:       c.Path(),
				Method:     c.Method(),
			})
		}

		// Validar el token
		claims, err := ValidateJWT(tokenString)
		if err != nil {
			// Determinar el tipo específico de error JWT
			var (
				errorCode  string
				message    string
				redirectTo string
			)

			if errors.Is(err, jwt.ErrTokenExpired) || strings.Contains(err.Error(), "token is expired") {
				errorCode = "AUTH_TOKEN_EXPIRED"
				message = "El token ha expirado. Haga login nuevamente o use el endpoint /api/auth/refresh-token"
				redirectTo = loginRedirectPath
				c.Set("Location", loginRedirectPath)
				c.Set("X-Redirect-To", loginRedirectPath)
				c.Set("WWW-Authenticate", "Bearer realm=\"ApiEscuela\", error=\"invalid_token\", error_description=\"The access token expired\"")
			} else if errors.Is(err, jwt.ErrSignatureInvalid) || err.Error() == "signature is invalid" {
				errorCode = "AUTH_TOKEN_SIGNATURE_INVALID"
				message = "La firma del token es inválida. El token puede haber sido modificado"
			} else if strings.Contains(err.Error(), "malformed") {
				errorCode = "AUTH_TOKEN_MALFORMED"
				message = "El token está malformado. Verifique que sea un JWT válido"
			} else {
				errorCode = "AUTH_TOKEN_INVALID"
				message = "Token inválido. Haga login nuevamente para obtener un token válido"
			}

			return c.Status(fiber.StatusUnauthorized).JSON(ErrorResponse{
				Error:      "Token inválido",
				ErrorCode:  errorCode,
				Message:    message,
				StatusCode: 401,
				Timestamp:  time.Now().Format(time.RFC3339),
				Path:       c.Path(),
				Method:     c.Method(),
				RedirectTo: redirectTo,
			})
		}

		// Guardar la información del usuario en el contexto
		c.Locals("user_id", claims.UserID)
		c.Locals("username", claims.Username)
		c.Locals("tipo_usuario_id", claims.TipoUsuarioID)

		return c.Next()
	}
}

// OptionalJWTMiddleware es un middleware opcional que no bloquea si no hay token
func OptionalJWTMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader != "" {
			tokenParts := strings.Split(authHeader, " ")
			if len(tokenParts) == 2 && tokenParts[0] == "Bearer" {
				tokenString := tokenParts[1]
				claims, err := ValidateJWT(tokenString)
				if err == nil {
					c.Locals("user_id", claims.UserID)
					c.Locals("username", claims.Username)
					c.Locals("tipo_usuario_id", claims.TipoUsuarioID)
				}
			}
		}
		return c.Next()
	}
}
