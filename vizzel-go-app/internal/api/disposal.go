package api

import (
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/vizzelintel/vizzel-track-demo-boss/vizzel-go-app/internal/store"
)

func (h *Handler) ListDisposalLots(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	list, err := h.store.ListDisposalLots(r.Context(), claims.OrganizationID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "list failed")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": list, "total": len(list)})
}

func (h *Handler) GetDisposalLot(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	lot, err := h.store.GetDisposalLot(r.Context(), claims.OrganizationID, id)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": lot})
}

func (h *Handler) CreateDisposalLot(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	in, submit, stepAssignees, err := h.parseDisposalRequest(r, claims.UserID)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	id, err := h.store.CreateDisposalLot(r.Context(), claims.OrganizationID, in)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if submit {
		if err := h.store.SubmitDisposalForApproval(r.Context(), claims.OrganizationID, id, claims.UserID, stepAssignees); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		h.dispatchApprovalSubmitted(r, claims, "disposal", id)
	}
	writeJSON(w, http.StatusOK, map[string]any{"data": map[string]int64{"id": id}})
}

func (h *Handler) DisposalSubmitApproval(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	id, _ := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	var body struct {
		StepAssignees map[string]int64 `json:"stepAssignees"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if err := h.store.SubmitDisposalForApproval(r.Context(), claims.OrganizationID, id, claims.UserID, body.StepAssignees); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	h.dispatchApprovalSubmitted(r, claims, "disposal", id)
	writeJSON(w, http.StatusOK, map[string]string{"status": "pending_approval"})
}

func (h *Handler) DisposalImport(w http.ResponseWriter, r *http.Request) {
	claims, ok := claimsFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "invalid form")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "ต้องแนบไฟล์ CSV")
		return
	}
	defer file.Close()
	data, _ := io.ReadAll(file)
	numbers := store.ParseAssetNumbersFromCSV(string(data))
	if len(numbers) == 0 {
		writeError(w, http.StatusBadRequest, "ไม่พบเลขครุภัณฑ์ในไฟล์")
		return
	}
	in, submit, stepAssignees, _ := h.parseDisposalFormFields(r, claims.UserID)
	in.AssetNumbers = numbers
	if lot := r.FormValue("lot"); lot != "" {
		in.Lot = lot
	}
	id, err := h.store.CreateDisposalLot(r.Context(), claims.OrganizationID, in)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	if submit {
		_ = h.store.SubmitDisposalForApproval(r.Context(), claims.OrganizationID, id, claims.UserID, stepAssignees)
		h.dispatchApprovalSubmitted(r, claims, "disposal", id)
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"data": map[string]any{"id": id, "imported": len(numbers)},
	})
}

func (h *Handler) DisposalTemplate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="sales_import_template.csv"`)
	// Match the canonical sales_import_template (1).csv: a single
	// `assetNumber` column plus a handful of sample IDs.
	body := "\ufeffassetNumber\nAST-0001\nAST-0002\nAST-0003\n"
	_, _ = w.Write([]byte(body))
}

func (h *Handler) ServeDisposalDoc(w http.ResponseWriter, r *http.Request) {
	name := filepath.Base(chi.URLParam(r, "name"))
	if name == "" || strings.Contains(name, "..") {
		http.NotFound(w, r)
		return
	}
	path := filepath.Join("uploads", "disposal_doc", name)
	data, err := os.ReadFile(path)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	ct := mime.TypeByExtension(filepath.Ext(name))
	if ct == "" {
		ct = "application/octet-stream"
	}
	w.Header().Set("Content-Type", ct)
	_, _ = w.Write(data)
}

// NestJS-compatible aliases
func (h *Handler) AssetOutList(w http.ResponseWriter, r *http.Request) {
	h.ListDisposalLots(w, r)
}

func (h *Handler) AssetOutCreate(w http.ResponseWriter, r *http.Request) {
	h.CreateDisposalLot(w, r)
}

func (h *Handler) AssetOutImport(w http.ResponseWriter, r *http.Request) {
	h.DisposalImport(w, r)
}

func (h *Handler) AssetOutTemplate(w http.ResponseWriter, r *http.Request) {
	h.DisposalTemplate(w, r)
}

func (h *Handler) parseDisposalRequest(r *http.Request, userID int64) (store.DisposalLotInput, bool, map[string]int64, error) {
	ct := r.Header.Get("Content-Type")
	if strings.HasPrefix(ct, "multipart/form-data") {
		if err := r.ParseMultipartForm(64 << 20); err != nil {
			return store.DisposalLotInput{}, false, nil, err
		}
		in, submit, assignees, err := h.parseDisposalFormFields(r, userID)
		if err != nil {
			return in, false, nil, err
		}
		docs, err := h.saveDisposalUploads(r, userID)
		if err != nil {
			return in, false, nil, err
		}
		in.Docs = docs
		if ids := r.FormValue("assetIds"); ids != "" {
			var assetIDs []int64
			_ = json.Unmarshal([]byte(ids), &assetIDs)
			in.AssetIDs = assetIDs
		}
		if nums := r.FormValue("assetNumbers"); nums != "" {
			var numbers []string
			_ = json.Unmarshal([]byte(nums), &numbers)
			in.AssetNumbers = numbers
		}
		return in, submit, assignees, nil
	}
	var body struct {
		Lot           string            `json:"lot"`
		Reason        string            `json:"reason"`
		DisposalDate  string            `json:"disposalDate"`
		Buyer         string            `json:"buyer"`
		Amount        float64           `json:"amount"`
		AssetIDs      []int64           `json:"assetIds"`
		AssetNumbers  []string          `json:"assetNumbers"`
		Submit        bool              `json:"submit"`
		StepAssignees map[string]int64  `json:"stepAssignees"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		return store.DisposalLotInput{}, false, nil, err
	}
	in := store.DisposalLotInput{
		Lot:          body.Lot,
		Reason:       body.Reason,
		Buyer:        body.Buyer,
		Amount:       body.Amount,
		AssetIDs:     body.AssetIDs,
		AssetNumbers: body.AssetNumbers,
		RequestedBy:  userID,
	}
	if body.DisposalDate != "" {
		if t, err := time.Parse("2006-01-02", body.DisposalDate); err == nil {
			in.DisposalDate = &t
		}
	}
	return in, body.Submit, body.StepAssignees, nil
}

func (h *Handler) parseDisposalFormFields(r *http.Request, userID int64) (store.DisposalLotInput, bool, map[string]int64, error) {
	in := store.DisposalLotInput{
		Lot:         r.FormValue("lot"),
		Reason:      r.FormValue("reason"),
		Buyer:       r.FormValue("buyer"),
		RequestedBy: userID,
	}
	if v := r.FormValue("amount"); v != "" {
		in.Amount, _ = strconv.ParseFloat(v, 64)
	}
	if d := r.FormValue("disposalDate"); d != "" {
		if t, err := time.Parse("2006-01-02", d); err == nil {
			in.DisposalDate = &t
		}
	}
	submit := r.FormValue("submit") == "true" || r.FormValue("submit") == "1"
	var assignees map[string]int64
	if s := r.FormValue("stepAssignees"); s != "" {
		_ = json.Unmarshal([]byte(s), &assignees)
	}
	return in, submit, assignees, nil
}

func (h *Handler) saveDisposalUploads(r *http.Request, userID int64) ([]store.DisposalDocInput, error) {
	dir := filepath.Join("uploads", "disposal_doc")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	var docs []store.DisposalDocInput
	if r.MultipartForm == nil {
		return docs, nil
	}
	for _, fh := range r.MultipartForm.File["docs"] {
		ext := strings.ToLower(filepath.Ext(fh.Filename))
		if ext != ".pdf" {
			return nil, fmt.Errorf("รองรับเฉพาะไฟล์ PDF")
		}
		f, err := fh.Open()
		if err != nil {
			continue
		}
		data, _ := io.ReadAll(f)
		_ = f.Close()
		name := fmt.Sprintf("%d-%d%s", userID, time.Now().UnixNano(), ext)
		path := filepath.Join(dir, name)
		if err := os.WriteFile(path, data, 0o644); err != nil {
			return nil, err
		}
		docs = append(docs, store.DisposalDocInput{
			Path:     filepath.ToSlash(filepath.Join("uploads", "disposal_doc", name)),
			Name:     fh.Filename,
			Type:     ext,
			Filesize: int64(len(data)),
		})
	}
	return docs, nil
}
