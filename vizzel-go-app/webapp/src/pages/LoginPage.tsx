import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { TEST_IDS } from "@/components/test-ids";
import { useAuth } from "@/context/AuthContext";

type LoginFormInputs = {
  email: string;
  password: string;
  remember: boolean;
};

export function LoginPage() {
  const { register, handleSubmit, setValue } = useForm<LoginFormInputs>({
    defaultValues: { remember: false },
  });

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { status } = useSession();
  const { login, logout, user } = useAuth();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shouldBlockRedirectRef = useRef(false);

  useEffect(() => {
    if (shouldBlockRedirectRef.current) return;
    if (isSubmittingRef.current) return;
    if ((status === "authenticated" || user) && !searchParams.get("reason")) {
      navigate("/dashboard", { replace: true });
    }
  }, [status, user, searchParams, navigate]);

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "session_conflict" || reason === "session_expired") {
      shouldBlockRedirectRef.current = true;
      if (reason === "session_conflict") {
        setError("มีการเข้าสู่ระบบจากอุปกรณ์อื่น");
      } else if (reason === "session_expired") {
        setError("เซสชั่นหมดอายุ กรุณาเข้าสู่ระบบใหม่");
      }
      if (user && !isSubmittingRef.current) {
        logout();
      }
    }
  }, [searchParams, user, logout]);

  const onSubmit = async (data: LoginFormInputs) => {
    if (isSubmittingRef.current) return;

    try {
      setError("");
      setIsSubmitting(true);
      isSubmittingRef.current = true;
      await login(data.email, data.password);
      shouldBlockRedirectRef.current = false;
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ";
      setError(message);
      setValue("password", "");
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <Card className="sm:bg-card w-full rounded-none border-none bg-transparent p-0 shadow-none sm:w-[380px] sm:rounded-2xl sm:border sm:p-6 sm:shadow-2xl">
      <CardHeader className="flex flex-col items-center text-center">
        <CardTitle className="text-2xl font-semibold">Welcome Back</CardTitle>
        <p className="text-muted-foreground mt-1 text-sm">
          ลงชื่อเข้าใช้เพื่อดำเนินการต่อ{" "}
          <span className="text-primary font-medium">VizzelTrack</span>
        </p>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          spellCheck="false"
          className="space-y-4"
          data-testid={TEST_IDS.LOGIN.FORM}
        >
          {error && (
            <Alert
              variant="destructive"
              className="bg-destructive/15 border-0"
              data-testid={TEST_IDS.LOGIN.ALERT_ERROR}
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              {...register("email")}
              id="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              data-testid={TEST_IDS.LOGIN.INPUT_EMAIL}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">รหัสผ่าน</Label>
            <div className="relative">
              <Input
                {...register("password")}
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                className="pr-10 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden"
                data-testid={TEST_IDS.LOGIN.INPUT_PASSWORD}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                data-testid={TEST_IDS.LOGIN.BUTTON_TOGGLE_PASSWORD}
              >
                {showPassword ? (
                  <EyeOff className="text-muted-foreground h-4 w-4" />
                ) : (
                  <Eye className="text-muted-foreground h-4 w-4" />
                )}
                <span className="sr-only">
                  {showPassword ? "Hide password" : "Show password"}
                </span>
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-muted-foreground flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                {...register("remember")}
                className="form-checkbox text-primary focus:ring-primary border-input h-4 w-4 rounded"
                data-testid={TEST_IDS.LOGIN.CHECKBOX_REMEMBER}
              />
              <span>จำชื่อผู้ใช้และรหัสผ่าน</span>
            </label>

            <Link
              to="/forgot-password"
              className="text-primary text-sm hover:underline"
              data-testid={TEST_IDS.LOGIN.LINK_FORGOT_PASSWORD}
            >
              ลืมรหัสผ่าน?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 w-full transition-all hover:scale-[1.02]"
            data-testid={TEST_IDS.LOGIN.BUTTON_SUBMIT}
          >
            {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background text-muted-foreground px-2">หรือ</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => toast.info("Google Login ยังไม่พร้อมใช้งาน")}
            className="w-full cursor-pointer transition-all hover:scale-[1.02]"
            data-testid={TEST_IDS.LOGIN.BUTTON_GOOGLE}
          >
            <svg
              className="mr-2 h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </Button>

          <p className="text-muted-foreground mt-4 text-center text-sm">
            หากคุณยังไม่มีบัญชี{" "}
            <Link
              to="/register"
              className="text-primary hover:underline"
              data-testid={TEST_IDS.LOGIN.LINK_REGISTER}
            >
              สร้างบัญชีใหม่
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
