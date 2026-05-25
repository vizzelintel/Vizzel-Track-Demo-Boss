package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func RandomToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

type Claims struct {
	UserID         int64  `json:"user_id"`
	OrganizationID int64  `json:"organization_id"`
	RoleID         int64  `json:"role_id"`
	Email          string `json:"email"`
	jwt.RegisteredClaims
}

func IssueToken(secret string, userID, orgID, roleID int64, email string, ttl time.Duration) (string, error) {
	if secret == "" {
		secret = "vizzel-demo-dev-secret-change-me"
	}
	now := time.Now()
	claims := Claims{
		UserID:         userID,
		OrganizationID: orgID,
		RoleID:         roleID,
		Email:          email,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.FormatInt(userID, 10),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return t.SignedString([]byte(secret))
}

func ParseToken(secret, token string) (*Claims, error) {
	if secret == "" {
		secret = "vizzel-demo-dev-secret-change-me"
	}
	parsed, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}
