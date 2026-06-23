-- AgriSpark: create users profile row automatically when auth user is created.
-- Run this in Supabase SQL Editor.

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, phone_number, location, farm_name, role, avatar_url, cover_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone_number', ''),
    coalesce(new.raw_user_meta_data->>'location', ''),
    coalesce(new.raw_user_meta_data->>'farm_name', new.raw_user_meta_data->>'business_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'buyer'),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    coalesce(new.raw_user_meta_data->>'cover_url', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        phone_number = excluded.phone_number,
        location = excluded.location,
        farm_name = excluded.farm_name,
        role = excluded.role,
        avatar_url = excluded.avatar_url,
        cover_url = excluded.cover_url;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
