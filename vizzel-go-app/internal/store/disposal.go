package store

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type DisposalLot struct {
	ID                 int64    `json:"id"`
	OrganizationID     int64    `json:"organizationId"`
	Lot                string   `json:"lot"`
	Reason             string   `json:"reason,omitempty"`
	DisposalDate       string   `json:"disposalDate,omitempty"`
	Buyer              string   `json:"buyer,omitempty"`
	Amount             float64  `json:"amount,omitempty"`
	Status             string   `json:"status"`
	AssetCount         int      `json:"assetCount"`
	ApprovalInstanceID int64    `json:"approvalInstanceId,omitempty"`
	RequestedBy        int64    `json:"requestedBy,omitempty"`
	CreatedAt          string   `json:"createdAt"`
	Docs               []DisposalDoc `json:"docs,omitempty"`
	SampleAssets       []DisposalAssetSummary `json:"sampleAssets,omitempty"`
}

type DisposalDoc struct {
	ID       int64  `json:"id"`
	DocPath  string `json:"docPath"`
	DocName  string `json:"docName,omitempty"`
	DocType  string `json:"docType,omitempty"`
	Filesize int64  `json:"filesize,omitempty"`
}

type DisposalAssetSummary struct {
	ID          int64  `json:"id"`
	AssetNumber string `json:"assetNumber"`
	AssetName   string `json:"assetName"`
}

type DisposalLotInput struct {
	Lot          string
	Reason       string
	DisposalDate *time.Time
	Buyer        string
	Amount       float64
	AssetIDs     []int64
	AssetNumbers []string
	RequestedBy  int64
	Docs         []DisposalDocInput
}

type DisposalDocInput struct {
	Path     string
	Name     string
	Type     string
	Filesize int64
}

func (s *postgresStore) disposalEnabled(ctx context.Context) bool {
	return s.tabOpsEnabled(ctx)
}

func (s *postgresStore) ListDisposalLots(ctx context.Context, orgID int64) ([]DisposalLot, error) {
	if !s.disposalEnabled(ctx) {
		return nil, nil
	}
	rows, err := s.pool.Query(ctx,
		`SELECT id, organization_id, lot, COALESCE(reason,''), disposal_date,
		        COALESCE(buyer,''), COALESCE(amount,0), status, asset_count,
		        COALESCE(approval_instance_id,0), COALESCE(requested_by,0), created_at
		 FROM tab_disposal_lot
		 WHERE organization_id = $1 AND deleted_at IS NULL
		 ORDER BY created_at DESC`,
		orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []DisposalLot
	for rows.Next() {
		var lot DisposalLot
		var dispDate *time.Time
		var created time.Time
		if err := rows.Scan(
			&lot.ID, &lot.OrganizationID, &lot.Lot, &lot.Reason, &dispDate,
			&lot.Buyer, &lot.Amount, &lot.Status, &lot.AssetCount,
			&lot.ApprovalInstanceID, &lot.RequestedBy, &created,
		); err != nil {
			return nil, err
		}
		if dispDate != nil {
			lot.DisposalDate = dispDate.Format("2006-01-02")
		}
		lot.CreatedAt = created.Format(time.RFC3339)
		lot.SampleAssets, _ = s.disposalSampleAssets(ctx, lot.ID, 3)
		out = append(out, lot)
	}
	return out, rows.Err()
}

func (s *postgresStore) disposalSampleAssets(ctx context.Context, lotID int64, limit int) ([]DisposalAssetSummary, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT a.id, a.asset_number, COALESCE(a.asset_name,'')
		 FROM tab_disposal_lot_item i
		 JOIN tab_asset a ON a.id = i.asset_id
		 WHERE i.lot_id = $1
		 ORDER BY a.asset_number
		 LIMIT $2`,
		lotID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []DisposalAssetSummary
	for rows.Next() {
		var a DisposalAssetSummary
		if err := rows.Scan(&a.ID, &a.AssetNumber, &a.AssetName); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

func (s *postgresStore) GetDisposalLot(ctx context.Context, orgID, lotID int64) (*DisposalLot, error) {
	if !s.disposalEnabled(ctx) {
		return nil, fmt.Errorf("disposal not available")
	}
	var lot DisposalLot
	var dispDate *time.Time
	var created time.Time
	err := s.pool.QueryRow(ctx,
		`SELECT id, organization_id, lot, COALESCE(reason,''), disposal_date,
		        COALESCE(buyer,''), COALESCE(amount,0), status, asset_count,
		        COALESCE(approval_instance_id,0), COALESCE(requested_by,0), created_at
		 FROM tab_disposal_lot
		 WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL`,
		lotID, orgID,
	).Scan(
		&lot.ID, &lot.OrganizationID, &lot.Lot, &lot.Reason, &dispDate,
		&lot.Buyer, &lot.Amount, &lot.Status, &lot.AssetCount,
		&lot.ApprovalInstanceID, &lot.RequestedBy, &created,
	)
	if err != nil {
		return nil, fmt.Errorf("ไม่พบ LOT จำหน่าย")
	}
	if dispDate != nil {
		lot.DisposalDate = dispDate.Format("2006-01-02")
	}
	lot.CreatedAt = created.Format(time.RFC3339)
	lot.SampleAssets, _ = s.disposalSampleAssets(ctx, lot.ID, 500)
	lot.Docs, _ = s.listDisposalDocs(ctx, lot.ID)
	return &lot, nil
}

func (s *postgresStore) listDisposalDocs(ctx context.Context, lotID int64) ([]DisposalDoc, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, doc_path, COALESCE(doc_name,''), COALESCE(doc_type,''), COALESCE(filesize,0)
		 FROM tab_disposal_lot_doc WHERE lot_id = $1 ORDER BY id`,
		lotID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []DisposalDoc
	for rows.Next() {
		var d DisposalDoc
		if err := rows.Scan(&d.ID, &d.DocPath, &d.DocName, &d.DocType, &d.Filesize); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *postgresStore) resolveAssetIDs(ctx context.Context, orgID int64, ids []int64, numbers []string) ([]int64, error) {
	seen := map[int64]struct{}{}
	var out []int64
	for _, id := range ids {
		if id <= 0 {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		var org int64
		err := s.pool.QueryRow(ctx,
			`SELECT organization_id FROM tab_asset WHERE id = $1 AND deleted_at IS NULL`,
			id,
		).Scan(&org)
		if err != nil || org != orgID {
			return nil, fmt.Errorf("ครุภัณฑ์ id %d ไม่อยู่ในหน่วยงาน", id)
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	for _, num := range numbers {
		num = strings.TrimSpace(num)
		if num == "" {
			continue
		}
		var id, org int64
		err := s.pool.QueryRow(ctx,
			`SELECT id, organization_id FROM tab_asset WHERE asset_number = $1 AND deleted_at IS NULL`,
			num,
		).Scan(&id, &org)
		if err != nil {
			return nil, fmt.Errorf("ไม่พบเลขครุภัณฑ์: %s", num)
		}
		if org != orgID {
			return nil, fmt.Errorf("ครุภัณฑ์ %s ไม่อยู่ในหน่วยงาน", num)
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		out = append(out, id)
	}
	if len(out) == 0 {
		return nil, fmt.Errorf("ต้องระบุครุภัณฑ์อย่างน้อย 1 รายการ")
	}
	return out, nil
}

func (s *postgresStore) generateDisposalLot(ctx context.Context, orgID int64) (string, error) {
	var n int
	_ = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM tab_disposal_lot WHERE organization_id = $1`,
		orgID,
	).Scan(&n)
	return fmt.Sprintf("OUT-%d-%d", orgID, time.Now().Unix()), nil
}

func (s *postgresStore) CreateDisposalLot(ctx context.Context, orgID int64, in DisposalLotInput) (int64, error) {
	if !s.disposalEnabled(ctx) {
		return 0, fmt.Errorf("disposal not available")
	}
	assetIDs, err := s.resolveAssetIDs(ctx, orgID, in.AssetIDs, in.AssetNumbers)
	if err != nil {
		return 0, err
	}
	lotNo := strings.TrimSpace(in.Lot)
	if lotNo == "" {
		lotNo, _ = s.generateDisposalLot(ctx, orgID)
	}
	var id int64
	err = s.pool.QueryRow(ctx,
		`INSERT INTO tab_disposal_lot (
			organization_id, lot, reason, disposal_date, buyer, amount,
			status, requested_by, asset_count, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, NOW())
		RETURNING id`,
		orgID, lotNo, nullStr(in.Reason), in.DisposalDate, nullStr(in.Buyer),
		in.Amount, nullInt64(in.RequestedBy), len(assetIDs),
	).Scan(&id)
	if err != nil {
		if strings.Contains(err.Error(), "unique") {
			return 0, fmt.Errorf("LOT %s ซ้ำในหน่วยงานนี้", lotNo)
		}
		return 0, err
	}
	if err := s.insertDisposalItems(ctx, id, assetIDs); err != nil {
		return 0, err
	}
	for _, doc := range in.Docs {
		_, _ = s.pool.Exec(ctx,
			`INSERT INTO tab_disposal_lot_doc (lot_id, doc_path, doc_name, doc_type, filesize, organization_id, created_by)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			id, doc.Path, doc.Name, doc.Type, doc.Filesize, orgID, nullInt64(in.RequestedBy),
		)
	}
	return id, nil
}

func (s *postgresStore) insertDisposalItems(ctx context.Context, lotID int64, assetIDs []int64) error {
	for _, aid := range assetIDs {
		_, err := s.pool.Exec(ctx,
			`INSERT INTO tab_disposal_lot_item (lot_id, asset_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
			lotID, aid,
		)
		if err != nil {
			return err
		}
	}
	_, err := s.pool.Exec(ctx,
		`UPDATE tab_disposal_lot SET asset_count = (SELECT COUNT(*) FROM tab_disposal_lot_item WHERE lot_id = $1), updated_at = NOW() WHERE id = $1`,
		lotID,
	)
	return err
}

func (s *postgresStore) SubmitDisposalForApproval(ctx context.Context, orgID, lotID, userID int64, stepAssignees map[string]int64) error {
	if err := validateStepAssigneesNotRequester(userID, stepAssignees); err != nil {
		return err
	}
	instID, err := s.createApprovalInstanceWithAssignees(ctx, orgID, "disposal", "disposal", lotID, userID, stepAssignees)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx,
		`UPDATE tab_disposal_lot SET status = 'pending_approval', approval_instance_id = $2, updated_at = NOW() WHERE id = $1 AND organization_id = $3`,
		lotID, instID, orgID,
	)
	return err
}

func validateStepAssigneesNotRequester(requesterID int64, assignees map[string]int64) error {
	for step, uid := range assignees {
		if uid > 0 && uid == requesterID {
			return fmt.Errorf("ผู้ตั้งเรื่องต้องไม่ใช่ผู้อนุมัติขั้น %s", step)
		}
	}
	return nil
}

func (s *postgresStore) finalizeDisposalLot(ctx context.Context, lotID int64, approved bool) error {
	status := "rejected"
	if approved {
		status = "approved"
	}
	_, err := s.pool.Exec(ctx,
		`UPDATE tab_disposal_lot SET status = $2, updated_at = NOW() WHERE id = $1`,
		lotID, status,
	)
	if err != nil || !approved {
		return err
	}
	_, err = s.pool.Exec(ctx,
		`UPDATE tab_asset a SET asset_status_id = 3, updated_at = NOW()
		 FROM tab_disposal_lot_item i
		 WHERE i.lot_id = $1 AND i.asset_id = a.id`,
		lotID,
	)
	return err
}

func ParseAssetNumbersFromCSV(content string) []string {
	lines := strings.Split(content, "\n")
	var out []string
	header := false
	for i, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		cols := strings.Split(line, ",")
		val := strings.Trim(strings.TrimSpace(cols[0]), `"'`)
		if i == 0 && !header {
			lower := strings.ToLower(val)
			if strings.Contains(lower, "asset") || strings.Contains(val, "เลข") || strings.Contains(val, "รหัส") {
				header = true
				continue
			}
		}
		if val != "" {
			out = append(out, val)
		}
	}
	return out
}
