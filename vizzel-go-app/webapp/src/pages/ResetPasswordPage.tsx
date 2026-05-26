import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TEST_IDS } from "@/components/test-ids";

export function ResetPasswordPage() {
  const { register, handleSubmit } = useForm<{ password: string; confirm: string }>();

  const onSubmit = () => {
    /* API stub — production uses token from email link */
  };

  return (
    <Card className="sm:bg-card w-full sm:w-[380px] sm:rounded-2xl sm:border sm:p-6 sm:shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle>ตั้งรหัสผ่านใหม่</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          data-testid={TEST_IDS.RESET_PASSWORD.FORM}
        >
          <div className="space-y-2">
            <Label htmlFor="password">รหัสผ่านใหม่</Label>
            <Input id="password" type="password" {...register("password")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">ยืนยันรหัสผ่าน</Label>
            <Input id="confirm" type="password" {...register("confirm")} required />
          </div>
          <Button type="submit" className="w-full" data-testid={TEST_IDS.RESET_PASSWORD.BUTTON_SUBMIT}>
            บันทึกรหัสผ่าน
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            <Link to="/login" className="text-primary hover:underline">
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
