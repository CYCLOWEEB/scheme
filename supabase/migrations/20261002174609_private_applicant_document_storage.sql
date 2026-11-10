-- Private storage and per-browser anonymous document metadata for Scheme Lens.
-- This project stores only user uploads in the private bucket. Demo rows below
-- are fictional labels with no real identity data and no associated file.

create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 150),
  document_type text not null check (document_type in (
    'aadhaar',
    'photo',
    'income_certificate',
    'caste_certificate',
    'project_report',
    'other'
  )),
  storage_path text not null unique,
  mime_type text not null check (mime_type in (
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  )),
  file_size_bytes bigint not null check (file_size_bytes between 1 and 10485760),
  created_at timestamptz not null default now()
);

alter table public.user_documents enable row level security;
revoke all on table public.user_documents from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, delete on table public.user_documents to authenticated;

create index if not exists user_documents_user_id_idx
  on public.user_documents (user_id);

drop policy if exists "Anonymous users read their own documents" on public.user_documents;
create policy "Anonymous users read their own documents"
  on public.user_documents for select to authenticated
  using (
    user_id = (select auth.uid())
    and ((select auth.jwt()) ->> 'is_anonymous') = 'true'
  );

drop policy if exists "Anonymous users add their own documents" on public.user_documents;
create policy "Anonymous users add their own documents"
  on public.user_documents for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and ((select auth.jwt()) ->> 'is_anonymous') = 'true'
  );

drop policy if exists "Anonymous users delete their own documents" on public.user_documents;
create policy "Anonymous users delete their own documents"
  on public.user_documents for delete to authenticated
  using (
    user_id = (select auth.uid())
    and ((select auth.jwt()) ->> 'is_anonymous') = 'true'
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'applicant-documents',
  'applicant-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anonymous users upload their own documents" on storage.objects;
create policy "Anonymous users upload their own documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'applicant-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and ((select auth.jwt()) ->> 'is_anonymous') = 'true'
  );

drop policy if exists "Anonymous users read their own stored documents" on storage.objects;
create policy "Anonymous users read their own stored documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'applicant-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and ((select auth.jwt()) ->> 'is_anonymous') = 'true'
  );

drop policy if exists "Anonymous users delete their own stored documents" on storage.objects;
create policy "Anonymous users delete their own stored documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'applicant-documents'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and ((select auth.jwt()) ->> 'is_anonymous') = 'true'
  );

create table if not exists public.demo_document_examples (
  id text primary key,
  title text not null,
  document_type text not null check (document_type in (
    'aadhaar',
    'photo',
    'income_certificate',
    'caste_certificate',
    'project_report',
    'other'
  )),
  description text not null,
  sort_order smallint not null unique
);

alter table public.demo_document_examples enable row level security;
revoke all on table public.demo_document_examples from public, anon, authenticated;
grant select on table public.demo_document_examples to anon, authenticated;

drop policy if exists "Anyone can read fictional document examples" on public.demo_document_examples;
create policy "Anyone can read fictional document examples"
  on public.demo_document_examples for select to anon, authenticated
  using (true);

insert into public.demo_document_examples (id, title, document_type, description, sort_order)
values
  ('demo-aadhaar', 'Aadhaar card example', 'aadhaar', 'Fictional demo label only. No real Aadhaar number or identity data.', 10),
  ('demo-photo', 'Profile photo example', 'photo', 'Placeholder example only. It contains no photo of a real person.', 20),
  ('demo-income', 'Income certificate example', 'income_certificate', 'Fictional demo label only. It is not issued by a government agency.', 30)
on conflict (id) do update
set title = excluded.title,
    document_type = excluded.document_type,
    description = excluded.description,
    sort_order = excluded.sort_order;
