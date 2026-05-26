package store

import (
	"context"
	"strings"
)

// OrgUserRow is a user–organization membership with optional structure links.
type OrgUserRow struct {
	RelationID     int64
	UserID         int64
	Username       string
	Name           string
	Surname        string
	Email          string
	RoleID         int
	Verify         int
	Status         bool
	OrganizationID int64
	DeptID         *int64
	InstituteID    *int64
	SectionID      *int64
	DeptName       string
	InstituteName  string
	SectionName    string
}

func (s *postgresStore) ListOrgUsers(ctx context.Context, orgID int64) ([]OrgUserRow, error) {
	if !s.tabStructureEnabled(ctx) {
		return s.listOrgUsersFallback(ctx, orgID)
	}
	var exists bool
	_ = s.pool.QueryRow(ctx,
		`SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = 'tab_user_organization_role'
		)`,
	).Scan(&exists)
	if !exists {
		return s.listOrgUsersFallback(ctx, orgID)
	}
	q := `
SELECT r.id, u.id,
       COALESCE(NULLIF(TRIM(u.username), ''), u.email),
       COALESCE(u.name, ''), COALESCE(u.surname, ''),
       u.email, r.role_id, r.verify, r.status, r.organization_id,
       r.dept_id, r.institute_id, r.section_id,
       COALESCE(d.dept_name, ''), COALESCE(i.institute_name, ''), COALESCE(sec.section_name, '')
FROM tab_user_organization_role r
JOIN tab_user u ON u.id = r.user_id AND u.deleted_at IS NULL
LEFT JOIN tab_dept d ON d.id = r.dept_id AND d.deleted_at IS NULL
LEFT JOIN tab_institute i ON i.id = r.institute_id AND i.deleted_at IS NULL
LEFT JOIN tab_section sec ON sec.id = r.section_id AND sec.deleted_at IS NULL
WHERE r.organization_id = $1 AND r.deleted_at IS NULL
ORDER BY r.id`
	rows, err := s.pool.Query(ctx, q, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []OrgUserRow
	for rows.Next() {
		var o OrgUserRow
		var deptID, instID, secID *int64
		if err := rows.Scan(
			&o.RelationID, &o.UserID, &o.Username, &o.Name, &o.Surname, &o.Email,
			&o.RoleID, &o.Verify, &o.Status, &o.OrganizationID,
			&deptID, &instID, &secID,
			&o.DeptName, &o.InstituteName, &o.SectionName,
		); err != nil {
			return nil, err
		}
		o.DeptID = deptID
		o.InstituteID = instID
		o.SectionID = secID
		out = append(out, o)
	}
	return out, rows.Err()
}

func (s *postgresStore) listOrgUsersFallback(ctx context.Context, orgID int64) ([]OrgUserRow, error) {
	users, err := s.ListUsers(ctx, orgID)
	if err != nil {
		return nil, err
	}
	out := make([]OrgUserRow, 0, len(users))
	for _, u := range users {
		if u.ID <= 0 {
			continue
		}
		name := u.Title
		surname := ""
		if parts := strings.Fields(u.Title); len(parts) > 1 {
			name = parts[0]
			surname = strings.Join(parts[1:], " ")
		}
		out = append(out, OrgUserRow{
			RelationID:     u.ID,
			UserID:         u.ID,
			Username:       u.Subtitle,
			Name:           name,
			Surname:        surname,
			Email:          u.Subtitle,
			RoleID:         4,
			Verify:         2,
			Status:         true,
			OrganizationID: orgID,
		})
	}
	return out, nil
}
