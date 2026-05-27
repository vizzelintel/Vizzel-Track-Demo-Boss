package store

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

// TabOrgUserInput is the payload for importing a user into tab_user +
// tab_user_organization_role (production schema).
type TabOrgUserInput struct {
	Username     string
	Email        string
	PasswordHash string
	Prefix       string
	Name         string
	Surname      string
	RoleID       int
	DeptID       *int64
	InstituteID  *int64
	SectionID    *int64
	PositionID   *int64
}

var (
	ErrImportUserEmailTaken    = errors.New("email is already used by another user")
	ErrImportUserOrgMembership = errors.New("user is already a member of this organization")
)

func (s *postgresStore) tabUsersEnabled(ctx context.Context) bool {
	if !s.tabStructureEnabled(ctx) {
		return false
	}
	var ok bool
	_ = s.pool.QueryRow(ctx,
		`SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = 'tab_user'
		)`,
	).Scan(&ok)
	return ok
}

// CreateTabOrgUser inserts into tab_user and tab_user_organization_role so
// imported users appear in ListOrgUsers. Falls back to CreateUser when tab_*
// tables are unavailable (local sqlite dev).
func (s *postgresStore) CreateTabOrgUser(ctx context.Context, orgID int64, in TabOrgUserInput) error {
	if !s.tabUsersEnabled(ctx) {
		display := strings.TrimSpace(in.Name + " " + in.Surname)
		if display == "" {
			display = in.Username
		}
		if display == "" {
			display = in.Email
		}
		roleID := int64(in.RoleID)
		if roleID <= 0 {
			roleID = 4
		}
		_, err := s.CreateUser(ctx, orgID, in.Email, in.PasswordHash, display, roleID)
		return err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var existingUserID int64
	err = tx.QueryRow(ctx, `SELECT id FROM tab_user WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`, in.Email).Scan(&existingUserID)
	if err == nil {
		var member bool
		_ = tx.QueryRow(ctx,
			`SELECT EXISTS (
				SELECT 1 FROM tab_user_organization_role
				WHERE user_id = $1 AND organization_id = $2 AND deleted_at IS NULL
			)`,
			existingUserID, orgID,
		).Scan(&member)
		if member {
			return ErrImportUserOrgMembership
		}
		return ErrImportUserEmailTaken
	}

	username := strings.TrimSpace(in.Username)
	if username == "" {
		username = strings.TrimSpace(in.Name)
		if in.Surname != "" {
			username = strings.TrimSpace(in.Name + "." + in.Surname)
		}
	}
	if username == "" {
		username = strings.Split(in.Email, "@")[0]
	}
	username, err = uniqueTabUsernameTx(ctx, tx, username)
	if err != nil {
		return err
	}

	name := strings.TrimSpace(in.Name)
	if name == "" {
		name = username
	}

	var userID int64
	err = tx.QueryRow(ctx,
		`INSERT INTO tab_user (username, email, password, prefix, name, surname, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id`,
		username, strings.ToLower(in.Email), in.PasswordHash,
		nullIfEmpty(in.Prefix), name, nullIfEmpty(in.Surname),
	).Scan(&userID)
	if err != nil {
		return fmt.Errorf("create user: %w", err)
	}

	roleID := in.RoleID
	if roleID <= 0 {
		roleID = 4
	}

	_, err = tx.Exec(ctx,
		`INSERT INTO tab_user_organization_role
		 (user_id, organization_id, role_id, dept_id, institute_id, section_id, position_id, status, verify, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, 2, NOW())`,
		userID, orgID, roleID, in.DeptID, in.InstituteID, in.SectionID, in.PositionID,
	)
	if err != nil {
		return fmt.Errorf("create org membership: %w", err)
	}

	return tx.Commit(ctx)
}

func (s *sqliteStore) CreateTabOrgUser(ctx context.Context, orgID int64, in TabOrgUserInput) error {
	display := strings.TrimSpace(in.Name + " " + in.Surname)
	if display == "" {
		display = in.Username
	}
	if display == "" {
		display = in.Email
	}
	roleID := int64(in.RoleID)
	if roleID <= 0 {
		roleID = 4
	}
	_, err := s.CreateUser(ctx, orgID, in.Email, in.PasswordHash, display, roleID)
	return err
}

func uniqueTabUsernameTx(ctx context.Context, tx pgx.Tx, base string) (string, error) {
	candidate := base
	for suffix := 0; suffix < 1000; suffix++ {
		if suffix > 0 {
			candidate = fmt.Sprintf("%s_%d", base, suffix)
		}
		var exists bool
		if err := tx.QueryRow(ctx,
			`SELECT EXISTS (SELECT 1 FROM tab_user WHERE username = $1 AND deleted_at IS NULL)`,
			candidate,
		).Scan(&exists); err != nil {
			return "", err
		}
		if !exists {
			return candidate, nil
		}
	}
	return "", fmt.Errorf("could not allocate unique username for %q", base)
}

func nullIfEmpty(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}

// FindOrCreateTabInstitute resolves institute by name within an org.
func (s *postgresStore) FindOrCreateTabInstitute(ctx context.Context, orgID int64, name string, autoCreate bool) (int64, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return 0, nil
	}
	var id int64
	err := s.pool.QueryRow(ctx,
		`SELECT id FROM tab_institute
		 WHERE organization_id = $1 AND LOWER(TRIM(institute_name)) = LOWER($2) AND deleted_at IS NULL
		 LIMIT 1`,
		orgID, name,
	).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !autoCreate {
		return 0, nil
	}
	err = s.pool.QueryRow(ctx,
		`INSERT INTO tab_institute (organization_id, institute_name, created_at)
		 VALUES ($1, $2, NOW()) RETURNING id`,
		orgID, name,
	).Scan(&id)
	return id, err
}

// FindOrCreateTabDept resolves department by name, optionally linking to institute.
func (s *postgresStore) FindOrCreateTabDept(ctx context.Context, orgID int64, name string, instituteID int64, autoCreate bool) (int64, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return 0, nil
	}
	var id int64
	var instID *int64
	err := s.pool.QueryRow(ctx,
		`SELECT id, institute_id FROM tab_dept
		 WHERE organization_id = $1 AND LOWER(TRIM(dept_name)) = LOWER($2) AND deleted_at IS NULL
		 LIMIT 1`,
		orgID, name,
	).Scan(&id, &instID)
	if err == nil {
		if instituteID > 0 && (instID == nil || *instID == 0) {
			_, _ = s.pool.Exec(ctx,
				`UPDATE tab_dept SET institute_id = $1 WHERE id = $2 AND (institute_id IS NULL OR institute_id = 0)`,
				instituteID, id,
			)
		}
		return id, nil
	}
	if !autoCreate {
		return 0, nil
	}
	var instArg *int64
	if instituteID > 0 {
		instArg = &instituteID
	}
	err = s.pool.QueryRow(ctx,
		`INSERT INTO tab_dept (organization_id, dept_name, institute_id, created_at)
		 VALUES ($1, $2, $3, NOW()) RETURNING id`,
		orgID, name, instArg,
	).Scan(&id)
	return id, err
}

// FindOrCreateTabSection resolves section by dept + name.
func (s *postgresStore) FindOrCreateTabSection(ctx context.Context, deptID int64, name string, autoCreate bool) (int64, error) {
	name = strings.TrimSpace(name)
	if name == "" || deptID <= 0 {
		return 0, nil
	}
	var id int64
	err := s.pool.QueryRow(ctx,
		`SELECT id FROM tab_section
		 WHERE dept_id = $1 AND LOWER(TRIM(section_name)) = LOWER($2) AND deleted_at IS NULL
		 LIMIT 1`,
		deptID, name,
	).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !autoCreate {
		return 0, nil
	}
	err = s.pool.QueryRow(ctx,
		`INSERT INTO tab_section (dept_id, section_name, created_at)
		 VALUES ($1, $2, NOW()) RETURNING id`,
		deptID, name,
	).Scan(&id)
	return id, err
}

// FindOrCreateTabPosition resolves position by name within an org.
func (s *postgresStore) FindOrCreateTabPosition(ctx context.Context, orgID int64, name string, autoCreate bool) (int64, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return 0, nil
	}
	var id int64
	err := s.pool.QueryRow(ctx,
		`SELECT id FROM tab_position
		 WHERE organization_id = $1 AND LOWER(TRIM(position_name)) = LOWER($2) AND deleted_at IS NULL
		 LIMIT 1`,
		orgID, name,
	).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !autoCreate {
		return 0, nil
	}
	err = s.pool.QueryRow(ctx,
		`INSERT INTO tab_position (organization_id, position_name, created_at)
		 VALUES ($1, $2, NOW()) RETURNING id`,
		orgID, name,
	).Scan(&id)
	return id, err
}

func (s *sqliteStore) FindOrCreateTabInstitute(ctx context.Context, orgID int64, name string, autoCreate bool) (int64, error) {
	if name == "" {
		return 0, nil
	}
	return s.EntityCreate(ctx, "institutes", orgID, name, 0)
}

func (s *sqliteStore) FindOrCreateTabDept(ctx context.Context, orgID int64, name string, instituteID int64, autoCreate bool) (int64, error) {
	if name == "" {
		return 0, nil
	}
	return s.EntityCreate(ctx, "departments", orgID, name, instituteID)
}

func (s *sqliteStore) FindOrCreateTabSection(ctx context.Context, deptID int64, name string, autoCreate bool) (int64, error) {
	if name == "" || deptID <= 0 {
		return 0, nil
	}
	return s.EntityCreate(ctx, "sections", 0, name, deptID)
}

func (s *sqliteStore) FindOrCreateTabPosition(ctx context.Context, orgID int64, name string, autoCreate bool) (int64, error) {
	if name == "" {
		return 0, nil
	}
	return s.EntityCreate(ctx, "positions", orgID, name, 0)
}
