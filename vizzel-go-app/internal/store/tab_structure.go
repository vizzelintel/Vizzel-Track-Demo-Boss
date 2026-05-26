package store

import "context"

func (s *postgresStore) tabStructureEnabled(ctx context.Context) bool {
	return s.tabAssetsEnabled(ctx)
}

func (s *postgresStore) ListDepartments(ctx context.Context, orgID int64) ([]Row, error) {
	if s.tabStructureEnabled(ctx) {
		return s.listRowsPG(ctx,
			`SELECT id, dept_name, NULL, NULL, institute_id, created_at FROM tab_dept
			 WHERE organization_id = $1 AND deleted_at IS NULL ORDER BY id`,
			orgID,
		)
	}
	return s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, NULL, created_at FROM departments WHERE organization_id = $1`, orgID)
}

func (s *postgresStore) ListInstitutes(ctx context.Context, orgID int64) ([]Row, error) {
	if s.tabStructureEnabled(ctx) {
		return s.listRowsPG(ctx,
			`SELECT id, institute_name, NULL, NULL, NULL, created_at FROM tab_institute
			 WHERE organization_id = $1 AND deleted_at IS NULL ORDER BY id`,
			orgID,
		)
	}
	return s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, NULL, created_at FROM institutes WHERE organization_id = $1`, orgID)
}

func (s *postgresStore) ListSections(ctx context.Context, orgID int64) ([]Row, error) {
	if s.tabStructureEnabled(ctx) {
		return s.listRowsPG(ctx,
			`SELECT s.id, s.section_name, NULL, NULL, s.dept_id, s.created_at
			 FROM tab_section s JOIN tab_dept d ON d.id = s.dept_id
			 WHERE d.organization_id = $1 AND s.deleted_at IS NULL`,
			orgID,
		)
	}
	return s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, institute_id, created_at FROM sections WHERE organization_id = $1`, orgID)
}

func (s *postgresStore) ListPositions(ctx context.Context, orgID int64) ([]Row, error) {
	if s.tabStructureEnabled(ctx) {
		return s.listRowsPG(ctx,
			`SELECT id, position_name, NULL, NULL, NULL, created_at FROM tab_position
			 WHERE organization_id = $1 AND deleted_at IS NULL ORDER BY id`,
			orgID,
		)
	}
	return s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, NULL, created_at FROM positions WHERE organization_id = $1`, orgID)
}

func (s *postgresStore) ListBuildings(ctx context.Context, orgID int64) ([]Row, error) {
	if s.tabStructureEnabled(ctx) {
		return s.listRowsPG(ctx,
			`SELECT id, building_name, NULL, NULL, NULL, created_at FROM tab_building
			 WHERE organization_id = $1 AND deleted_at IS NULL ORDER BY id`,
			orgID,
		)
	}
	return s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, NULL, created_at FROM buildings WHERE organization_id = $1`, orgID)
}

func (s *postgresStore) ListRooms(ctx context.Context, orgID int64) ([]Row, error) {
	if s.tabStructureEnabled(ctx) {
		return s.listRowsPG(ctx,
			`SELECT r.id, COALESCE(r.room_name, r.room_number), r.room_number, NULL, r.building_id, r.created_at
			 FROM tab_room r JOIN tab_building b ON b.id = r.building_id
			 WHERE b.organization_id = $1 AND r.deleted_at IS NULL`,
			orgID,
		)
	}
	return s.listRowsPG(ctx, `SELECT r.id, r.name, r.room_number, NULL, NULL, r.created_at FROM rooms r JOIN buildings b ON b.id = r.building_id WHERE b.organization_id = $1`, orgID)
}
