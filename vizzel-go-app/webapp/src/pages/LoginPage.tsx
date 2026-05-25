import { useForm } from "react-hook-form";
import { useSearchParams } from "@/shims/next-navigation";
import { useState, useEffect, useRef, Suspense } from "react";
import { signIn, signOut, useSession, getSession } from "@/shims/next-auth";
import Link from "@/shims/next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { TEST_IDS } from "@/components/test-ids";
import { setAccessToken } from "@/lib/api";

function LoginContent() {
  type LoginFormInputs = {
    email: string;
    password: string;
    remember: boolean;
  };

  const { register, handleSubmit, setValue } = useForm<LoginFormInputs>({
    defaultValues: { remember: false },
  });

  const [searchParams] = useSearchParams();
  const { status } = useSession();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const isSubmittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const shouldBlockRedirectRef = useRef(false);
  const didCleanupRef = useRef(false);

  useEffect(() => {
    if (shouldBlockRedirectRef.current) return;
    if (isSubmittingRef.current) return;
    if (status === "authenticated" && !searchParams.get("reason")) {
      window.location.href = "/dashboard";
    }
  }, [status, searchParams]);

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "session_conflict" || reason === "session_expired") {
      shouldBlockRedirectRef.current = true;
      if (reason === "session_conflict") {
        setError("มีการเข้าสู่ระบบจากอุปกรณ์อื่น");
      } else if (reason === "session_expired") {
        setError("เซสชั่นหมดอายุ กรุณาเข้าสู่ระบบใหม่");
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const reason = searchParams.get("reason");
    if (reason === "session_conflict" || reason === "session_expired") {
      if (status === "authenticated" && !didCleanupRef.current && !isSubmittingRef.current) {
        didCleanupRef.current = true;
        signOut({ redirect: false });
      }
    }
  }, [searchParams, status]);

  const onSubmit = async (data: LoginFormInputs) => {
    if (isSubmittingRef.current) return;
    try {
      setError("");
      setIsSubmitting(true);
      isSubmittingRef.current = true;

      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "CredentialsSignin") {
          throw new Error("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        }
        if (
          result.error.toLowerCase().includes("load failed") ||
          result.error === "OAuthSignin" ||
          result.error === "Callback"
        ) {
          throw new Error(
            "เกิดข้อผิดพลาดในการเชื่อมต่อ (Network Error) กรุณาลองใหม่อีกครั้ง",
          );
        }
        throw new Error(result.error);
      }

      if (result?.ok) {
        shouldBlockRedirectRef.current = false;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await new Promise((r) => setTimeout(r, attempt === 0 ? 400 : 600));
            const sess = await getSession();
            if (sess?.accessToken) {
              setAccessToken(sess.accessToken);
              break;
            }
          } catch (e) {
            console.warn("[Login] Session check attempt failed", e);
          }
        }
        window.location.replace("/dashboard");
      }
    } catch (err: unknown) {
      console.error("[Login] Submission error:", err);
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
      );
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
            <Alert variant="destructive" className="bg-destructive/15 border-0" data-testid={TEST_IDS.LOGIN.ALERT_ERROR}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">อีเมล</Label>
            <Input {...register("email")} id="email" type="email" placeholder="you@example.com" required autoComplete="email" data-testid={TEST_IDS.LOGIN.INPUT_EMAIL} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">รหัสผ่าน</Label>
            <div className="relative">
              <Input {...register("password")} id="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" className="pr-10 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden" data-testid={TEST_IDS.LOGIN.INPUT_PASSWORD} />
              <Button type="button" variant="ghost" size="icon" className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)} tabIndex={-1} data-testid={TEST_IDS.LOGIN.BUTTON_TOGGLE_PASSWORD}>
                {showPassword ? <EyeOff className="text-muted-foreground h-4 w-4" /> : <Eye className="text-muted-foreground h-4 w-4" />}
                <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-muted-foreground flex items-center space-x-2 text-sm">
              <input type="checkbox" {...register("remember")} className="form-checkbox text-primary focus:ring-primary border-input h-4 w-4 rounded" data-testid={TEST_IDS.LOGIN.CHECKBOX_REMEMBER} />
              <span>จำชื่อผู้ใช้และรหัสผ่าน</span>
            </label>
            <Link href="/forgot-password" className="text-primary text-sm hover:underline" data-testid={TEST_IDS.LOGIN.LINK_FORGOT_PASSWORD}>ลืมรหัสผ่าน?</Link>
          </div>
          <Button type="submit" disabled={isSubmitting} className="mt-4 w-full transition-all hover:scale-[1.02]" data-testid={TEST_IDS.LOGIN.BUTTON_SUBMIT}>
            {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </Button>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background text-muted-foreground px-2">หรือ</span></div>
          </div>
          <Button type="button" variant="outline" onClick={() => toast.info("Google Login ยังไม่พร้อมใช้งาน")} className="w-full cursor-pointer transition-all hover:scale-[1.02]" data-testid={TEST_IDS.LOGIN.BUTTON_GOOGLE}>
            Sign in with Google
          </Button>
          <p className="text-muted-foreground mt-4 text-center text-sm">
            หากคุณยังไม่มีบัญชี{" "}
            <Link href="/register" className="text-primary hover:underline" data-testid={TEST_IDS.LOGIN.LINK_REGISTER}>สร้างบัญชีใหม่</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
