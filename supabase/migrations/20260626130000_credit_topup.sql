-- Per-action AI billing pushed the per-video cost from ~5 credits to ~150.
-- Bump the signup grant and top up existing accounts so they aren't stranded
-- below the cost of a single generation.

alter table public.profiles alter column credits set default 1000;
update public.profiles set credits = greatest(credits, 1000);
