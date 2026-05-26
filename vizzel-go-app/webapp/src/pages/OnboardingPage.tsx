import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TEST_IDS } from "@/components/test-ids";

/** ลงทะเบียนองค์กรใหม่ — โครงหน้าเดียวกับ production (ฟอร์มเต็มต่อ API ภายหลัง) */
export function OnboardingPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-white p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>ลงทะเบียนองค์กร</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            ฟีเจอร์ลงทะเบียนองค์กรใหม่จะเปิดใช้งานเร็วๆ นี้
            หากคุณมีบัญชีแล้ว กรุณาเข้าสู่ระบบ
          </p>
          <div className="flex gap-2">
            <Button asChild data-testid={TEST_IDS.ONBOARDING.BUTTON_SUBMIT}>
              <Link to="/login">ไปหน้าเข้าสู่ระบบ</Link>
            </Button>
            <Button variant="outline" asChild data-testid={TEST_IDS.ONBOARDING.BUTTON_LOGOUT}>
              <Link to="/register">สร้างบัญชีผู้ใช้</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
