import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", display_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiRequest("/auth/register", { method: "POST", body: JSON.stringify(form) });
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "สมัครไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>สมัครสมาชิก</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Input placeholder="ชื่อที่แสดง" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
            <Input type="email" placeholder="อีเมล" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input type="password" placeholder="รหัสผ่าน (6+)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "กำลังสมัคร..." : "สมัคร"}
            </Button>
            <p className="text-center text-sm">
              มีบัญชีแล้ว? <Link to="/login" className="text-primary hover:underline">เข้าสู่ระบบ</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
