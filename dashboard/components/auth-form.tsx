"use client";

import { Accent } from "@/components/accent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight02Icon,
  GoogleIcon,
  Mail01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

type Stage = "email" | "code";

export function AuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/create";
  const supabase = createClient();

  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function requestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${
            location.origin
          }/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) setError(error.message);
      else setStage("code");
    });
  }

  function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: "email",
      });
      if (error) setError(error.message);
      else router.replace(next);
    });
  }

  function signInGoogle() {
    setError(null);
    startTransition(async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${
            location.origin
          }/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) setError(error.message);
    });
  }

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-3">
        <span className="overline flex items-center gap-2">
          <span className="h-px w-6 bg-[var(--color-accent)]" /> Sign in
        </span>
        <h1 className="text-[44px] leading-[1.02] font-medium tracking-tight">
          Welcome,
          <br />
          <Accent>creator.</Accent>
        </h1>
        <p className="text-muted max-w-sm">
          {stage === "email" ? (
            "Sign in with Google or a one-time code sent to your email."
          ) : (
            <>
              Code sent to{" "}
              <span className="text-text font-medium">{email}</span>.
            </>
          )}
        </p>
      </header>

      {stage === "email" ? (
        <form onSubmit={requestOtp} className="flex flex-col gap-3">
          <label className="text-sm text-muted" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@studio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            className="mt-2 w-full"
          >
            <HugeiconsIcon icon={Mail01Icon} size={18} strokeWidth={1.5} />
            {pending ? "Sending..." : "Send code"}
            <HugeiconsIcon
              icon={ArrowRight02Icon}
              size={18}
              strokeWidth={1.5}
            />
          </Button>

          <div className="my-2 flex items-center gap-3 text-faint text-xs">
            <div className="h-px flex-1 bg-[var(--color-border)]" />
            or
            <div className="h-px flex-1 bg-[var(--color-border)]" />
          </div>

          <Button
            type="button"
            intent="secondary"
            size="lg"
            onClick={signInGoogle}
            disabled={pending}
            className="w-full"
          >
            <HugeiconsIcon icon={GoogleIcon} size={18} strokeWidth={1.5} />
            Continue with Google
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="flex flex-col gap-3">
          <label className="text-sm text-muted" htmlFor="code">
            6-digit code
          </label>
          <div className="rounded-[var(--radius-xl)] border border-[var(--color-accent-dim)] bg-[rgba(239,68,68,0.06)] p-2">
            <Input
              id="code"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              required
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              className="border-none bg-transparent text-center text-2xl tracking-[0.5em] font-medium focus:shadow-none"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setStage("email");
              setCode("");
            }}
            className="text-sm text-muted underline underline-offset-4 self-start hover:text-text"
          >
            Use a different email
          </button>
          <Button
            type="submit"
            size="lg"
            disabled={pending || code.length !== 6}
            className="mt-2 w-full"
          >
            {pending ? "Verifying..." : "Verify & continue"}
            <HugeiconsIcon
              icon={ArrowRight02Icon}
              size={18}
              strokeWidth={1.5}
            />
          </Button>
        </form>
      )}

      {error && (
        <p className="text-sm text-[var(--color-accent-soft)]">{error}</p>
      )}
    </div>
  );
}
