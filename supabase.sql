-- نفّذ هذا الملف داخل Supabase SQL Editor.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now()
);
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(), title text not null, description text, video_url text,
  created_at timestamptz not null default now()
);
create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade, created_at timestamptz not null default now(),
  unique(student_id, course_id)
);
create table if not exists public.course_requests (
  id uuid primary key default gen_random_uuid(), student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'pending' check(status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(), unique(student_id,course_id)
);

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.course_requests enable row level security;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin insert into public.profiles (id, full_name, email) values (new.id, new.raw_user_meta_data->>'full_name', new.email); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();
create or replace function public.is_admin() returns boolean language sql security definer set search_path = public stable as $$
select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

-- الكورسات ظاهرة للزوار.
drop policy if exists "public courses read" on public.courses;
create policy "public courses read" on public.courses for select using (true);
drop policy if exists "admin courses insert" on public.courses;
create policy "admin courses insert" on public.courses for insert with check (public.is_admin());
drop policy if exists "admin courses update" on public.courses;
create policy "admin courses update" on public.courses for update using (public.is_admin());
drop policy if exists "admin courses delete" on public.courses;
create policy "admin courses delete" on public.courses for delete using (public.is_admin());

drop policy if exists "own profile read" on public.profiles;
create policy "own profile read" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "admin profile update" on public.profiles;
create policy "admin profile update" on public.profiles for update using (public.is_admin());

drop policy if exists "own enrollments read" on public.enrollments;
create policy "own enrollments read" on public.enrollments for select using (student_id = auth.uid() or public.is_admin());
drop policy if exists "admin enrollments insert" on public.enrollments;
create policy "admin enrollments insert" on public.enrollments for insert with check (public.is_admin());
drop policy if exists "admin enrollments delete" on public.enrollments;
create policy "admin enrollments delete" on public.enrollments for delete using (public.is_admin());

-- الطالب ينشئ طلب اشتراك لنفسه، والمدير يراجع الطلب ويغيّر حالته.
drop policy if exists "student own request read" on public.course_requests;
create policy "student own request read" on public.course_requests for select using (student_id = auth.uid() or public.is_admin());
drop policy if exists "student own request insert" on public.course_requests;
create policy "student own request insert" on public.course_requests for insert with check (student_id = auth.uid());
drop policy if exists "student own request update" on public.course_requests;
create policy "student own request update" on public.course_requests for update using (student_id = auth.uid() or public.is_admin());
drop policy if exists "admin request delete" on public.course_requests;
create policy "admin request delete" on public.course_requests for delete using (public.is_admin());

-- بعد إنشاء حسابك أنت كأول Admin، نفّذ:
-- update public.profiles set role='admin' where email='YOUR-ADMIN-EMAIL';
