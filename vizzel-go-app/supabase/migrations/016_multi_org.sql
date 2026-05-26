-- R6: Organization hierarchy for central admin view

ALTER TABLE tab_organization
    ADD COLUMN IF NOT EXISTS parent_organization_id BIGINT REFERENCES tab_organization(id);

CREATE INDEX IF NOT EXISTS idx_tab_organization_parent
    ON tab_organization (parent_organization_id)
    WHERE parent_organization_id IS NOT NULL AND deleted_at IS NULL;

-- Demo: org 1 is parent of org 2 when both exist
UPDATE tab_organization child
SET parent_organization_id = parent.id
FROM tab_organization parent
WHERE parent.id = 1
  AND child.id = 2
  AND child.parent_organization_id IS NULL
  AND EXISTS (SELECT 1 FROM tab_organization WHERE id = 1)
  AND EXISTS (SELECT 1 FROM tab_organization WHERE id = 2);
