import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TEST_IDS } from "@/components/test-ids";

export function VerifyEmailPage() {
  return (
    <Card className="sm:bg-card w-full sm:w-[380px] sm:rounded-2xl sm:border sm:p-6 sm:shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle>ยืนยันอีเมล</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-muted-foreground text-sm">
          กรุณาตรวจสอบอีเมลของคุณและคลิกลิงก์ยืนยัน
        </p>
        <Button variant="outline" data-testid={TEST_IDS.VERIFY_EMAIL.BUTTON_RESEND}>
          ส่งอีเมลอีกครั้ง
        </Button>
        <Button asChild variant="link" data-testid={TEST_IDS.VERIFY_EMAIL.LINK_BACK_LOGIN}>
          <Link to="/login">กลับไปหน้าเข้าสู่ระบบ</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
