-- Bootstrap admins/owners synced with verify=1 should be pre-approved.
UPDATE tab_user_organization_role
SET verify = 2, status = TRUE, updated_at = NOW()
WHERE role_id IN (1, 2) AND verify = 1 AND deleted_at IS NULL;
