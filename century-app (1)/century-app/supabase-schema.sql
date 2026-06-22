-- ============================================================
-- CENTURY APP — Database Schema (v2, secured)
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run: every statement is idempotent.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------------- PROFILES (extends auth.users) ----------------
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  email text,
  phone text,
  role text default 'customer' check (role in ('customer', 'vendor', 'admin')),
  avatar_url text,
  created_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper: read the caller's own role without recursive RLS issues
create or replace function public.current_role()
returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------------- VENDORS ----------------
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade unique,
  store_name text not null,
  location text,
  whatsapp_number text,
  is_verified boolean default false,
  created_at timestamptz default now()
);

-- ---------------- PRODUCTS ----------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  title text not null,
  description text,
  price numeric not null default 0 check (price >= 0),
  media_type text check (media_type in ('image', 'video')),
  media_urls text[] default '{}',
  is_boosted boolean default false,
  views integer default 0,
  created_at timestamptz default now(),
  constraint media_count_matches_type check (
    media_urls is null
    or (media_type = 'video' and array_length(media_urls, 1) = 1)
    or (media_type = 'image' and array_length(media_urls, 1) between 1 and 2)
  )
);

-- ---------------- FOLLOWS ----------------
create table if not exists public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, vendor_id)
);

-- ---------------- LIKES ----------------
create table if not exists public.likes (
  user_id uuid references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, product_id)
);

-- ---------------- COMMENTS ----------------
-- author_name is denormalized at write-time so we never need to expose
-- the wider profiles table (with emails/phones) just to show who commented.
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  author_name text not null default 'User',
  content text not null check (char_length(content) between 1 and 500),
  created_at timestamptz default now()
);

-- ---------------- PASSWORD RESET REQUESTS ----------------
-- Anyone (even logged out) can file one. Only an admin can read/resolve them —
-- these rows contain PINs and must never be publicly readable.
create table if not exists public.reset_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  pin text not null,
  used boolean default false,
  admin_sent boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.vendors enable row level security;
alter table public.products enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;
alter table public.reset_requests enable row level security;

-- PROFILES — never publicly readable (emails/phones are PII). Own row, or admin.
drop policy if exists "Public profiles readable" on public.profiles;
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.current_role() = 'admin');
drop policy if exists "Users update own profile" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

-- VENDORS — public storefront info is meant to be public.
drop policy if exists "Vendors public read" on public.vendors;
create policy "vendors_select_public" on public.vendors for select using (true);
drop policy if exists "Vendor inserts own" on public.vendors;
create policy "vendors_insert_own" on public.vendors for insert with check (auth.uid() = user_id);
drop policy if exists "Vendor updates own" on public.vendors;
create policy "vendors_update_own_or_admin" on public.vendors
  for update using (auth.uid() = user_id or public.current_role() = 'admin');

-- PRODUCTS
drop policy if exists "Products public read" on public.products;
create policy "products_select_public" on public.products for select using (true);
drop policy if exists "Vendor inserts product" on public.products;
create policy "products_insert_owner" on public.products for insert with check (
  exists (select 1 from public.vendors where id = vendor_id and user_id = auth.uid())
);
drop policy if exists "Vendor updates product" on public.products;
create policy "products_update_owner_or_admin" on public.products for update using (
  exists (select 1 from public.vendors where id = vendor_id and user_id = auth.uid())
  or public.current_role() = 'admin'
);
drop policy if exists "Vendor deletes product" on public.products;
create policy "products_delete_owner" on public.products for delete using (
  exists (select 1 from public.vendors where id = vendor_id and user_id = auth.uid())
);

-- FOLLOWS — counts public; only the signed-in follower can create/remove their own row
drop policy if exists "Follows public read" on public.follows;
create policy "follows_select_public" on public.follows for select using (true);
drop policy if exists "User manages follows" on public.follows;
create policy "follows_insert_own" on public.follows for insert with check (auth.uid() = follower_id);
drop policy if exists "User deletes follows" on public.follows;
create policy "follows_delete_own" on public.follows for delete using (auth.uid() = follower_id);

-- LIKES — same pattern. A logged-out ("no account") visitor has no auth.uid(), so this
-- naturally blocks likes for them even if the UI were bypassed.
drop policy if exists "Likes public read" on public.likes;
create policy "likes_select_public" on public.likes for select using (true);
drop policy if exists "User manages likes" on public.likes;
create policy "likes_insert_own" on public.likes for insert with check (auth.uid() = user_id);
drop policy if exists "User deletes likes" on public.likes;
create policy "likes_delete_own" on public.likes for delete using (auth.uid() = user_id);

-- COMMENTS — same pattern
drop policy if exists "Comments public read" on public.comments;
create policy "comments_select_public" on public.comments for select using (true);
drop policy if exists "User inserts comment" on public.comments;
create policy "comments_insert_own" on public.comments for insert with check (auth.uid() = user_id);
drop policy if exists "User deletes comment" on public.comments;
create policy "comments_delete_own_or_admin" on public.comments
  for delete using (auth.uid() = user_id or public.current_role() = 'admin');

-- RESET REQUESTS — anyone can file (they may be locked out!), only admin can read/resolve.
drop policy if exists "Anyone inserts reset" on public.reset_requests;
create policy "reset_requests_insert_anyone" on public.reset_requests for insert with check (true);
drop policy if exists "Public reads reset" on public.reset_requests;
create policy "reset_requests_select_admin" on public.reset_requests
  for select using (public.current_role() = 'admin');
drop policy if exists "Update reset" on public.reset_requests;
create policy "reset_requests_update_admin" on public.reset_requests
  for update using (public.current_role() = 'admin');

-- Drop the old, insecure admin_config table entirely if it exists — the admin
-- account is now a real Supabase Auth user (see README "Create the admin account").
drop table if exists public.admin_config;

-- ============================================================
-- STORAGE — product photos & videos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('product-media', 'product-media', true)
on conflict (id) do nothing;

drop policy if exists "Anyone uploads media" on storage.objects;
drop policy if exists "Media public read" on storage.objects;
drop policy if exists "Owner deletes media" on storage.objects;

create policy "product_media_public_read" on storage.objects
  for select using (bucket_id = 'product-media');

-- Only signed-in users may upload (blocks anonymous/"no account" uploads)
create policy "product_media_authenticated_upload" on storage.objects
  for insert with check (bucket_id = 'product-media' and auth.uid() is not null);

-- Only the actual uploader may delete their own file
create policy "product_media_owner_delete" on storage.objects
  for delete using (bucket_id = 'product-media' and owner = auth.uid());

-- ============================================================
-- ADMIN STATS — convenience counts used by the admin dashboard
-- ============================================================
create or replace view public.admin_pending_resets as
  select count(*) as pending from public.reset_requests where admin_sent = false;
