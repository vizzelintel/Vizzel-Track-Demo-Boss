import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-4 p-8">
          <h1 className="text-xl font-semibold">เกิดข้อผิดพลาดในแอป</h1>
          <p className="text-muted-foreground max-w-md text-center text-sm">
            {this.state.error.message || "ไม่สามารถแสดงหน้านี้ได้"}
          </p>
          <Button type="button" onClick={() => window.location.assign("/login")}>
            กลับไปหน้าเข้าสู่ระบบ
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
