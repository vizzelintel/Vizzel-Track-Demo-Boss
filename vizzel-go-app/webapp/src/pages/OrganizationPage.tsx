import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  DoorOpen,
  LayoutGrid,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import { unwrapListRows } from "@/lib/list-response";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PageHeader, standardImportExportToolbar } from "@/components/layout/PageHeader";
import { KpiCard, KpiCardGrid } from "@/components/layout/KpiCard";

type Building = {
  id: number;
  title: string;
  createdAt?: string | null;
};

type Room = {
  id: number;
  title: string;
  subtitle?: string | null;
  parentId?: number | null;
  buildingID?: number | null;
  floor?: string | null;
  dept?: string | null;
};

export function OrganizationPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [createBuildingOpen, setCreateBuildingOpen] = useState(false);
  const [editBuildingId, setEditBuildingId] = useState<number | null>(null);
  const [buildingName, setBuildingName] = useState("");

  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [editRoomId, setEditRoomId] = useState<number | null>(null);
  const [roomName, setRoomName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [roomBuildingId, setRoomBuildingId] = useState<string>("");

  const [deleteTarget, setDeleteTarget] = useState<
    { kind: "building" | "room"; id: number; label: string } | null
  >(null);

  const loadBuildings = useCallback(async () => {
    try {
      const res = await apiRequest<unknown>("/api/v1/organization/buildings");
      const rows = unwrapListRows(res).map((r) => ({
        id: r.id,
        title: r.title,
        createdAt: r.createdAt ? String(r.createdAt) : null,
      }));
      setBuildings(rows);
      if (!selectedId && rows.length > 0) setSelectedId(rows[0].id);
    } catch {
      toast.error("โหลดรายการอาคารไม่สำเร็จ");
    }
  }, [selectedId]);

  const loadRooms = useCallback(async () => {
    try {
      const res = await apiRequest<unknown>("/api/v1/organization/rooms");
      const rows = unwrapListRows(res).map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: r.subtitle ?? null,
        parentId:
          typeof r.parent_id === "number"
            ? (r.parent_id as number)
            : r.parentId != null
              ? Number(r.parentId)
              : r.buildingID != null
                ? Number(r.buildingID)
                : null,
        buildingID:
          typeof r.buildingID === "number"
            ? (r.buildingID as number)
            : r.parent_id != null
              ? Number(r.parent_id)
              : null,
        floor: r.floor != null ? String(r.floor) : null,
        dept: r.dept != null ? String(r.dept) : null,
      }));
      setRooms(rows);
    } catch {
      toast.error("โหลดรายการห้องไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    loadBuildings();
    loadRooms();
  }, [loadBuildings, loadRooms]);

  const visibleBuildings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return buildings;
    return buildings.filter((b) => b.title.toLowerCase().includes(q));
  }, [buildings, search]);

  const selectedBuilding =
    buildings.find((b) => b.id === selectedId) ?? buildings[0] ?? null;

  const selectedRooms = useMemo(() => {
    if (!selectedBuilding) return [];
    return rooms.filter(
      (r) =>
        r.parentId === selectedBuilding.id ||
        r.buildingID === selectedBuilding.id,
    );
  }, [rooms, selectedBuilding]);

  const totalRoomsCount = rooms.length;
  const totalBuildingsCount = buildings.length;

  const openCreateBuilding = () => {
    setEditBuildingId(null);
    setBuildingName("");
    setCreateBuildingOpen(true);
  };
  const openEditBuilding = (b: Building) => {
    setEditBuildingId(b.id);
    setBuildingName(b.title);
    setCreateBuildingOpen(true);
  };

  const saveBuilding = async () => {
    try {
      if (editBuildingId) {
        await apiRequest(`/api/v1/entities/buildings/${editBuildingId}`, {
          method: "PATCH",
          body: JSON.stringify({ name: buildingName }),
        });
      } else {
        await apiRequest(`/api/v1/entities/buildings`, {
          method: "POST",
          body: JSON.stringify({ name: buildingName }),
        });
      }
      setCreateBuildingOpen(false);
      toast.success(editBuildingId ? "แก้ไขอาคารสำเร็จ" : "เพิ่มอาคารสำเร็จ");
      loadBuildings();
    } catch {
      toast.error("บันทึกอาคารไม่สำเร็จ");
    }
  };

  const openCreateRoom = () => {
    if (!selectedBuilding) {
      toast.info("กรุณาเลือกอาคารก่อน");
      return;
    }
    setEditRoomId(null);
    setRoomName("");
    setRoomNumber("");
    setRoomBuildingId(String(selectedBuilding.id));
    setCreateRoomOpen(true);
  };
  const openEditRoom = (r: Room) => {
    setEditRoomId(r.id);
    setRoomName(r.title);
    setRoomNumber(r.subtitle ?? "");
    setRoomBuildingId(String(r.parentId ?? r.buildingID ?? selectedBuilding?.id ?? ""));
    setCreateRoomOpen(true);
  };

  const saveRoom = async () => {
    try {
      const parent = Number(roomBuildingId);
      const payload = {
        name: roomName,
        number: roomNumber,
        parent_id: parent || 0,
      };
      if (editRoomId) {
        await apiRequest(`/api/v1/entities/rooms/${editRoomId}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(`/api/v1/entities/rooms`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setCreateRoomOpen(false);
      toast.success(editRoomId ? "แก้ไขห้องสำเร็จ" : "เพิ่มห้องสำเร็จ");
      loadRooms();
    } catch {
      toast.error("บันทึกห้องไม่สำเร็จ");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiRequest(
        `/api/v1/entities/${deleteTarget.kind === "building" ? "buildings" : "rooms"}/${deleteTarget.id}`,
        { method: "DELETE" },
      );
      toast.success("ลบสำเร็จ");
      setDeleteTarget(null);
      if (deleteTarget.kind === "building") {
        if (selectedId === deleteTarget.id) setSelectedId(null);
        loadBuildings();
      }
      loadRooms();
    } catch {
      toast.error("ลบไม่สำเร็จ");
    }
  };

  const handleTemplate = () => {
    const headers = "ชื่ออาคาร,ชื่อห้อง,หมายเลขห้อง,ชั้น\n";
    const blob = new Blob(["\ufeff" + headers], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "facility_template.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ดาวน์โหลดเทมเพลตสำเร็จ");
  };

  const handleImport = () => toast.info("ฟีเจอร์นำเข้าอาคาร/ห้องอยู่ระหว่างพัฒนา");

  const handleExport = () => {
    const headers = "ชื่ออาคาร,ชื่อห้อง,หมายเลขห้อง\n";
    const body = rooms
      .map((r) => {
        const bld =
          buildings.find((b) => b.id === (r.parentId ?? r.buildingID))?.title ??
          "";
        return [bld, r.title, r.subtitle ?? ""]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",");
      })
      .join("\n");
    const blob = new Blob(["\ufeff" + headers + body], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `facility_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ส่งออกข้อมูลสำเร็จ");
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="จัดการอาคาร"
        subtitle="บริหารจัดการอาคารและห้องภายในองค์กรของคุณ"
        icon={<Building2 className="h-5 w-5" />}
        toolbar={standardImportExportToolbar({
          onTemplate: handleTemplate,
          onImport: handleImport,
          onExport: handleExport,
          testIdPrefix: "facility",
        })}
        primaryAction={
          <Button onClick={openCreateBuilding} data-testid="facility-create-building">
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มอาคาร
          </Button>
        }
      />

      <KpiCardGrid cols={3}>
        <KpiCard
          label="อาคารทั้งหมด"
          value={totalBuildingsCount}
          icon={Building2}
          tone="blue"
          testId="facility-kpi-buildings"
        />
        <KpiCard
          label="ห้องทั้งหมด"
          value={totalRoomsCount}
          icon={DoorOpen}
          tone="emerald"
          testId="facility-kpi-rooms"
        />
        <KpiCard
          label="ระบบติดตาม"
          value={<span className="text-xl">Smart Asset</span>}
          hint="Organization & Facility"
          icon={LayoutGrid}
          tone="purple"
        />
      </KpiCardGrid>

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        {/* LEFT: building list */}
        <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm lg:w-96">
          <div className="border-b border-slate-100 p-4">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="ค้นหาอาคาร..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 rounded-lg pl-10"
                data-testid="facility-building-search"
              />
            </div>
          </div>
          <div className="min-h-[280px] flex-1 space-y-2 overflow-y-auto p-3">
            {visibleBuildings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-3 rounded-full bg-slate-50 p-4">
                  <Building2 className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm font-medium">ไม่พบอาคาร</p>
                <p className="text-muted-foreground max-w-[200px] text-xs">
                  ลองค้นหาด้วยคำอื่น หรือเพิ่มอาคารใหม่
                </p>
              </div>
            ) : (
              visibleBuildings.map((b) => {
                const isActive = b.id === selectedBuilding?.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    className={cn(
                      "group relative flex w-full flex-col items-start gap-1 overflow-hidden rounded-xl border p-3 text-left transition-all",
                      isActive
                        ? "border-primary/30 bg-primary/5 shadow-inner"
                        : "border-transparent bg-white hover:bg-slate-50 hover:shadow-sm",
                    )}
                    data-testid={`facility-building-${b.id}`}
                  >
                    {isActive && (
                      <span className="absolute top-0 bottom-0 left-0 w-1 bg-primary" />
                    )}
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        isActive ? "text-primary" : "text-slate-700",
                      )}
                    >
                      {b.title}
                    </span>
                    <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                      <CalendarDays className="h-3 w-3" />
                      {b.createdAt
                        ? new Date(b.createdAt).toLocaleDateString("th-TH")
                        : "—"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT: rooms grid */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {selectedBuilding ? (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 lg:p-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-md">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold text-slate-900">
                      {selectedBuilding.title}
                    </h2>
                    <p className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                      <MapPin className="h-3 w-3" />
                      {selectedRooms.length} ห้องในอาคารนี้
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => openEditBuilding(selectedBuilding)}
                    data-testid={`facility-edit-building-${selectedBuilding.id}`}
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" /> แก้ไขข้อมูล
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-slate-400 hover:bg-red-50 hover:text-red-600"
                    onClick={() =>
                      setDeleteTarget({
                        kind: "building",
                        id: selectedBuilding.id,
                        label: selectedBuilding.title,
                      })
                    }
                    data-testid={`facility-delete-building-${selectedBuilding.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={openCreateRoom}
                    data-testid="facility-create-room"
                  >
                    <Plus className="mr-2 h-4 w-4" /> เพิ่มห้อง
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-6">
                {selectedRooms.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-3 rounded-full bg-slate-50 p-4">
                      <DoorOpen className="h-6 w-6 text-slate-300" />
                    </div>
                    <p className="text-sm font-medium">ยังไม่มีห้องในอาคารนี้</p>
                    <p className="text-muted-foreground max-w-[280px] text-xs">
                      คลิก &quot;+ เพิ่มห้อง&quot; เพื่อสร้างห้องแรก
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {selectedRooms.map((r) => (
                      <div
                        key={r.id}
                        className="group flex flex-col gap-2 rounded-xl border border-slate-100 bg-white p-3 shadow-sm transition hover:border-primary/20 hover:shadow-md"
                        data-testid={`facility-room-${r.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="px-2 py-0">
                                {r.subtitle || "—"}
                              </Badge>
                              {r.floor && (
                                <span className="text-muted-foreground text-xs">
                                  ชั้น {r.floor}
                                </span>
                              )}
                            </div>
                            <p
                              className="mt-1 truncate text-sm font-medium"
                              title={r.title}
                            >
                              {r.title}
                            </p>
                            {r.dept && (
                              <Badge
                                variant="outline"
                                className="mt-1 text-[10px]"
                              >
                                {r.dept}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => openEditRoom(r)}
                              data-testid={`facility-edit-room-${r.id}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              onClick={() =>
                                setDeleteTarget({
                                  kind: "room",
                                  id: r.id,
                                  label: r.title,
                                })
                              }
                              data-testid={`facility-delete-room-${r.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
              <Building2 className="text-muted-foreground mb-3 h-8 w-8 opacity-40" />
              <p className="text-sm font-medium">ยังไม่มีอาคาร</p>
              <p className="text-muted-foreground text-xs">
                เพิ่มอาคารแรกเพื่อเริ่มจัดการพื้นที่
              </p>
              <Button
                className="mt-4"
                onClick={openCreateBuilding}
                data-testid="facility-create-building-empty"
              >
                <Plus className="mr-2 h-4 w-4" /> เพิ่มอาคารแรก
              </Button>
            </div>
          )}
        </main>
      </div>

      <Dialog open={createBuildingOpen} onOpenChange={setCreateBuildingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editBuildingId ? "แก้ไขอาคาร" : "เพิ่มอาคารใหม่"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="building-name">ชื่ออาคาร</Label>
            <Input
              id="building-name"
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateBuildingOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button type="button" onClick={saveBuilding}>
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createRoomOpen} onOpenChange={setCreateRoomOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editRoomId ? "แก้ไขห้อง" : "เพิ่มห้องใหม่"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>อาคาร</Label>
              <Select value={roomBuildingId} onValueChange={setRoomBuildingId}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกอาคาร" />
                </SelectTrigger>
                <SelectContent>
                  {buildings.map((b) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-name">ชื่อห้อง</Label>
              <Input
                id="room-name"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-number">เลขห้อง</Label>
              <Input
                id="room-number"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateRoomOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button type="button" onClick={saveRoom}>
              บันทึก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              ลบ{deleteTarget?.kind === "building" ? "อาคาร" : "ห้อง"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              ยืนยันการลบ &quot;{deleteTarget?.label}&quot;? การดำเนินการนี้ไม่สามารถกู้คืนได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
