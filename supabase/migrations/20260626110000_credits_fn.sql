-- Atomic credit charging. Called from server actions with the service-role key.
-- Raises `insufficient_credits` if the balance would go negative.
-- Returns the new balance.

create function public.charge_credits(p_user uuid, p_delta int, p_reason text, p_project uuid)
returns int language plpgsql security definer set search_path = '' as $$
declare
  new_balance int;
begin
  update public.profiles
    set credits = credits + p_delta
    where id = p_user and credits + p_delta >= 0
    returning credits into new_balance;

  if new_balance is null then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  insert into public.credit_ledger (user_id, project_id, delta, reason, balance_after)
    values (p_user, p_project, p_delta, p_reason, new_balance);

  return new_balance;
end $$;

-- SECURITY DEFINER in `public` is exposed via /rest/v1/rpc; only service_role
-- should be able to invoke this. revoke from public + anon + authenticated.
revoke execute on function public.charge_credits(uuid, int, text, uuid) from public;
revoke execute on function public.charge_credits(uuid, int, text, uuid) from anon, authenticated;
