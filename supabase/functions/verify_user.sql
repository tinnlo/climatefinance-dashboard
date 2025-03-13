create or replace function verify_user(user_id uuid)
returns json as $$
declare
  updated_rows int;
  was_already_verified boolean;
begin
  -- Check if the user is already verified
  select is_verified into was_already_verified
  from public.users
  where id = user_id;

  if was_already_verified then
    return json_build_object('verified', false, 'already_verified', true);
  end if;

  -- Attempt to update the user
  update public.users
  set is_verified = true
  where id = user_id and is_verified = false;

  get diagnostics updated_rows = row_count;

  if updated_rows > 0 then
    return json_build_object('verified', true, 'already_verified', false);
  else
    return json_build_object('verified', false, 'already_verified', false);
  end if;
end;
$$ language plpgsql security definer;

