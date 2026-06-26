import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/create";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const fail = new URL("/login", url.origin);
      fail.searchParams.set("error", error.message);
      return NextResponse.redirect(fail);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
