package store

import (
	"context"
	"fmt"
)

func (s *postgresStore) tabOpsEnabled(ctx context.Context) bool {
	return s.tabAssetsEnabled(ctx)
}

func (s *postgresStore) ListAuditJobs(ctx context.Context, orgID int64, status string) ([]Row, error) {
	if s.tabOpsEnabled(ctx) {
		q := `SELECT id, job_name, NULL, status, progress::bigint, created_at
			FROM tab_check_job WHERE organization_id = $1 AND deleted_at IS NULL`
		args := []any{orgID}
		if status != "" {
			q += ` AND status = $2`
			args = append(args, status)
		}
		q += ` ORDER BY id DESC`
		return s.listRowsPG(ctx, q, args...)
	}
	if status != "" {
		return s.listRowsPG(ctx, `SELECT id, title, NULL, status, progress::bigint, created_at FROM audit_jobs WHERE organization_id = $1 AND status = $2`, orgID, status)
	}
	return s.listRowsPG(ctx, `SELECT id, title, NULL, status, progress::bigint, created_at FROM audit_jobs WHERE organization_id = $1`, orgID)
}

func (s *postgresStore) GetAuditJob(ctx context.Context, orgID, id int64) (*Row, error) {
	if s.tabOpsEnabled(ctx) {
		rows, err := s.listRowsPG(ctx,
			`SELECT id, job_name, NULL, status, progress::bigint, created_at
			 FROM tab_check_job WHERE organization_id = $1 AND id = $2 AND deleted_at IS NULL`,
			orgID, id,
		)
		if err != nil || len(rows) == 0 {
			return nil, err
		}
		return &rows[0], nil
	}
	rows, err := s.listRowsPG(ctx,
		`SELECT id, title, NULL, status, progress::bigint, created_at FROM audit_jobs WHERE organization_id = $1 AND id = $2`,
		orgID, id,
	)
	if err != nil || len(rows) == 0 {
		return nil, err
	}
	return &rows[0], nil
}

func (s *postgresStore) ListRepairs(ctx context.Context, orgID int64) ([]Row, error) {
	if s.tabOpsEnabled(ctx) {
		return s.listRowsPG(ctx,
			`SELECT r.id, COALESCE(a.asset_number, ''), r.note, 'pending', NULL, r.created_at
			 FROM tab_asset_repair r
			 LEFT JOIN tab_asset a ON a.id = r.asset_id AND a.organization_id = $1
			 WHERE a.organization_id = $1 OR r.asset_id IS NULL
			 ORDER BY r.id DESC LIMIT 200`,
			orgID,
		)
	}
	return s.listRowsPG(ctx, `SELECT id, asset_number, note, status, NULL, created_at FROM repairs WHERE organization_id = $1`, orgID)
}

func (s *postgresStore) ListWithdrawals(ctx context.Context, orgID int64, status string) ([]Row, error) {
	if s.tabOpsEnabled(ctx) {
		q := `SELECT id, requester_name, item_name, status, NULL, created_at
			FROM tab_internal_request_withdrawal WHERE organization_id = $1 AND deleted_at IS NULL`
		args := []any{orgID}
		if status != "" {
			q += ` AND status = $2`
			args = append(args, status)
		}
		q += ` ORDER BY id DESC`
		return s.listRowsPG(ctx, q, args...)
	}
	if status != "" {
		return s.listRowsPG(ctx, `SELECT id, requester, item_name, status, NULL, created_at FROM withdrawals WHERE organization_id = $1 AND status = $2`, orgID, status)
	}
	return s.listRowsPG(ctx, `SELECT id, requester, item_name, status, NULL, created_at FROM withdrawals WHERE organization_id = $1`, orgID)
}

func (s *postgresStore) UpdateWithdrawalStatus(ctx context.Context, orgID, id int64, status string) error {
	if s.tabOpsEnabled(ctx) {
		_, err := s.pool.Exec(ctx,
			`UPDATE tab_internal_request_withdrawal SET status = $3 WHERE id = $1 AND organization_id = $2`,
			id, orgID, status,
		)
		return err
	}
	_, err := s.pool.Exec(ctx, `UPDATE withdrawals SET status = $3 WHERE id = $1 AND organization_id = $2`, id, orgID, status)
	return err
}

func (s *postgresStore) CreateCheckJob(ctx context.Context, orgID int64, name string) (int64, error) {
	if s.tabOpsEnabled(ctx) {
		var id int64
		err := s.pool.QueryRow(ctx,
			`INSERT INTO tab_check_job (organization_id, job_name, status, progress) VALUES ($1, $2, 'ongoing', 0) RETURNING id`,
			orgID, name,
		).Scan(&id)
		return id, err
	}
	var id int64
	err := s.pool.QueryRow(ctx,
		`INSERT INTO audit_jobs (organization_id, title, status, progress) VALUES ($1, $2, 'ongoing', 0) RETURNING id`,
		orgID, name,
	).Scan(&id)
	return id, err
}

func (s *postgresStore) UpdateCheckJob(ctx context.Context, orgID, jobID int64, status string, progress int) error {
	if s.tabOpsEnabled(ctx) {
		_, err := s.pool.Exec(ctx,
			`UPDATE tab_check_job SET status = COALESCE(NULLIF($3,''), status), progress = $4 WHERE id = $1 AND organization_id = $2`,
			jobID, orgID, status, progress,
		)
		return err
	}
	_, err := s.pool.Exec(ctx,
		`UPDATE audit_jobs SET status = COALESCE(NULLIF($3,''), status), progress = $4 WHERE id = $1 AND organization_id = $2`,
		jobID, orgID, status, progress,
	)
	return err
}

func (s *postgresStore) DeleteCheckJob(ctx context.Context, orgID, jobID int64) error {
	if s.tabOpsEnabled(ctx) {
		_, err := s.pool.Exec(ctx,
			`UPDATE tab_check_job SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2`,
			jobID, orgID,
		)
		return err
	}
	_, err := s.pool.Exec(ctx, `DELETE FROM audit_jobs WHERE id = $1 AND organization_id = $2`, jobID, orgID)
	return err
}

func (s *postgresStore) CreateWithdrawal(ctx context.Context, orgID int64, requester, item string, internal bool) (int64, error) {
	_ = internal
	if s.tabOpsEnabled(ctx) {
		var id int64
		err := s.pool.QueryRow(ctx,
			`INSERT INTO tab_internal_request_withdrawal (organization_id, requester_name, item_name, status)
			 VALUES ($1, $2, $3, 'pending') RETURNING id`,
			orgID, requester, item,
		).Scan(&id)
		return id, err
	}
	var id int64
	err := s.pool.QueryRow(ctx,
		`INSERT INTO withdrawals (organization_id, requester, item_name, status) VALUES ($1, $2, $3, 'pending') RETURNING id`,
		orgID, requester, item,
	).Scan(&id)
	return id, err
}

func (s *postgresStore) CreateRepair(ctx context.Context, orgID int64, assetNumber, note string) (int64, error) {
	if s.tabOpsEnabled(ctx) {
		var assetID int64
		_ = s.pool.QueryRow(ctx,
			`SELECT id FROM tab_asset WHERE organization_id = $1 AND asset_number = $2 AND deleted_at IS NULL LIMIT 1`,
			orgID, assetNumber,
		).Scan(&assetID)
		var id int64
		err := s.pool.QueryRow(ctx,
			`INSERT INTO tab_asset_repair (asset_id, note) VALUES ($1, $2) RETURNING id`,
			nullInt64(assetID), note,
		).Scan(&id)
		return id, err
	}
	var id int64
	err := s.pool.QueryRow(ctx,
		`INSERT INTO repairs (organization_id, asset_number, note, status) VALUES ($1, $2, $3, 'pending') RETURNING id`,
		orgID, assetNumber, note,
	).Scan(&id)
	return id, err
}

func (s *postgresStore) ListLOVGetBy(ctx context.Context) ([]Row, error) {
	rows, err := s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, NULL, NOW() FROM lov_get_by ORDER BY id`)
	if err != nil || len(rows) > 0 {
		return rows, err
	}
	return []Row{{ID: 1, Title: "จัดซื้อ"}, {ID: 2, Title: "บริจาค"}, {ID: 3, Title: "โอนย้าย"}}, nil
}

func (s *postgresStore) ListLOVSourceFund(ctx context.Context) ([]Row, error) {
	rows, err := s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, NULL, NOW() FROM lov_source_fund ORDER BY id`)
	if err != nil || len(rows) > 0 {
		return rows, err
	}
	return []Row{{ID: 1, Title: "งบประมาณแผ่นดิน"}, {ID: 2, Title: "รายได้"}}, nil
}

type AssetDoc struct {
	ID        int64  `json:"id"`
	AssetID   int64  `json:"assetID"`
	Name      string `json:"name"`
	URL       string `json:"url"`
	CreatedAt string `json:"createdAt,omitempty"`
}

func (s *postgresStore) ListAssetDocs(ctx context.Context, assetID int64) ([]AssetDoc, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, asset_id, COALESCE(name,''), COALESCE(file_url,''), created_at::text
		 FROM asset_docs WHERE asset_id = $1 ORDER BY id`,
		assetID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []AssetDoc
	for rows.Next() {
		var d AssetDoc
		if err := rows.Scan(&d.ID, &d.AssetID, &d.Name, &d.URL, &d.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *postgresStore) CreateAssetDoc(ctx context.Context, assetID int64, name, url string) (int64, error) {
	var id int64
	err := s.pool.QueryRow(ctx,
		`INSERT INTO asset_docs (asset_id, name, file_url) VALUES ($1, $2, $3) RETURNING id`,
		assetID, name, url,
	).Scan(&id)
	return id, err
}

func (s *postgresStore) DeleteAssetDoc(ctx context.Context, docID int64) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM asset_docs WHERE id = $1`, docID)
	return err
}

func (s *postgresStore) ListMenuNames(ctx context.Context) (map[int]string, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, menu_name FROM lov_menu ORDER BY id`)
	if err != nil {
		return map[int]string{1: "เอกสาร", 2: "เบิก/ยืม Pro", 3: "รายงานขั้นสูง"}, nil
	}
	defer rows.Close()
	out := make(map[int]string)
	for rows.Next() {
		var id int
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			return nil, err
		}
		out[id] = name
	}
	if len(out) == 0 {
		return map[int]string{1: "เอกสาร", 2: "เบิก/ยืม Pro", 3: "รายงานขั้นสูง"}, nil
	}
	return out, nil
}

func (s *postgresStore) OrgLimit(ctx context.Context, orgID int64, kind string) (int, error) {
	_ = ctx
	_ = orgID
	switch kind {
	case "user":
		return 100, nil
	case "officer":
		return 20, nil
	case "storage":
		return 1024, nil
	default:
		return 10000, nil
	}
}

func (s *postgresStore) ListProvinces(ctx context.Context) ([]Row, error) {
	rows, err := s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, NULL, NOW() FROM lov_province ORDER BY id`)
	if err != nil || len(rows) > 0 {
		return rows, err
	}
	return []Row{{ID: 1, Title: "กรุงเทพมหานคร"}, {ID: 2, Title: "เชียงใหม่"}}, nil
}

func (s *postgresStore) ListDistricts(ctx context.Context, provinceID int64) ([]Row, error) {
	if provinceID > 0 {
		return s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, province_id, NOW() FROM lov_district WHERE province_id = $1 ORDER BY id`, provinceID)
	}
	return s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, province_id, NOW() FROM lov_district ORDER BY id`)
}

func (s *postgresStore) ListSubdistricts(ctx context.Context, districtID int64) ([]Row, error) {
	if districtID > 0 {
		return s.listRowsPG(ctx, `SELECT id, name, NULL, NULL, district_id, NOW() FROM lov_subdistrict WHERE district_id = $1 ORDER BY id`, districtID)
	}
	return nil, fmt.Errorf("districtID required")
}
