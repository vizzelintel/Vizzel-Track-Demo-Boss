package store

// canActOnApprovalStep returns true when roleID may approve the given step.
// Lower role_id = higher privilege (1 super, 2 admin org, 3 officer, 4 member).
func CanActOnApprovalStep(roleID int64, stepKey string) bool {
	if roleID <= 0 || roleID >= 4 {
		return false
	}
	switch stepKey {
	case "section_head":
		return roleID <= 3
	case "director", "chief_admin", "mayor":
		return roleID <= 2
	default:
		return roleID <= 2
	}
}

func stepLabelFor(stepKey string) string {
	switch stepKey {
	case "section_head":
		return "หัวหน้างาน"
	case "director":
		return "ผู้อำนวยการ"
	case "chief_admin":
		return "เลขานุการ"
	case "mayor":
		return "นายก/ปลัด"
	default:
		return stepKey
	}
}
