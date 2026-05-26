"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createTransfer,
  listTransferTargets,
  listTransfers,
  type OrgTarget,
  type TransferRecord,
} from "@/lib/transfer";
import { apiRequest } from "@/lib/api";
import { fetchOrganizationUsers } from "@/lib/user";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  StepApproverFields,
  validateStepAssignees,
  type StepAssignees,
} from "@/components/approval/step-approver-fields";

type BuildingRow = { id: number; buildingName?: string; name?: string };
type RoomRow = { id: number; roomName?: string; name?: string; buildingID?: number; building_id?: number };
type OrgUserRow = {
  user?: { id?: number; name?: string; surname?: string; email?: string };
  userID?: number;
};

function userLabel(u: OrgUserRow) {
  const name = [u.user?.name, u.user?.surname].filter(Boolean).join(" ").trim();
  return name || u.user?.email || String(u.user?.id ?? u.userID ?? "");
}

export function TransferPage() {
  const { user } = useUser();
  const orgID = user?.organizationRelation?.organizationID;
  const [rows, setRows] = useState<TransferRecord[]>([]);
  const [targets, setTargets] = useState<OrgTarget[]>([]);
  const [assets, setAssets] = useState<{ id: number; assetNumber: string; assetName: string }[]>([]);
  const [buildings, setBuildings] = useState<BuildingRow[]>([]);
  const [allRooms, setAllRooms] = useState<RoomRow[]>([]);
  const [orgUsers, setOrgUsers] = useState<OrgUserRow[]>([]);
  const [assetId, setAssetId] = useState("");
  const [targetOrgId, setTargetOrgId] = useState("");
  const [toUserId, setToUserId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [transferType, setTransferType] = useState<"temporary" | "permanent">("temporary");
  const [reason, setReason] = useState("");
  const [stepAssignees, setStepAssignees] = useState<StepAssignees>({});

  const effectiveTargetOrgId = useMemo(() => {
    if (targetOrgId) return Number(targetOrgId);
    return orgID ?? null;
  }, [targetOrgId, orgID]);

  const filteredRooms = useMemo(() => {
    if (!buildingId) return allRooms;
    const bid = Number(buildingId);
    return allRooms.filter(
      (r) => (r.buildingID ?? r.building_id) === bid,
    );
  }, [allRooms, buildingId]);

  const load = useCallback(async () => {
    try {
      setRows(await listTransfers());
    } catch {
      toast.error("โหลดรายการโอนไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    load();
    listTransferTargets().then(setTargets).catch(() => setTargets([]));
  }, [load]);

  useEffect(() => {
    if (!orgID) return;
    apiRequest(`/withdrawal/asset/list?organizationID=${orgID}`)
      .then((res: unknown) => {
        const list = Array.isArray(res) ? res : (res as { data?: unknown[] })?.data ?? [];
        setAssets(
          (list as { id: number; assetNumber?: string; asset_number?: string; assetName?: string; asset_name?: string }[]).map(
            (a) => ({
              id: a.id,
              assetNumber: a.assetNumber ?? a.asset_number ?? "",
              assetName: a.assetName ?? a.asset_name ?? "",
            }),
          ),
        );
      })
      .catch(() => {});
  }, [orgID]);

  useEffect(() => {
    if (!effectiveTargetOrgId) return;
    setToUserId("");
    setBuildingId("");
    setRoomId("");
    Promise.all([
      apiRequest<BuildingRow[]>(`/facility/building/get/${effectiveTargetOrgId}`).catch(() => []),
      apiRequest<RoomRow[]>(`/facility/room/get?organizationID=${effectiveTargetOrgId}`).catch(() => []),
      fetchOrganizationUsers(effectiveTargetOrgId, 1, 200, 2).catch(() => ({ data: [] })),
    ]).then(([blds, rms, usersRes]) => {
      setBuildings(Array.isArray(blds) ? blds : []);
      setAllRooms(Array.isArray(rms) ? rms : []);
      setOrgUsers((usersRes as { data?: OrgUserRow[] })?.data ?? []);
    });
  }, [effectiveTargetOrgId]);

  const submit = async () => {
    if (!assetId) {
      toast.error("เลือกครุภัณฑ์");
      return;
    }
    if (!toUserId) {
      toast.error("เลือกผู้รับปลายทาง");
      return;
    }
    if (!buildingId || !roomId) {
      toast.error("เลือกอาคารและห้องปลายทาง");
      return;
    }
    const assigneeErr = validateStepAssignees(stepAssignees);
    if (assigneeErr) {
      toast.error(assigneeErr);
      return;
    }
    try {
      await createTransfer({
        assetId: Number(assetId),
        transferType,
        targetOrganizationId: targetOrgId ? Number(targetOrgId) : undefined,
        toUserId: Number(toUserId),
        targetBuildingId: Number(buildingId),
        targetRoomId: Number(roomId),
        reason,
        submit: true,
        stepAssignees,
      });
      toast.success("ส่งคำขอโอนเพื่ออนุมัติแล้ว");
      setReason("");
      setAssetId("");
      setTargetOrgId("");
      setToUserId("");
      setBuildingId("");
      setRoomId("");
      load();
    } catch {
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  const outgoing = rows.filter((r) => r.direction !== "incoming");

  const locationLabel = (r: TransferRecord) =>
    [r.toUserName, r.targetBuildingName, r.targetRoomName].filter(Boolean).join(" · ");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">ทำรายการโอนย้าย</h1>
        <p className="text-muted-foreground text-sm">
          ระบุผู้รับและสถานที่ปลายทาง — หน่วยปลายทางต้องกดรับเมื่ออนุมัติแล้ว
        </p>
      </div>

      <div className="grid max-w-lg gap-4 rounded-lg border p-4">
        <div className="space-y-2">
          <Label>ครุภัณฑ์</Label>
          <Select value={assetId} onValueChange={setAssetId}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกครุภัณฑ์" />
            </SelectTrigger>
            <SelectContent>
              {assets.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.assetNumber} — {a.assetName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {targets.length > 0 && (
          <div className="space-y-2">
            <Label>หน่วยงานปลายทาง (ข้าม org)</Label>
            <Select value={targetOrgId || "_self"} onValueChange={(v) => setTargetOrgId(v === "_self" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="ภายในหน่วยงานเดียวกัน" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_self">ภายในหน่วยงานเดียวกัน</SelectItem>
                {targets.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label>คนรับปลายทาง</Label>
          <Select value={toUserId} onValueChange={setToUserId}>
            <SelectTrigger>
              <SelectValue placeholder="เลือกผู้รับ" />
            </SelectTrigger>
            <SelectContent>
              {orgUsers.map((u) => {
                const id = u.user?.id ?? u.userID;
                if (!id) return null;
                return (
                  <SelectItem key={id} value={String(id)}>
                    {userLabel(u)}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>อาคารปลายทาง</Label>
          <Select
            value={buildingId}
            onValueChange={(v) => {
              setBuildingId(v);
              setRoomId("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="เลือกอาคาร" />
            </SelectTrigger>
            <SelectContent>
              {buildings.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>
                  {b.buildingName ?? b.name ?? b.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>ห้องปลายทาง</Label>
          <Select value={roomId} onValueChange={setRoomId} disabled={!buildingId}>
            <SelectTrigger>
              <SelectValue placeholder={buildingId ? "เลือกห้อง" : "เลือกอาคารก่อน"} />
            </SelectTrigger>
            <SelectContent>
              {filteredRooms.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>
                  {r.roomName ?? r.name ?? r.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>ประเภท</Label>
          <Select value={transferType} onValueChange={(v) => setTransferType(v as "temporary" | "permanent")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="temporary">ชั่วคราว</SelectItem>
              <SelectItem value="permanent">ถาวร (ย้าย ownership เมื่อปลายทางรับ)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>เหตุผล</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <StepApproverFields
          organizationID={orgID}
          value={stepAssignees}
          onChange={setStepAssignees}
        />
        <Button onClick={submit}>ส่งอนุมัติ</Button>
      </div>

      <div>
        <h2 className="mb-2 font-semibold">รายการส่งออก</h2>
        <ul className="divide-y rounded-lg border">
          {outgoing.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 p-3 text-sm">
              <div>
                <span>
                  {r.assetNumber ?? r.assetId} · {r.transferType === "permanent" ? "ถาวร" : "ชั่วคราว"}
                  {r.targetOrganizationId ? ` → org ${r.targetOrganizationId}` : ""}
                </span>
                {locationLabel(r) && (
                  <p className="text-muted-foreground text-xs">{locationLabel(r)}</p>
                )}
              </div>
              <Badge variant="outline">{r.status}</Badge>
            </li>
          ))}
          {outgoing.length === 0 && (
            <li className="text-muted-foreground p-3 text-sm">ยังไม่มีรายการ</li>
          )}
        </ul>
      </div>
    </div>
  );
}
