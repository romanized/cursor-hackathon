import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  Folder01Icon,
  PackageIcon,
  ChartLineData01Icon,
  UserIcon,
  CreditCardIcon,
  DiscordIcon,
} from "@hugeicons/core-free-icons";
import { Accent } from "@/components/accent";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

type NavItem = { href: string; label: string; icon: typeof Add01Icon; primary?: boolean };

const workspace: NavItem[] = [
  { href: "/create", label: "Create", icon: Add01Icon, primary: true },
  { href: "/library", label: "Library", icon: Folder01Icon },
  { href: "/products", label: "Products", icon: PackageIcon },
  { href: "/trends", label: "Trends", icon: ChartLineData01Icon },
];

const account: NavItem[] = [
  { href: "/account", label: "Account", icon: UserIcon },
  { href: "/billing", label: "Usage and Billing", icon: CreditCardIcon },
];

export async function Sidebar() {
  const supabase = await createClient();
  const [{ data: user }, { data: profile }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("email,display_name,credits").maybeSingle(),
  ]);

  const initials =
    (profile?.display_name || profile?.email || user.user?.email || "??")
      .slice(0, 2)
      .toUpperCase();
  const hasPlan = (profile?.credits ?? 0) > 0;

  return (
    <aside className="hidden md:flex h-screen sticky top-0 w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]/40 px-5 py-6">
      <Link
        href="/create"
        className="mb-10 text-xl font-semibold tracking-tight"
      >
        Hookline
        <span className="text-[var(--color-accent)]">.</span>
      </Link>

      <div className="overline-muted mb-3">Workspace</div>
      <nav className="flex flex-col gap-1">
        {workspace.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              item.primary
                ? "group flex items-center gap-3 rounded-[var(--radius-lg)] bg-[var(--color-accent)] px-3 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-glow)]"
                : "group flex items-center gap-3 rounded-[var(--radius-lg)] px-3 py-2.5 text-sm text-muted hover:bg-[var(--color-surface-elev)] hover:text-text"
            }
          >
            <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.5} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="overline-muted mt-8 mb-3">Account</div>
      <nav className="flex flex-col gap-1">
        {account.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center gap-3 rounded-[var(--radius-lg)] px-3 py-2.5 text-sm text-muted hover:bg-[var(--color-surface-elev)] hover:text-text"
          >
            <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.5} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="overline-muted">Plan</span>
            <Button size="sm" intent="primary" className="px-3 h-7 text-xs">
              Subscribe
            </Button>
          </div>
          <p className="text-xs text-muted">
            {hasPlan
              ? <>{profile?.credits} credit{profile?.credits === 1 ? "" : "s"} left</>
              : "Subscribe to generate"}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-full bg-[var(--color-accent-dim)]/40 text-[11px] font-semibold uppercase">
              {initials}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium">{profile?.display_name || profile?.email?.split("@")[0] || "you"}</span>
              <span className="text-[10px] text-faint uppercase tracking-wider">{hasPlan ? "Creator" : "No active plan"}</span>
            </div>
          </div>
          <a
            href="https://discord.com"
            target="_blank"
            rel="noreferrer"
            className="text-muted hover:text-[var(--color-accent)]"
            aria-label="Discord"
          >
            <HugeiconsIcon icon={DiscordIcon} size={18} strokeWidth={1.5} />
          </a>
        </div>
      </div>
    </aside>
  );
}
