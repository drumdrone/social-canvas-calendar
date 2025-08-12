-- Enable CRUD on settings tables and seed defaults; create backups bucket with permissive policies

-- 1) RLS policies for settings tables (public CRUD temporarily)
-- platforms
alter table public.platforms enable row level security;
create policy if not exists "Public insert platforms" on public.platforms for insert with check (true);
create policy if not exists "Public update platforms" on public.platforms for update using (true);
create policy if not exists "Public delete platforms" on public.platforms for delete using (true);

-- post_statuses
alter table public.post_statuses enable row level security;
create policy if not exists "Public insert post_statuses" on public.post_statuses for insert with check (true);
create policy if not exists "Public update post_statuses" on public.post_statuses for update using (true);
create policy if not exists "Public delete post_statuses" on public.post_statuses for delete using (true);

-- categories
alter table public.categories enable row level security;
create policy if not exists "Public insert categories" on public.categories for insert with check (true);
create policy if not exists "Public update categories" on public.categories for update using (true);
create policy if not exists "Public delete categories" on public.categories for delete using (true);

-- product_lines
alter table public.product_lines enable row level security;
create policy if not exists "Public insert product_lines" on public.product_lines for insert with check (true);
create policy if not exists "Public update product_lines" on public.product_lines for update using (true);
create policy if not exists "Public delete product_lines" on public.product_lines for delete using (true);

-- pillars
alter table public.pillars enable row level security;
create policy if not exists "Public insert pillars" on public.pillars for insert with check (true);
create policy if not exists "Public update pillars" on public.pillars for update using (true);
create policy if not exists "Public delete pillars" on public.pillars for delete using (true);

-- formats
alter table public.formats enable row level security;
create policy if not exists "Public insert formats" on public.formats for insert with check (true);
create policy if not exists "Public update formats" on public.formats for update using (true);
create policy if not exists "Public delete formats" on public.formats for delete using (true);

-- 2) Seed defaults if tables are empty
-- platforms
insert into public.platforms (name, icon_name, color, is_active)
select * from (
  values
    ('facebook','Facebook','#1877F2', true),
    ('instagram','Instagram','#E1306C', true),
    ('twitter','Twitter','#1DA1F2', true),
    ('linkedin','Linkedin','#0A66C2', true)
) as v(name, icon_name, color, is_active)
where not exists (select 1 from public.platforms);

-- post_statuses
insert into public.post_statuses (name, color, is_active)
select * from (
  values
    ('draft', '#6B7280', true),
    ('scheduled', '#3B82F6', true),
    ('published', '#10B981', true)
) as v(name, color, is_active)
where not exists (select 1 from public.post_statuses);

-- formats
insert into public.formats (name, color, is_active)
select * from (
  values
    ('image', '#3B82F6', true),
    ('video', '#F59E0B', true),
    ('carousel', '#8B5CF6', true)
) as v(name, color, is_active)
where not exists (select 1 from public.formats);

-- categories
insert into public.categories (name, color, format, is_active)
select * from (
  values
    ('Image', '#3B82F6', 'image', true),
    ('Video', '#F59E0B', 'video', true),
    ('Carousel', '#8B5CF6', 'carousel', true)
) as v(name, color, format, is_active)
where not exists (select 1 from public.categories);

-- product_lines
insert into public.product_lines (name, color, is_active)
select * from (
  values
    ('Cool tea', '#22C55E', true),
    ('Kolekce', '#EF4444', true),
    ('Premier', '#0EA5E9', true)
) as v(name, color, is_active)
where not exists (select 1 from public.product_lines);

-- pillars
insert into public.pillars (name, color, is_active)
select * from (
  values
    ('Rodiče a děti', '#F97316', true),
    ('Lifestyle', '#14B8A6', true)
) as v(name, color, is_active)
where not exists (select 1 from public.pillars);

-- 3) Create a private backups bucket and permissive policies
insert into storage.buckets (id, name, public) values ('backups','backups', false)
on conflict (id) do nothing;

-- Policies on storage.objects for backups
create policy if not exists "Backups public select" on storage.objects
for select using (bucket_id = 'backups');

create policy if not exists "Backups public insert" on storage.objects
for insert with check (bucket_id = 'backups');

create policy if not exists "Backups public update" on storage.objects
for update using (bucket_id = 'backups');

create policy if not exists "Backups public delete" on storage.objects
for delete using (bucket_id = 'backups');