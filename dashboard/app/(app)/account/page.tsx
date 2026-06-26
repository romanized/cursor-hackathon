import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Accent } from "@/components/accent";
import { Card } from "@/components/ui/card";
import { signOut } from "@/lib/actions/auth";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, credits, created_at")
    .single();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <header className="rise mb-8 flex flex-col gap-2">
        <span className="overline">Account</span>
        <h1 className="text-4xl font-medium tracking-tight">
          Hello, <Accent>{(profile?.display_name || profile?.email || "creator").split("@")[0]}.</Accent>
        </h1>
      </header>
      <Card className="flex flex-col gap-4 p-6">
        <Row label="Email">{profile?.email || user.email}</Row>
        <Row label="Display name">{profile?.display_name || "—"}</Row>
        <Row label="Credits">{profile?.credits}</Row>
        <Row label="Joined">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</Row>
      </Card>

      <form action={signOut} className="mt-6">
        <button type="submit" className="text-sm text-muted underline underline-offset-4 hover:text-[var(--color-accent)]">
          Sign out
        </button>
      </form>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between border-b border-[var(--color-border)] pb-3 last:border-0 last:pb-0">
      <span className="overline-muted">{label}</span>
      <span className="text-sm text-text">{children}</span>
    </div>
  );
}
