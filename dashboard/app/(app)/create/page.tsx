import { createDraft } from "@/lib/actions/projects";

// Hitting /create kicks off a new draft via a POST-style server action.
// We render a form (no JS required) so it works on the user's first click.
export default function NewDraft() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="ambient-red" />
      <form action={createDraft} className="rise flex flex-col items-center gap-6 text-center">
        <span className="overline">Begin</span>
        <h1 className="text-5xl font-medium tracking-tight">
          Let&apos;s make something <span className="accent">viral.</span>
        </h1>
        <p className="text-muted max-w-md">
          A new draft is created the moment you press start. You can leave and resume it any time from <span className="text-text">Library</span>.
        </p>
        <button
          type="submit"
          className="mt-4 inline-flex h-14 items-center gap-2 rounded-full bg-[var(--color-accent)] px-7 text-base font-medium text-white shadow-[var(--shadow-glow)] hover:bg-[var(--color-accent-soft)] transition-colors"
        >
          Start a new project →
        </button>
      </form>
    </div>
  );
}
