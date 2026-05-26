package store

import (
	"context"
	"fmt"
)

const RoleSuperAdmin int64 = 1

type Role struct {
	ID          int64        `json:"id"`
	Name        string       `json:"name"`
	Description string       `json:"description"`
	IsSystem    bool         `json:"is_system"`
	IsLocked    bool         `json:"is_locked"`
	Permissions []Permission `json:"permissions,omitempty"`
}

type Permission struct {
	Resource  string `json:"resource"`
	Label     string `json:"label,omitempty"`
	CanView   bool   `json:"can_view"`
	CanEdit   bool   `json:"can_edit"`
	CanDelete bool   `json:"can_delete"`
}

type Resource struct {
	Code      string `json:"code"`
	Label     string `json:"label"`
	SortOrder int    `json:"sort_order"`
}

type RoleInput struct {
	Name        string       `json:"name"`
	Description string       `json:"description"`
	Permissions []Permission `json:"permissions"`
}

// ListResources returns the master list of permission-able resources.
func (s *postgresStore) ListResources(ctx context.Context) ([]Resource, error) {
	rows, err := s.pool.Query(ctx, `SELECT code, label, sort_order FROM lov_resource ORDER BY sort_order, code`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Resource
	for rows.Next() {
		var r Resource
		if err := rows.Scan(&r.Code, &r.Label, &r.SortOrder); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *postgresStore) ListRoles(ctx context.Context) ([]Role, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name, description, is_system, is_locked FROM tab_role ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var roles []Role
	for rows.Next() {
		var r Role
		if err := rows.Scan(&r.ID, &r.Name, &r.Description, &r.IsSystem, &r.IsLocked); err != nil {
			return nil, err
		}
		roles = append(roles, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	perms, err := s.allRolePermissionsPG(ctx)
	if err != nil {
		return nil, err
	}
	for i := range roles {
		roles[i].Permissions = perms[roles[i].ID]
	}
	return roles, nil
}

func (s *postgresStore) allRolePermissionsPG(ctx context.Context) (map[int64][]Permission, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT rp.role_id, rp.resource, COALESCE(r.label, rp.resource), rp.can_view, rp.can_edit, rp.can_delete
		FROM tab_role_permission rp
		LEFT JOIN lov_resource r ON r.code = rp.resource
		ORDER BY r.sort_order NULLS LAST, rp.resource`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[int64][]Permission{}
	for rows.Next() {
		var roleID int64
		var p Permission
		if err := rows.Scan(&roleID, &p.Resource, &p.Label, &p.CanView, &p.CanEdit, &p.CanDelete); err != nil {
			return nil, err
		}
		out[roleID] = append(out[roleID], p)
	}
	return out, rows.Err()
}

func (s *postgresStore) GetRole(ctx context.Context, id int64) (*Role, error) {
	row := s.pool.QueryRow(ctx, `SELECT id, name, description, is_system, is_locked FROM tab_role WHERE id = $1`, id)
	var r Role
	if err := row.Scan(&r.ID, &r.Name, &r.Description, &r.IsSystem, &r.IsLocked); err != nil {
		return nil, err
	}
	perms, err := s.allRolePermissionsPG(ctx)
	if err != nil {
		return nil, err
	}
	r.Permissions = perms[r.ID]
	return &r, nil
}

func (s *postgresStore) CreateRole(ctx context.Context, in RoleInput) (*Role, error) {
	var id int64
	err := s.pool.QueryRow(ctx,
		`INSERT INTO tab_role (name, description, is_system, is_locked) VALUES ($1, $2, FALSE, FALSE) RETURNING id`,
		in.Name, in.Description).Scan(&id)
	if err != nil {
		return nil, err
	}
	if err := s.replaceRolePermissionsPG(ctx, id, in.Permissions); err != nil {
		return nil, err
	}
	return s.GetRole(ctx, id)
}

func (s *postgresStore) UpdateRole(ctx context.Context, id int64, in RoleInput) (*Role, error) {
	if id == RoleSuperAdmin {
		return nil, fmt.Errorf("role admin is locked")
	}
	if _, err := s.pool.Exec(ctx,
		`UPDATE tab_role SET name = $1, description = $2, updated_at = NOW() WHERE id = $3`,
		in.Name, in.Description, id); err != nil {
		return nil, err
	}
	if err := s.replaceRolePermissionsPG(ctx, id, in.Permissions); err != nil {
		return nil, err
	}
	return s.GetRole(ctx, id)
}

func (s *postgresStore) DeleteRole(ctx context.Context, id int64) error {
	if id == RoleSuperAdmin {
		return fmt.Errorf("role admin is locked")
	}
	var isSystem bool
	if err := s.pool.QueryRow(ctx, `SELECT is_system FROM tab_role WHERE id = $1`, id).Scan(&isSystem); err != nil {
		return err
	}
	if isSystem {
		return fmt.Errorf("system role cannot be deleted")
	}
	_, err := s.pool.Exec(ctx, `DELETE FROM tab_role WHERE id = $1`, id)
	return err
}

func (s *postgresStore) replaceRolePermissionsPG(ctx context.Context, roleID int64, perms []Permission) error {
	if _, err := s.pool.Exec(ctx, `DELETE FROM tab_role_permission WHERE role_id = $1`, roleID); err != nil {
		return err
	}
	for _, p := range perms {
		if p.Resource == "" {
			continue
		}
		if _, err := s.pool.Exec(ctx,
			`INSERT INTO tab_role_permission (role_id, resource, can_view, can_edit, can_delete) VALUES ($1, $2, $3, $4, $5)`,
			roleID, p.Resource, p.CanView, p.CanEdit, p.CanDelete); err != nil {
			return err
		}
	}
	return nil
}

func (s *postgresStore) HasPermission(ctx context.Context, roleID int64, resource, action string) (bool, error) {
	if roleID == RoleSuperAdmin {
		return true, nil
	}
	var v, e, d bool
	err := s.pool.QueryRow(ctx,
		`SELECT can_view, can_edit, can_delete FROM tab_role_permission WHERE role_id = $1 AND resource = $2`,
		roleID, resource).Scan(&v, &e, &d)
	if err != nil {
		return false, nil // missing row = no permission
	}
	switch action {
	case "view":
		return v, nil
	case "edit":
		return e, nil
	case "delete":
		return d, nil
	}
	return false, nil
}

// ---------------------------------------------------------------------------
// SQLite implementations
// ---------------------------------------------------------------------------

func (s *sqliteStore) ListResources(ctx context.Context) ([]Resource, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT code, label, sort_order FROM lov_resource ORDER BY sort_order, code`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []Resource
	for rows.Next() {
		var r Resource
		if err := rows.Scan(&r.Code, &r.Label, &r.SortOrder); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (s *sqliteStore) ListRoles(ctx context.Context) ([]Role, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, name, description, is_system, is_locked FROM tab_role ORDER BY id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var roles []Role
	for rows.Next() {
		var r Role
		var sysI, lockI int
		if err := rows.Scan(&r.ID, &r.Name, &r.Description, &sysI, &lockI); err != nil {
			return nil, err
		}
		r.IsSystem = sysI == 1
		r.IsLocked = lockI == 1
		roles = append(roles, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	perms, err := s.allRolePermissionsLite(ctx)
	if err != nil {
		return nil, err
	}
	for i := range roles {
		roles[i].Permissions = perms[roles[i].ID]
	}
	return roles, nil
}

func (s *sqliteStore) allRolePermissionsLite(ctx context.Context) (map[int64][]Permission, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT rp.role_id, rp.resource, COALESCE(r.label, rp.resource), rp.can_view, rp.can_edit, rp.can_delete
		FROM tab_role_permission rp
		LEFT JOIN lov_resource r ON r.code = rp.resource
		ORDER BY r.sort_order, rp.resource`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[int64][]Permission{}
	for rows.Next() {
		var roleID int64
		var p Permission
		var v, e, d int
		if err := rows.Scan(&roleID, &p.Resource, &p.Label, &v, &e, &d); err != nil {
			return nil, err
		}
		p.CanView = v == 1
		p.CanEdit = e == 1
		p.CanDelete = d == 1
		out[roleID] = append(out[roleID], p)
	}
	return out, rows.Err()
}

func (s *sqliteStore) GetRole(ctx context.Context, id int64) (*Role, error) {
	row := s.db.QueryRowContext(ctx, `SELECT id, name, description, is_system, is_locked FROM tab_role WHERE id = ?`, id)
	var r Role
	var sysI, lockI int
	if err := row.Scan(&r.ID, &r.Name, &r.Description, &sysI, &lockI); err != nil {
		return nil, err
	}
	r.IsSystem = sysI == 1
	r.IsLocked = lockI == 1
	perms, err := s.allRolePermissionsLite(ctx)
	if err != nil {
		return nil, err
	}
	r.Permissions = perms[r.ID]
	return &r, nil
}

func (s *sqliteStore) CreateRole(ctx context.Context, in RoleInput) (*Role, error) {
	res, err := s.db.ExecContext(ctx,
		`INSERT INTO tab_role (name, description, is_system, is_locked) VALUES (?, ?, 0, 0)`,
		in.Name, in.Description)
	if err != nil {
		return nil, err
	}
	id, _ := res.LastInsertId()
	if err := s.replaceRolePermissionsLite(ctx, id, in.Permissions); err != nil {
		return nil, err
	}
	return s.GetRole(ctx, id)
}

func (s *sqliteStore) UpdateRole(ctx context.Context, id int64, in RoleInput) (*Role, error) {
	if id == RoleSuperAdmin {
		return nil, fmt.Errorf("role admin is locked")
	}
	if _, err := s.db.ExecContext(ctx,
		`UPDATE tab_role SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?`,
		in.Name, in.Description, id); err != nil {
		return nil, err
	}
	if err := s.replaceRolePermissionsLite(ctx, id, in.Permissions); err != nil {
		return nil, err
	}
	return s.GetRole(ctx, id)
}

func (s *sqliteStore) DeleteRole(ctx context.Context, id int64) error {
	if id == RoleSuperAdmin {
		return fmt.Errorf("role admin is locked")
	}
	var isSystem int
	if err := s.db.QueryRowContext(ctx, `SELECT is_system FROM tab_role WHERE id = ?`, id).Scan(&isSystem); err != nil {
		return err
	}
	if isSystem == 1 {
		return fmt.Errorf("system role cannot be deleted")
	}
	_, err := s.db.ExecContext(ctx, `DELETE FROM tab_role WHERE id = ?`, id)
	return err
}

func (s *sqliteStore) replaceRolePermissionsLite(ctx context.Context, roleID int64, perms []Permission) error {
	if _, err := s.db.ExecContext(ctx, `DELETE FROM tab_role_permission WHERE role_id = ?`, roleID); err != nil {
		return err
	}
	for _, p := range perms {
		if p.Resource == "" {
			continue
		}
		if _, err := s.db.ExecContext(ctx,
			`INSERT INTO tab_role_permission (role_id, resource, can_view, can_edit, can_delete) VALUES (?, ?, ?, ?, ?)`,
			roleID, p.Resource, boolToInt(p.CanView), boolToInt(p.CanEdit), boolToInt(p.CanDelete)); err != nil {
			return err
		}
	}
	return nil
}

func (s *sqliteStore) HasPermission(ctx context.Context, roleID int64, resource, action string) (bool, error) {
	if roleID == RoleSuperAdmin {
		return true, nil
	}
	var v, e, d int
	err := s.db.QueryRowContext(ctx,
		`SELECT can_view, can_edit, can_delete FROM tab_role_permission WHERE role_id = ? AND resource = ?`,
		roleID, resource).Scan(&v, &e, &d)
	if err != nil {
		return false, nil
	}
	switch action {
	case "view":
		return v == 1, nil
	case "edit":
		return e == 1, nil
	case "delete":
		return d == 1, nil
	}
	return false, nil
}
