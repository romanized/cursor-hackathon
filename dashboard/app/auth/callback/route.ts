import { resolveAppUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/create";

  const base = resolveAppUrl(url.origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const fail = new URL("/login", base);
      fail.searchParams.set("error", error.message);
      return NextResponse.redirect(fail);
    }
  }

  return NextResponse.redirect(new URL(next, base));
}
