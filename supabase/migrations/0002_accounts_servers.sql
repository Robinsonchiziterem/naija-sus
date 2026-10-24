-- Naija Sus: player accounts, usernames, purchases on accounts, and 128 official servers.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  username      text check (username ~ '^[A-Za-z0-9_]{3,15}$'),
  look          jsonb not null default '{}'::jsonb,
  games_played  int not null default 0,
  wins          int not null default 0,
  thief_wins    int not null default 0,
  last_game_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists profiles_username_lower on public.profiles (lower(username));
alter table public.profiles enable row level security;
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);

create or replace function private.username_ok(p text) returns boolean language sql immutable as $$
  select p ~ '^[A-Za-z0-9_]{3,15}$'
     and lower(p) not in ('admin','administrator','naijasus','naija_sus','moderator','mod','support','host','you','system','thief','computer','official');
$$;

-- A profile is made for every new account. The username chosen at sign up is used if it is free.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare v text := new.raw_user_meta_data ->> 'username';
begin
  if v is null or not private.username_ok(v) or exists (select 1 from public.profiles p where lower(p.username) = lower(v)) then v := null; end if;
  insert into public.profiles (id, username) values (new.id, v) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = public, private as $$
  select private.username_ok(p_username) and not exists (select 1 from public.profiles p where lower(p.username) = lower(p_username));
$$;

create or replace function public.my_profile()
returns table (username text, look jsonb, games_played int, wins int, thief_wins int, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.username, p.look, p.games_played, p.wins, p.thief_wins, p.created_at from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.set_username(p_username text) returns text
language plpgsql security definer set search_path = public, private as $$
begin
  if auth.uid() is null then return 'signin'; end if;
  if not private.username_ok(p_username) then return 'invalid'; end if;
  if exists (select 1 from public.profiles p where lower(p.username) = lower(p_username) and p.id <> auth.uid()) then return 'taken'; end if;
  insert into public.profiles (id, username) values (auth.uid(), p_username)
  on conflict (id) do update set username = excluded.username, updated_at = now();
  return 'ok';
end;
$$;

create or replace function public.save_look(p_look jsonb) returns void
language sql security definer set search_path = public as $$
  update public.profiles set look = case when pg_column_size(p_look) < 4000 then p_look else look end, updated_at = now() where id = auth.uid();
$$;

-- Cosmetic stats only. One result a minute at most.
create or replace function public.record_game(p_won boolean, p_thief boolean) returns void
language sql security definer set search_path = public as $$
  update public.profiles
     set games_played = games_played + 1,
         wins = wins + case when p_won then 1 else 0 end,
         thief_wins = thief_wins + case when p_won and p_thief then 1 else 0 end,
         last_game_at = now()
   where id = auth.uid() and (last_game_at is null or last_game_at < now() - interval '60 seconds');
$$;

-- ---------------------------------------------------------------- purchases follow the account
alter table public.purchases add column if not exists user_id uuid references auth.users (id) on delete set null;
create index if not exists purchases_user_idx on public.purchases (user_id);

drop function if exists public.my_purchases(text);
create or replace function public.my_purchases(p_device text)
returns table (item_id text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.item_id, p.created_at from public.purchases p
  where p.device_id = p_device or (auth.uid() is not null and p.user_id = auth.uid())
  order by p.created_at;
$$;

-- When you sign in, things bought on this phone before move onto your account.
create or replace function public.claim_purchases(p_device text) returns int
language sql security definer set search_path = public as $$
  with u as (update public.purchases set user_id = auth.uid() where auth.uid() is not null and device_id = p_device and user_id is null returning 1)
  select count(*)::int from u;
$$;

drop function if exists public.record_purchase(text, text, text, int, text);
create or replace function public.record_purchase(p_secret text, p_device text, p_item text, p_amount int, p_ref text, p_user uuid default null)
returns boolean
language plpgsql security definer set search_path = public, private as $$
begin
  if not exists (select 1 from private.app_secrets s where s.name = 'payments' and s.value = p_secret) then raise exception 'denied'; end if;
  insert into public.purchases (device_id, item_id, amount, paystack_ref, user_id)
  values (p_device, p_item, p_amount, p_ref, case when exists (select 1 from auth.users u where u.id = p_user) then p_user end)
  on conflict (paystack_ref) do nothing;
  return true;
end;
$$;

revoke all on function public.record_purchase(text, text, text, int, text, uuid) from public, authenticated;
grant execute on function public.record_purchase(text, text, text, int, text, uuid) to anon;
grant execute on function public.my_purchases(text), public.username_available(text) to anon, authenticated;
revoke all on function public.my_profile(), public.set_username(text), public.save_look(jsonb), public.record_game(boolean, boolean), public.claim_purchases(text) from public, anon;
grant execute on function public.my_profile(), public.set_username(text), public.save_look(jsonb), public.record_game(boolean, boolean), public.claim_purchases(text) to authenticated;

-- ---------------------------------------------------------------- 128 official servers
alter table public.rooms add column if not exists region text;
delete from public.rooms where is_official and code !~ '^(CP|DF)[0-9]{4}$';
insert into public.rooms (code, name, mode, max_players, thieves, is_official, region) values
('CP0001', 'Surulere Night Shift', 'compound', 5, 1, true, 'Lagos'),
('CP0002', 'Yaba Night Shift', 'compound', 10, 3, true, 'Lagos'),
('CP0003', 'Ajegunle Night Shift', 'compound', 9, 2, true, 'Lagos'),
('CP0004', 'Lekki Phase 1 Night Shift', 'compound', 8, 2, true, 'Lagos'),
('CP0005', 'Ikeja GRA Night Shift', 'compound', 6, 1, true, 'Lagos'),
('CP0006', 'Festac Night Shift', 'compound', 12, 3, true, 'Lagos'),
('CP0007', 'Gbagada Night Shift', 'compound', 10, 2, true, 'Lagos'),
('CP0008', 'Ikorodu Night Shift', 'compound', 8, 2, true, 'Lagos'),
('CP0009', 'Ajah Night Shift', 'compound', 7, 1, true, 'Lagos'),
('CP0010', 'Magodo Night Shift', 'compound', 5, 1, true, 'Lagos'),
('CP0011', 'Mushin Night Shift', 'compound', 10, 2, true, 'Lagos'),
('CP0012', 'Ebute Metta Night Shift', 'compound', 9, 3, true, 'Lagos'),
('CP0013', 'Agege Night Shift', 'compound', 8, 1, true, 'Lagos'),
('CP0014', 'Ojuelegba Night Shift', 'compound', 6, 1, true, 'Lagos'),
('CP0015', 'Isale Eko Night Shift', 'compound', 12, 2, true, 'Lagos'),
('CP0016', 'Ogba Night Shift', 'compound', 10, 3, true, 'Lagos'),
('CP0017', 'Gwarinpa Night Shift', 'compound', 8, 1, true, 'Abuja'),
('CP0018', 'Wuse 2 Night Shift', 'compound', 7, 2, true, 'Abuja'),
('CP0019', 'Kubwa Night Shift', 'compound', 5, 1, true, 'Abuja'),
('CP0020', 'Garki Night Shift', 'compound', 10, 3, true, 'Abuja'),
('CP0021', 'Rumuokoro Night Shift', 'compound', 9, 2, true, 'Port Harcourt'),
('CP0022', 'D-Line Night Shift', 'compound', 8, 2, true, 'Port Harcourt'),
('CP0023', 'Trans Amadi Night Shift', 'compound', 6, 1, true, 'Port Harcourt'),
('CP0024', 'Bodija Night Shift', 'compound', 12, 3, true, 'Ibadan'),
('CP0025', 'Dugbe Night Shift', 'compound', 10, 2, true, 'Ibadan'),
('CP0026', 'Abeokuta Night Shift', 'compound', 8, 2, true, 'South West'),
('CP0027', 'Ilorin Night Shift', 'compound', 7, 1, true, 'North Central'),
('CP0028', 'Akure Night Shift', 'compound', 5, 1, true, 'South West'),
('CP0029', 'Enugu Coal City Night Shift', 'compound', 10, 2, true, 'South East'),
('CP0030', 'Owerri Night Shift', 'compound', 9, 3, true, 'South East'),
('CP0031', 'Aba Night Shift', 'compound', 8, 1, true, 'South East'),
('CP0032', 'Onitsha Night Shift', 'compound', 6, 1, true, 'South East'),
('CP0033', 'Benin GRA Night Shift', 'compound', 12, 2, true, 'South South'),
('CP0034', 'Warri Night Shift', 'compound', 10, 3, true, 'South South'),
('CP0035', 'Calabar Night Shift', 'compound', 8, 1, true, 'South South'),
('CP0036', 'Uyo Night Shift', 'compound', 7, 2, true, 'South South'),
('CP0037', 'Kano Sabon Gari Night Shift', 'compound', 5, 1, true, 'North'),
('CP0038', 'Kaduna Night Shift', 'compound', 10, 3, true, 'North'),
('CP0039', 'Jos Night Shift', 'compound', 9, 2, true, 'North Central'),
('CP0040', 'Zaria Night Shift', 'compound', 8, 2, true, 'North'),
('CP0041', 'Surulere Yard Gang', 'compound', 7, 1, true, 'Lagos'),
('CP0042', 'Yaba Yard Gang', 'compound', 5, 1, true, 'Lagos'),
('CP0043', 'Ajegunle Yard Gang', 'compound', 10, 2, true, 'Lagos'),
('CP0044', 'Lekki Phase 1 Yard Gang', 'compound', 9, 3, true, 'Lagos'),
('CP0045', 'Ikeja GRA Yard Gang', 'compound', 8, 1, true, 'Lagos'),
('CP0046', 'Festac Yard Gang', 'compound', 6, 1, true, 'Lagos'),
('CP0047', 'Gbagada Yard Gang', 'compound', 12, 2, true, 'Lagos'),
('CP0048', 'Ikorodu Yard Gang', 'compound', 10, 3, true, 'Lagos'),
('CP0049', 'Ajah Yard Gang', 'compound', 8, 1, true, 'Lagos'),
('CP0050', 'Magodo Yard Gang', 'compound', 7, 2, true, 'Lagos'),
('CP0051', 'Mushin Yard Gang', 'compound', 5, 1, true, 'Lagos'),
('CP0052', 'Ebute Metta Yard Gang', 'compound', 10, 3, true, 'Lagos'),
('CP0053', 'Agege Yard Gang', 'compound', 9, 2, true, 'Lagos'),
('CP0054', 'Ojuelegba Yard Gang', 'compound', 8, 2, true, 'Lagos'),
('CP0055', 'Isale Eko Yard Gang', 'compound', 6, 1, true, 'Lagos'),
('CP0056', 'Ogba Yard Gang', 'compound', 12, 3, true, 'Lagos'),
('CP0057', 'Gwarinpa Yard Gang', 'compound', 10, 2, true, 'Abuja'),
('CP0058', 'Wuse 2 Yard Gang', 'compound', 8, 2, true, 'Abuja'),
('CP0059', 'Kubwa Yard Gang', 'compound', 7, 1, true, 'Abuja'),
('CP0060', 'Garki Yard Gang', 'compound', 5, 1, true, 'Abuja'),
('CP0061', 'Rumuokoro Yard Gang', 'compound', 10, 2, true, 'Port Harcourt'),
('CP0062', 'D-Line Yard Gang', 'compound', 9, 3, true, 'Port Harcourt'),
('CP0063', 'Trans Amadi Yard Gang', 'compound', 8, 1, true, 'Port Harcourt'),
('CP0064', 'Bodija Yard Gang', 'compound', 6, 1, true, 'Ibadan'),
('DF0065', 'Oshodi to CMS Morning Rush', 'danfo', 5, 1, true, 'Lagos'),
('DF0066', 'Ojota to Obalende Morning Rush', 'danfo', 10, 3, true, 'Lagos'),
('DF0067', 'Berger to Ikeja Morning Rush', 'danfo', 9, 2, true, 'Lagos'),
('DF0068', 'Mile 2 to Oshodi Morning Rush', 'danfo', 8, 2, true, 'Lagos'),
('DF0069', 'Ikorodu to Ketu Morning Rush', 'danfo', 6, 1, true, 'Lagos'),
('DF0070', 'Ajah to Obalende Morning Rush', 'danfo', 12, 3, true, 'Lagos'),
('DF0071', 'Yaba to Costain Morning Rush', 'danfo', 10, 2, true, 'Lagos'),
('DF0072', 'Agege to Ikeja Morning Rush', 'danfo', 8, 2, true, 'Lagos'),
('DF0073', 'Iyana Ipaja to Oshodi Morning Rush', 'danfo', 7, 1, true, 'Lagos'),
('DF0074', 'Lekki to VI Morning Rush', 'danfo', 5, 1, true, 'Lagos'),
('DF0075', 'Ojuelegba to Fadeyi Morning Rush', 'danfo', 10, 2, true, 'Lagos'),
('DF0076', 'Ikotun to Egbeda Morning Rush', 'danfo', 9, 3, true, 'Lagos'),
('DF0077', 'Third Mainland Crawl Morning Rush', 'danfo', 8, 1, true, 'Lagos'),
('DF0078', 'Apapa Tanker Queue Morning Rush', 'danfo', 6, 1, true, 'Lagos'),
('DF0079', 'Badagry Express Morning Rush', 'danfo', 12, 2, true, 'Lagos'),
('DF0080', 'Mowe to Berger Morning Rush', 'danfo', 10, 3, true, 'Lagos'),
('DF0081', 'Nyanya to Area 1 Morning Rush', 'danfo', 8, 1, true, 'Abuja'),
('DF0082', 'Kubwa to Berger Morning Rush', 'danfo', 7, 2, true, 'Abuja'),
('DF0083', 'Lugbe to Garki Morning Rush', 'danfo', 5, 1, true, 'Abuja'),
('DF0084', 'Rumuokoro to Waterlines Morning Rush', 'danfo', 10, 3, true, 'Port Harcourt'),
('DF0085', 'Choba to Mile 1 Morning Rush', 'danfo', 9, 2, true, 'Port Harcourt'),
('DF0086', 'Iwo Road to Dugbe Morning Rush', 'danfo', 8, 2, true, 'Ibadan'),
('DF0087', 'Challenge to Ojoo Morning Rush', 'danfo', 6, 1, true, 'Ibadan'),
('DF0088', 'Kuto to Panseke Morning Rush', 'danfo', 12, 3, true, 'South West'),
('DF0089', 'Ogbete to New Haven Morning Rush', 'danfo', 10, 2, true, 'South East'),
('DF0090', 'Upper Iweka Morning Rush', 'danfo', 8, 2, true, 'South East'),
('DF0091', 'Ariaria to Osisioma Morning Rush', 'danfo', 7, 1, true, 'South East'),
('DF0092', 'Owerri Wetheral Morning Rush', 'danfo', 5, 1, true, 'South East'),
('DF0093', 'Ring Road Benin Morning Rush', 'danfo', 10, 2, true, 'South South'),
('DF0094', 'Effurun Roundabout Morning Rush', 'danfo', 9, 3, true, 'South South'),
('DF0095', 'Watt Market Run Morning Rush', 'danfo', 8, 1, true, 'South South'),
('DF0096', 'Itam to Ibom Plaza Morning Rush', 'danfo', 6, 1, true, 'South South'),
('DF0097', 'Kano Kofar Mata Morning Rush', 'danfo', 12, 2, true, 'North'),
('DF0098', 'Kaduna Central Market Morning Rush', 'danfo', 10, 3, true, 'North'),
('DF0099', 'Jos Terminus Morning Rush', 'danfo', 8, 1, true, 'North Central'),
('DF0100', 'Ilorin Post Office Morning Rush', 'danfo', 7, 2, true, 'North Central'),
('DF0101', 'Oshodi to CMS Last Bus', 'danfo', 6, 1, true, 'Lagos'),
('DF0102', 'Ojota to Obalende Last Bus', 'danfo', 12, 3, true, 'Lagos'),
('DF0103', 'Berger to Ikeja Last Bus', 'danfo', 10, 2, true, 'Lagos'),
('DF0104', 'Mile 2 to Oshodi Last Bus', 'danfo', 8, 2, true, 'Lagos'),
('DF0105', 'Ikorodu to Ketu Last Bus', 'danfo', 7, 1, true, 'Lagos'),
('DF0106', 'Ajah to Obalende Last Bus', 'danfo', 5, 1, true, 'Lagos'),
('DF0107', 'Yaba to Costain Last Bus', 'danfo', 10, 2, true, 'Lagos'),
('DF0108', 'Agege to Ikeja Last Bus', 'danfo', 9, 3, true, 'Lagos'),
('DF0109', 'Iyana Ipaja to Oshodi Last Bus', 'danfo', 8, 1, true, 'Lagos'),
('DF0110', 'Lekki to VI Last Bus', 'danfo', 6, 1, true, 'Lagos'),
('DF0111', 'Ojuelegba to Fadeyi Last Bus', 'danfo', 12, 2, true, 'Lagos'),
('DF0112', 'Ikotun to Egbeda Last Bus', 'danfo', 10, 3, true, 'Lagos'),
('DF0113', 'Third Mainland Crawl Last Bus', 'danfo', 8, 1, true, 'Lagos'),
('DF0114', 'Apapa Tanker Queue Last Bus', 'danfo', 7, 2, true, 'Lagos'),
('DF0115', 'Badagry Express Last Bus', 'danfo', 5, 1, true, 'Lagos'),
('DF0116', 'Mowe to Berger Last Bus', 'danfo', 10, 3, true, 'Lagos'),
('DF0117', 'Nyanya to Area 1 Last Bus', 'danfo', 9, 2, true, 'Abuja'),
('DF0118', 'Kubwa to Berger Last Bus', 'danfo', 8, 2, true, 'Abuja'),
('DF0119', 'Lugbe to Garki Last Bus', 'danfo', 6, 1, true, 'Abuja'),
('DF0120', 'Rumuokoro to Waterlines Last Bus', 'danfo', 12, 3, true, 'Port Harcourt'),
('DF0121', 'Choba to Mile 1 Last Bus', 'danfo', 10, 2, true, 'Port Harcourt'),
('DF0122', 'Iwo Road to Dugbe Last Bus', 'danfo', 8, 2, true, 'Ibadan'),
('DF0123', 'Challenge to Ojoo Last Bus', 'danfo', 7, 1, true, 'Ibadan'),
('DF0124', 'Kuto to Panseke Last Bus', 'danfo', 5, 1, true, 'South West'),
('DF0125', 'Ogbete to New Haven Last Bus', 'danfo', 10, 2, true, 'South East'),
('DF0126', 'Upper Iweka Last Bus', 'danfo', 9, 3, true, 'South East'),
('DF0127', 'Ariaria to Osisioma Last Bus', 'danfo', 8, 1, true, 'South East'),
('DF0128', 'Owerri Wetheral Last Bus', 'danfo', 6, 1, true, 'South East')
on conflict (code) do update set name = excluded.name, max_players = excluded.max_players, thieves = excluded.thieves, region = excluded.region;

drop function if exists public.list_rooms(text);
create or replace function public.list_rooms(p_mode text)
returns table (id uuid, name text, mode text, max_players int, thieves int, player_count int, status text, is_official boolean, host_name text, region text)
language sql stable security definer set search_path = public as $$
  select r.id, r.name, r.mode, r.max_players, r.thieves,
         case when r.updated_at > now() - interval '40 seconds' then r.player_count else 0 end as pc,
         case when r.updated_at > now() - interval '40 seconds' then r.status else 'lobby' end,
         r.is_official, coalesce(r.host_name, ''), coalesce(r.region, 'Players')
  from public.rooms r
  where r.mode = p_mode and not r.is_private
    and (r.is_official or r.updated_at > now() - interval '10 minutes')
  order by pc desc, r.is_official, r.code
  limit 300;
$$;
grant execute on function public.list_rooms(text) to anon, authenticated;
