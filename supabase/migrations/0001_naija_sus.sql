-- Naija Sus: online rooms, brand ads and in-game purchases.
-- Every table has row level security ON and NO direct policies for the
-- public (anon) role. The browser can only reach data through the
-- security-definer functions below, which validate their inputs.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- rooms
create table if not exists public.rooms (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,
  name          text not null check (char_length(name) between 1 and 40),
  mode          text not null check (mode in ('compound', 'danfo')),
  max_players   int  not null check (max_players between 5 and 15),
  thieves       int  not null check (thieves between 1 and 3),
  is_private    boolean not null default false,
  is_official   boolean not null default false,
  status        text not null default 'lobby' check (status in ('lobby', 'playing')),
  player_count  int  not null default 0 check (player_count between 0 and 15),
  host_name     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists rooms_list_idx on public.rooms (mode, is_private, updated_at desc);
alter table public.rooms enable row level security;

-- ---------------------------------------------------------------- ads
create table if not exists public.ads (
  id            uuid primary key default gen_random_uuid(),
  brand_name    text not null check (char_length(brand_name) between 1 and 60),
  contact_email text not null check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_phone text,
  kind          text not null check (kind in ('product', 'business', 'music')),
  placement     text not null check (placement in ('ad_loading', 'ad_radio', 'ad_billboard', 'ad_wrap')),
  headline      text not null check (char_length(headline) between 1 and 60),
  link_url      text check (link_url is null or link_url ~* '^https?://'),
  image_url     text,
  audio_url     text,
  artist        text,
  song_title    text,
  status        text not null default 'pending' check (status in ('pending', 'paid', 'live', 'rejected', 'expired')),
  amount        int,
  paystack_ref  text unique,
  starts_at     timestamptz,
  ends_at       timestamptz,
  device_id     text,
  created_at    timestamptz not null default now()
);
alter table public.ads enable row level security;

-- ---------------------------------------------------------------- purchases
create table if not exists public.purchases (
  id            uuid primary key default gen_random_uuid(),
  device_id     text not null,
  item_id       text not null,
  amount        int  not null,
  paystack_ref  text not null unique,
  created_at    timestamptz not null default now()
);
create index if not exists purchases_device_idx on public.purchases (device_id);
alter table public.purchases enable row level security;

-- Shared secret used by the Vercel payment function. Kept in a schema the
-- public API cannot see.
create schema if not exists private;
create table if not exists private.app_secrets (name text primary key, value text not null);
revoke all on schema private from anon, authenticated;

-- ---------------------------------------------------------------- functions
create or replace function public.list_rooms(p_mode text)
returns table (id uuid, name text, mode text, max_players int, thieves int, player_count int, status text, is_official boolean, host_name text)
language sql stable security definer set search_path = public as $$
  select r.id, r.name, r.mode, r.max_players, r.thieves,
         case when r.updated_at > now() - interval '40 seconds' then r.player_count else 0 end,
         case when r.updated_at > now() - interval '40 seconds' then r.status else 'lobby' end,
         r.is_official, coalesce(r.host_name, '')
  from public.rooms r
  where r.mode = p_mode and not r.is_private
    and (r.is_official or r.updated_at > now() - interval '10 minutes')
  order by r.is_official desc, r.player_count desc, r.created_at
  limit 40;
$$;

create or replace function public.create_room(p_name text, p_mode text, p_max int, p_thieves int, p_private boolean, p_host_name text)
returns table (id uuid, code text)
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
  v_id uuid;
  v_chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  i int;
begin
  if p_mode not in ('compound', 'danfo') then raise exception 'bad mode'; end if;
  if p_max < 5 or p_max > 15 then raise exception 'bad size'; end if;
  if p_thieves < 1 or p_thieves > 3 then raise exception 'bad thieves'; end if;
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.rooms r where r.code = v_code);
  end loop;
  insert into public.rooms (code, name, mode, max_players, thieves, is_private, host_name)
  values (v_code, left(coalesce(nullif(trim(p_name), ''), 'Naija Sus room'), 40), p_mode, p_max, p_thieves, coalesce(p_private, true), left(p_host_name, 24))
  returning rooms.id into v_id;
  return query select v_id, v_code;
end;
$$;

create or replace function public.find_room(p_code text)
returns table (id uuid, name text, mode text, max_players int, thieves int, player_count int, status text, is_private boolean, code text)
language sql stable security definer set search_path = public as $$
  select r.id, r.name, r.mode, r.max_players, r.thieves,
         case when r.updated_at > now() - interval '40 seconds' then r.player_count else 0 end,
         case when r.updated_at > now() - interval '40 seconds' then r.status else 'lobby' end,
         r.is_private, r.code
  from public.rooms r
  where r.code = upper(regexp_replace(p_code, '[^A-Za-z0-9]', '', 'g'));
$$;

create or replace function public.room_heartbeat(p_room uuid, p_count int, p_status text, p_host_name text)
returns void
language sql security definer set search_path = public as $$
  update public.rooms
     set player_count = greatest(0, least(15, p_count)),
         status = case when p_status in ('lobby', 'playing') then p_status else status end,
         host_name = left(p_host_name, 24),
         updated_at = now()
   where id = p_room;
$$;

create or replace function public.live_ads()
returns table (id uuid, kind text, placement text, brand_name text, headline text, image_url text, audio_url text, link_url text, artist text, song_title text)
language sql stable security definer set search_path = public as $$
  select a.id, a.kind, a.placement, a.brand_name, a.headline, a.image_url, a.audio_url, a.link_url, a.artist, a.song_title
  from public.ads a
  where a.status = 'live' and now() between a.starts_at and a.ends_at
  order by random()
  limit 40;
$$;

create or replace function public.submit_ad(p_brand text, p_email text, p_phone text, p_kind text, p_placement text, p_headline text,
  p_link text, p_image text, p_audio text, p_artist text, p_song text, p_starts date, p_device text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_image is not null and p_image !~ '/storage/v1/object/public/ad-media/' then raise exception 'bad image'; end if;
  if p_audio is not null and p_audio !~ '/storage/v1/object/public/ad-media/' then raise exception 'bad audio'; end if;
  insert into public.ads (brand_name, contact_email, contact_phone, kind, placement, headline, link_url, image_url, audio_url, artist, song_title, starts_at, ends_at, device_id)
  values (trim(p_brand), trim(p_email), left(p_phone, 30), p_kind, p_placement, trim(p_headline), nullif(trim(p_link), ''), p_image, p_audio,
          left(p_artist, 60), left(p_song, 80), greatest(coalesce(p_starts, current_date), current_date)::timestamptz,
          (greatest(coalesce(p_starts, current_date), current_date) + 7)::timestamptz, left(p_device, 64))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.my_purchases(p_device text)
returns table (item_id text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.item_id, p.created_at from public.purchases p where p.device_id = p_device order by p.created_at;
$$;

create or replace function public.record_purchase(p_secret text, p_device text, p_item text, p_amount int, p_ref text)
returns boolean
language plpgsql security definer set search_path = public, private as $$
begin
  if not exists (select 1 from private.app_secrets s where s.name = 'payments' and s.value = p_secret) then raise exception 'denied'; end if;
  insert into public.purchases (device_id, item_id, amount, paystack_ref) values (p_device, p_item, p_amount, p_ref)
  on conflict (paystack_ref) do nothing;
  return true;
end;
$$;

create or replace function public.mark_ad_paid(p_secret text, p_ad uuid, p_amount int, p_ref text)
returns boolean
language plpgsql security definer set search_path = public, private as $$
begin
  if not exists (select 1 from private.app_secrets s where s.name = 'payments' and s.value = p_secret) then raise exception 'denied'; end if;
  update public.ads set status = 'paid', amount = p_amount, paystack_ref = p_ref where id = p_ad and status = 'pending';
  return found;
end;
$$;

revoke all on function public.record_purchase(text, text, text, int, text) from public, anon, authenticated;
revoke all on function public.mark_ad_paid(text, uuid, int, text) from public, anon, authenticated;
grant execute on function public.record_purchase(text, text, text, int, text) to anon;
grant execute on function public.mark_ad_paid(text, uuid, int, text) to anon;
grant execute on function public.list_rooms(text), public.create_room(text, text, int, int, boolean, text), public.find_room(text),
  public.room_heartbeat(uuid, int, text, text), public.live_ads(), public.submit_ad(text, text, text, text, text, text, text, text, text, text, text, date, text),
  public.my_purchases(text) to anon, authenticated;

-- ---------------------------------------------------------------- storage for ad images and songs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ad-media', 'ad-media', true, 8388608, array['image/png', 'image/jpeg', 'image/webp', 'audio/mpeg'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "ad media uploads" on storage.objects;
create policy "ad media uploads" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'ad-media' and (storage.foldername(name))[1] = 'submissions');

-- ---------------------------------------------------------------- official servers that are always listed
insert into public.rooms (code, name, mode, max_players, thieves, is_official) values
  ('SURU01', 'Surulere Night Shift', 'compound', 8, 2, true),
  ('YABA01', 'Yaba Hostel Gang', 'compound', 10, 3, true),
  ('AJEG01', 'Ajegunle Kings', 'compound', 6, 1, true),
  ('LEKK01', 'Lekki Phase 1 Squad', 'compound', 7, 2, true),
  ('IKEJ01', 'Ikeja No Wahala', 'compound', 9, 2, true),
  ('ABJ001', 'Abuja Big Boys', 'compound', 10, 2, true),
  ('PHC001', 'Port Harcourt Garden City', 'compound', 8, 2, true),
  ('ENU001', 'Enugu Coal City', 'compound', 6, 1, true),
  ('OSHO01', 'Oshodi Under Bridge', 'danfo', 8, 2, true),
  ('OJOT01', 'Ojota Motor Park', 'danfo', 10, 3, true),
  ('CMSX01', 'CMS Express', 'danfo', 6, 1, true),
  ('OBAL01', 'Obalende Last Stop', 'danfo', 7, 2, true),
  ('BERG01', 'Berger Rush Hour', 'danfo', 9, 2, true),
  ('MIL201', 'Mile 2 Madness', 'danfo', 8, 2, true),
  ('IKOR01', 'Ikorodu Garage', 'danfo', 6, 1, true),
  ('KETU01', 'Ketu Mile 12', 'danfo', 10, 2, true)
on conflict (code) do nothing;
