package store

import "context"

func (s *sqliteStore) ListLOVGetBy(ctx context.Context) ([]Row, error) {
	return []Row{{ID: 1, Title: "จัดซื้อ"}, {ID: 2, Title: "บริจาค"}}, nil
}

func (s *sqliteStore) ListLOVSourceFund(ctx context.Context) ([]Row, error) {
	return []Row{{ID: 1, Title: "งบประมาณแผ่นดิน"}, {ID: 2, Title: "รายได้"}}, nil
}

func (s *sqliteStore) ListAssetDocs(ctx context.Context, assetID int64) ([]AssetDoc, error) {
	return nil, nil
}

func (s *sqliteStore) CreateAssetDoc(ctx context.Context, assetID int64, name, url string) (int64, error) {
	return 1, nil
}

func (s *sqliteStore) DeleteAssetDoc(ctx context.Context, docID int64) error {
	return nil
}

func (s *sqliteStore) CreateCheckJob(ctx context.Context, orgID int64, name string) (int64, error) {
	return s.EntityCreate(ctx, "audit_jobs", orgID, name, 0)
}

func (s *sqliteStore) UpdateCheckJob(ctx context.Context, orgID, jobID int64, status string, progress int) error {
	_, err := s.db.ExecContext(ctx, `UPDATE audit_jobs SET status = COALESCE(?, status), progress = ? WHERE id = ? AND organization_id = ?`, status, progress, jobID, orgID)
	return err
}

func (s *sqliteStore) DeleteCheckJob(ctx context.Context, orgID, jobID int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM audit_jobs WHERE id = ? AND organization_id = ?`, jobID, orgID)
	return err
}

func (s *sqliteStore) CreateWithdrawal(ctx context.Context, orgID int64, requester, item string, internal bool) (int64, error) {
	return s.EntityCreate(ctx, "withdrawals", orgID, requester+"|"+item, 0)
}

func (s *sqliteStore) CreateRepair(ctx context.Context, orgID int64, assetNumber, note string) (int64, error) {
	return s.EntityCreate(ctx, "repairs", orgID, assetNumber, 0)
}

func (s *sqliteStore) ListMenuNames(ctx context.Context) (map[int]string, error) {
	return map[int]string{1: "เอกสาร", 2: "เบิก/ยืม Pro", 3: "รายงานขั้นสูง"}, nil
}

func (s *sqliteStore) OrgLimit(ctx context.Context, orgID int64, kind string) (int, error) {
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

func (s *sqliteStore) ListProvinces(ctx context.Context) ([]Row, error) {
	return []Row{{ID: 1, Title: "กรุงเทพมหานคร"}}, nil
}

func (s *sqliteStore) ListDistricts(ctx context.Context, provinceID int64) ([]Row, error) {
	_ = provinceID
	return []Row{{ID: 1, Title: "เขตบางรัก"}}, nil
}

func (s *sqliteStore) ListSubdistricts(ctx context.Context, districtID int64) ([]Row, error) {
	_ = districtID
	return []Row{{ID: 1, Title: "แขวงสีลม"}}, nil
}
