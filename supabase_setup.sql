-- =====================================================
-- रामकोला टाइम्स — Supabase सेटअप
-- इसे Supabase Dashboard > SQL Editor में पूरा paste करके Run करें
-- =====================================================

-- ---------- 1. टेबल ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text default '',
  phone text,
  designation text,
  role text not null default 'staff' check (role in ('admin','staff')),
  active boolean not null default false,   -- admin approve/add करे तभी true
  created_at timestamptz default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  file_path text not null,
  issued_on date,
  created_at timestamptz default now()
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text,
  title text not null,
  body text not null,
  category text not null default 'स्थानीय',
  image_url text,
  status text not null default 'draft'
    check (status in ('draft','pending','published','rejected')),
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  published_at timestamptz
);

create index if not exists news_status_pub on public.news(status, published_at desc);
create index if not exists news_author on public.news(author_id);
create index if not exists cert_staff on public.certificates(staff_id);

-- ---------- 2. मददगार functions ----------
create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'admin' and active);
$$;

create or replace function public.is_active_staff() returns boolean
language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'staff' and active);
$$;

-- नया user बनते ही profile अपने-आप बने (role=staff, active=false)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- news: लेखक का नाम और तारीखें सर्वर पर तय हों (नकली नाम नहीं चलेगा)
create or replace function public.news_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    select full_name into new.author_name from public.profiles where id = new.author_id;
  else
    new.author_name := old.author_name;
    new.author_id := old.author_id;
  end if;
  new.updated_at := now();
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := now();
  end if;
  return new;
end $$;

drop trigger if exists news_before_trg on public.news;
create trigger news_before_trg
  before insert or update on public.news
  for each row execute function public.news_before();

-- ---------- 3. Row Level Security ----------
alter table public.profiles     enable row level security;
alter table public.certificates enable row level security;
alter table public.news         enable row level security;

-- profiles
drop policy if exists "profiles: अपना या admin" on public.profiles;
create policy "profiles: अपना या admin" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles: admin बदले" on public.profiles;
create policy "profiles: admin बदले" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "profiles: admin हटाए" on public.profiles;
create policy "profiles: admin हटाए" on public.profiles
  for delete to authenticated using (public.is_admin());

-- certificates
drop policy if exists "cert: admin सब" on public.certificates;
create policy "cert: admin सब" on public.certificates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "cert: staff अपना देखे" on public.certificates;
create policy "cert: staff अपना देखे" on public.certificates
  for select to authenticated
  using (staff_id = auth.uid() and public.is_active_staff());

-- news
drop policy if exists "news: सब प्रकाशित देखें" on public.news;
create policy "news: सब प्रकाशित देखें" on public.news
  for select to anon, authenticated using (status = 'published');

drop policy if exists "news: admin सब" on public.news;
create policy "news: admin सब" on public.news
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "news: staff अपनी देखे" on public.news;
create policy "news: staff अपनी देखे" on public.news
  for select to authenticated
  using (author_id = auth.uid() and public.is_active_staff());

drop policy if exists "news: staff लिखे" on public.news;
create policy "news: staff लिखे" on public.news
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_active_staff()
              and status in ('draft','pending'));

drop policy if exists "news: staff सुधारे" on public.news;
create policy "news: staff सुधारे" on public.news
  for update to authenticated
  using (author_id = auth.uid() and public.is_active_staff()
         and status in ('draft','pending','rejected'))
  with check (author_id = auth.uid() and status in ('draft','pending'));

drop policy if exists "news: staff हटाए" on public.news;
create policy "news: staff हटाए" on public.news
  for delete to authenticated
  using (author_id = auth.uid() and public.is_active_staff()
         and status in ('draft','pending','rejected'));

-- ---------- 4. Storage (फ़ाइलें) ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('certificates', 'certificates', false, 5242880)      -- private, 5 MB
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('news-images', 'news-images', true, 2097152)         -- public, 2 MB
on conflict (id) do nothing;

drop policy if exists "certfiles: admin सब" on storage.objects;
create policy "certfiles: admin सब" on storage.objects
  for all to authenticated
  using (bucket_id = 'certificates' and public.is_admin())
  with check (bucket_id = 'certificates' and public.is_admin());

drop policy if exists "certfiles: staff अपनी देखे" on storage.objects;
create policy "certfiles: staff अपनी देखे" on storage.objects
  for select to authenticated
  using (bucket_id = 'certificates'
         and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "img: सब देखें" on storage.objects;
create policy "img: सब देखें" on storage.objects
  for select to anon, authenticated using (bucket_id = 'news-images');

drop policy if exists "img: staff/admin upload" on storage.objects;
create policy "img: staff/admin upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'news-images'
              and ( ((storage.foldername(name))[1] = auth.uid()::text and public.is_active_staff())
                    or public.is_admin() ));

drop policy if exists "img: अपनी/admin delete" on storage.objects;
create policy "img: अपनी/admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'news-images'
         and ( (storage.foldername(name))[1] = auth.uid()::text or public.is_admin() ));

-- =====================================================
-- पहला ADMIN बनाने के लिए (Dashboard > Authentication > Users > Add user
-- से ईमेल+पासवर्ड बनाने के बाद) नीचे की लाइन अपना ईमेल डालकर अलग से Run करें:
--
-- update public.profiles
--   set role = 'admin', active = true, full_name = 'संपादक'
--   where email = 'आपका@email.com';
-- =====================================================
