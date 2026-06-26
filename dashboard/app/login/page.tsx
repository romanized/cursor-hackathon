import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { Card } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen grid place-items-center px-6">
      <div className="ambient-red" />
      <div className="relative w-full max-w-[460px] rise">
        <Card className="p-9 backdrop-blur-sm shadow-[0_60px_120px_-40px_rgba(239,68,68,0.35)]">
          <Suspense>
            <AuthForm />
          </Suspense>
        </Card>
      </div>
    </main>
  );
}
