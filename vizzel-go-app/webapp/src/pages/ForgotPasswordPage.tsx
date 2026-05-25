import { useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await apiRequest("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ลืมรหัสผ่าน</CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <p className="text-muted-foreground text-sm">ส่งลิงก์รีเซ็ตแล้ว (Demo)</p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-3">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="อีเมล" required />
              <Button type="submit" className="w-full">
                ส่งลิงก์รีเซ็ต
              </Button>
            </form>
          )}
          <Link to="/login" className="text-primary mt-4 inline-block text-sm hover:underline">
            กลับเข้าสู่ระบบ
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
