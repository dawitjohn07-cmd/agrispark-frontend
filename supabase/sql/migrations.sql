-- AgriSpark: Complete database migrations
-- Run this entire script in Supabase SQL Editor

-- 1. Add missing columns to users table
alter table public.users add column if not exists location text;
alter table public.users add column if not exists farm_name text;
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists cover_url text;

-- 2. Add missing columns to products table  
alter table public.products add column if not exists category text;
alter table public.products add column if not exists location text;

-- 2b. Add payment fields to orders table
alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists transaction_reference text;

-- 3. Create messages table for chat
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade,
  sender_id uuid references public.users(id) on delete cascade,
  receiver_id uuid references public.users(id) on delete cascade,
  message text not null,
  created_at timestamp with time zone default timezone('utc', now())
);

-- 4. Enable RLS on messages
alter table public.messages enable row level security;

-- 5. RLS policies for messages
drop policy if exists "Users can view their own messages" on public.messages;
drop policy if exists "Users can send messages" on public.messages;
drop policy if exists "Order participants can view messages" on public.messages;
drop policy if exists "Order participants can send messages" on public.messages;
drop policy if exists "Senders can update own messages" on public.messages;
drop policy if exists "Senders can delete own messages" on public.messages;

create policy "Order participants can view messages"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      join public.products p on p.id = o.product_id
      where o.id = messages.order_id
        and (o.buyer_id = auth.uid() or p.farmer_id = auth.uid())
    )
  );

create policy "Order participants can send messages"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from public.orders o
      join public.products p on p.id = o.product_id
      where o.id = messages.order_id
        and (
          (o.buyer_id = auth.uid() and p.farmer_id = messages.receiver_id)
          or
          (p.farmer_id = auth.uid() and o.buyer_id = messages.receiver_id)
        )
    )
  );

create policy "Senders can update own messages"
  on public.messages for update
  to authenticated
  using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

create policy "Senders can delete own messages"
  on public.messages for delete
  to authenticated
  using (auth.uid() = sender_id);

-- 6. Add admin support: Add role check function and admin user creation helper
-- Note: Admin users can only be created by Supabase admin via update
-- Regular users can only be farmer or buyer

-- 6b. Enable RLS on orders and allow buyers/farmers to access their records
alter table public.orders enable row level security;

drop policy if exists "Buyers can create orders" on public.orders;
create policy "Buyers can create orders"
  on public.orders for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'buyer'
        and u.id = buyer_id
    )
  );

drop policy if exists "Buyers can view own orders" on public.orders;
create policy "Buyers can view own orders"
  on public.orders for select
  to authenticated
  using (
    exists (
      select 1
      from public.users u
      where u.id = auth.uid()
        and u.role = 'buyer'
        and u.id = buyer_id
    )
  );

drop policy if exists "Farmers can view product orders" on public.orders;
create policy "Farmers can view product orders"
  on public.orders for select
  to authenticated
  using (
    exists (
      select 1
      from public.products p
      join public.users u on u.id = auth.uid()
      where p.id = orders.product_id
        and p.farmer_id = auth.uid()
        and u.role = 'farmer'
    )
  );

drop policy if exists "Farmers can update product orders" on public.orders;
create policy "Farmers can update product orders"
  on public.orders for update
  to authenticated
  using (
    exists (
      select 1
      from public.products p
      join public.users u on u.id = auth.uid()
      where p.id = orders.product_id
        and p.farmer_id = auth.uid()
        and u.role = 'farmer'
    )
  )
  with check (
    exists (
      select 1
      from public.products p
      join public.users u on u.id = auth.uid()
      where p.id = orders.product_id
        and p.farmer_id = auth.uid()
        and u.role = 'farmer'
    )
  );

-- 7. Profile media storage for public avatars and cover photos
alter table public.users enable row level security;

drop policy if exists "Public can view users" on public.users;
create policy "Public can view users"
  on public.users for select
  using (true);

drop policy if exists "Anyone can view user profiles" on public.users;
create policy "Anyone can view user profiles"
  on public.users for select
  using (true);

alter table public.products enable row level security;

drop policy if exists "Anyone can view products" on public.products;
create policy "Anyone can view products"
  on public.products for select
  using (true);

insert into storage.buckets (id, name, public)
values ('profile-media', 'profile-media', true)
on conflict (id) do update
  set name = excluded.name,
      public = true;

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update
  set name = excluded.name,
      public = true;

drop policy if exists "Authenticated users can upload profile media" on storage.objects;
create policy "Authenticated users can upload profile media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'profile-media');

drop policy if exists "Authenticated users can update profile media" on storage.objects;
create policy "Authenticated users can update profile media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'profile-media')
  with check (bucket_id = 'profile-media');

drop policy if exists "Authenticated users can delete profile media" on storage.objects;
create policy "Authenticated users can delete profile media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'profile-media');

drop policy if exists "Public can view profile media" on storage.objects;
create policy "Public can view profile media"
  on storage.objects for select
  using (bucket_id = 'profile-media');

drop policy if exists "Authenticated users can upload product images" on storage.objects;
create policy "Authenticated users can upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "Authenticated users can update product images" on storage.objects;
create policy "Authenticated users can update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');

drop policy if exists "Authenticated users can delete product images" on storage.objects;
create policy "Authenticated users can delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');
