-- Fix settings visibility and backups: add CRUD policies, seed defaults, create backups bucket

-- 1) Add public CRUD policies (TEMPORARY) for settings tables
-- platforms
alter table public.platforms enable row level security;
drop policy if exists "Public insert platforms" on public.platforms;
drop policy if exists "Public update platforms" on public.platforms;
drop policy if exists "Public delete platforms" on public.platforms;
create policy "Public insert platforms" on public.platforms for insert with check (true);
create policy "Public update platforms" on public.platforms for update using (true);
create policy "Public delete platforms" on public.platforms for delete using (true);

-- post_statuses
drop policy if exists "Public insert post_statuses" on public.post_statuses;
drop policy if exists "Public update post_statuses" on public.post_statuses;
drop policy if exists "Public delete post_statuses" on public.post_statuses;
create policy "Public insert post_statuses" on public.post_statuses for insert with check (true);
create policy "Public update post_statuses" on public.post_statuses for update using (true);
create policy "Public delete post_statuses" on public.post_statuses for delete using (true);

-- categories
drop policy if exists "Public insert categories" on public.categories;
drop policy if exists "Public update categories" on public.categories;
drop policy if exists "Public delete categories" on public.categories;
create policy "Public insert categories" on public.categories for insert with check (true);
create policy "Public update categories" on public.categories for update using (true);
create policy "Public delete categories" on public.categories for delete using (true);

-- product_lines
drop policy if exists "Public insert product_lines" on public.product_lines;
drop policy if exists "Public update product_lines" on public.product_lines;
drop policy if exists "Public delete product_lines" on public.product_lines;
create policy "Public insert product_lines" on public.product_lines for insert with check (true);
create policy "Public update product_lines" on public.product_lines for update using (true);
create policy "Public delete product_lines" on public.product_lines for delete using (true);

-- pillars
drop policy if exists "Public insert pillars" on public.pillars;
drop policy if exists "Public update pillars" on public.pillars;
drop policy if exists "Public delete pillars" on public.pillars;
create policy "Public insert pillars" on public.pillars for insert with check (true);
create policy "Public update pillars" on public.pillars for update using (true);
create policy "Public delete pillars" on public.pillars for delete using (true);

-- formats
drop policy if exists "Public insert formats" on public.formats;
drop policy if exists "Public update formats" on public.formats;
drop policy if exists "Public delete formats" on public.formats;
create policy "Public insert formats" on public.formats for insert with check (true);
create policy "Public update formats" on public.formats for update using (true);
create policy "Public delete formats" on public.formats for delete using (true);

-- 2) Seed defaults if tables are empty
insert into public.platforms (name, icon_name, color, is_active)
select * from (
  values
    ('facebook','Facebook','#1877F2', true),
    ('instagram','Instagram','#E1306C', true),
    ('twitter','Twitter','#1DA1F2', true),
    ('linkedin','Linkedin','#0A66C2', true)
) as v(name, icon_name, color, is_active)
where not exists (select 1 from public.platforms);

insert into public.post_statuses (name, color, is_active)
select * from (
  values
    ('draft', '#6B7280', true),
    ('scheduled', '#3B82F6', true),
    ('published', '#10B981', true)
) as v(name, color, is_active)
where not exists (select 1 from public.post_statuses);

insert into public.formats (name, color, is_active)
select * from (
  values
    ('image', '#3B82F6', true),
    ('video', '#F59E0B', true),
    ('carousel', '#8B5CF6', true)
) as v(name, color, is_active)
where not exists (select 1 from public.formats);

insert into public.categories (name, color, format, is_active)
select * from (
  values
    ('Image', '#3B82F6', 'image', true),
    ('Video', '#F59E0B', 'video', true),
    ('Carousel', '#8B5CF6', 'carousel', true)
) as v(name, color, format, is_active)
where not exists (select 1 from public.categories);

insert into public.product_lines (name, color, is_active)
select * from (
  values
    ('Cool tea', '#22C55E', true),
    ('Kolekce', '#EF4444', true),
    ('Premier', '#0EA5E9', true)
) as v(name, color, is_active)
where not exists (select 1 from public.product_lines);

insert into public.pillars (name, color, is_active)
select * from (
  values
    ('Rodiče a děti', '#F97316', true),
    ('Lifestyle', '#14B8A6', true)
) as v(name, color, is_active)
where not exists (select 1 from public.pillars);

-- 3) Backups bucket and policies
insert into storage.buckets (id, name, public) values ('backups','backups', false)
on conflict (id) do nothing;

drop policy if exists "Backups public select" on storage.objects;
drop policy if exists "Backups public insert" on storage.objects;
drop policy if exists "Backups public update" on storage.objects;
drop policy if exists "Backups public delete" on storage.objects;
create policy "Backups public select" on storage.objects for select using (bucket_id = 'backups');
create policy "Backups public insert" on storage.objects for insert with check (bucket_id = 'backups');
create policy "Backups public update" on storage.objects for update using (bucket_id = 'backups');
create policy "Backups public delete" on storage.objects for delete using (bucket_id = 'backups');