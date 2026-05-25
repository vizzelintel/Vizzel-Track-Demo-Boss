"use client";

import { useState, useEffect } from "react";
import { getOrganizationDeptPosition } from "@/lib/organization";

export interface OrganizationLovItem {
  id: number;
  name: string;
  instituteID?: number | null;
}

export interface SectionLovItem {
  id: number;
  name: string;
  deptID: number;
}

export function useOrganizationSettings(organizationID?: number | null) {
  const [departments, setDepartments] = useState<OrganizationLovItem[]>([]);
  const [institutes, setInstitutes] = useState<OrganizationLovItem[]>([]);
  const [positions, setPositions] = useState<OrganizationLovItem[]>([]);
  const [sections, setSections] = useState<SectionLovItem[]>([]);
  const [isInstitute, setIsInstitute] = useState(false);
  const [isSection, setIsSection] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      if (!organizationID) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const res = await getOrganizationDeptPosition(organizationID);

        setDepartments(
          res.departments.map((d) => ({
            id: d.id,
            name: d.deptName,
            instituteID: d.instituteID,
          })),
        );
        setInstitutes(
          (res.institutes || []).map((i) => ({
            id: i.id,
            name: i.institute_name,
          })),
        );
        setPositions(
          res.positions.map((p) => ({
            id: p.id,
            name: p.positionName,
          })),
        );
        setSections(
          (res.sections || []).map((s) => ({
            id: s.id,
            name: s.section_name,
            deptID: s.deptID,
          })),
        );
        setIsInstitute(res.isInstitute ?? false);
        setIsSection(res.isSection ?? false);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "ไม่สามารถดึงรายการแผนก/ตำแหน่งได้";
        setError(message);
        setDepartments([]);
        setInstitutes([]);
        setPositions([]);
        setSections([]);
        setIsInstitute(false);
        setIsSection(false);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [organizationID]);

  return {
    departments,
    institutes,
    positions,
    sections,
    isInstitute,
    isSection,
    loading,
    error,
  };
}
