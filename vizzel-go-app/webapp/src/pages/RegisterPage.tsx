import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { TEST_IDS } from "@/components/test-ids";

export function RegisterPage() {
  const { register, handleSubmit } = useForm();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const onSubmit = async (data: Record<string, string>) => {
    if (data.password !== data.confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน");
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password,
        }),
      });
      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (signInResult?.error) {
        setError("สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบด้วยตนเอง");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "อีเมลหรือชื่อผู้ใช้นี้ถูกใช้งานแล้ว");
      setSubmitting(false);
    }
  };

  return (
    <Card className="sm:bg-card w-full rounded-none border-none bg-transparent p-0 shadow-none sm:w-[380px] sm:rounded-2xl sm:border sm:p-6 sm:shadow-2xl">
      <CardHeader className="flex flex-col items-center text-center">
        <CardTitle className="text-2xl font-semibold">Create Your Account</CardTitle>
        <p className="text-muted-foreground mt-1 text-sm">
          เข้าร่วม <span className="text-primary font-medium">VizzelTrack</span> วันนี้
        </p>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          autoComplete="off"
          spellCheck="false"
          className="space-y-4"
          data-testid={TEST_IDS.REGISTER.FORM}
        >
          {error && (
            <Alert variant="destructive" className="bg-destructive/15 border-0">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="username">ชื่อผู้ใช้</Label>
            <Input {...register("username")} id="username" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input {...register("email")} id="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">รหัสผ่าน</Label>
            <div className="relative">
              <Input
                {...register("password")}
                id="password"
                type={showPassword ? "text" : "password"}
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
            <div className="relative">
              <Input
                {...register("confirmPassword")}
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                required
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <Button type="submit" disabled={submitting} className="mt-4 w-full">
            {submitting ? "กำลังสร้างบัญชี..." : "สมัครสมาชิก"}
          </Button>
          <p className="text-muted-foreground mt-4 text-center text-sm">
            มีบัญชีอยู่แล้ว?{" "}
            <Link to="/login" className="text-primary hover:underline">
              เข้าสู่ระบบ
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
