-- Receipt originals and reviewed corrections are private to their owner.
-- This dataset is independent of catalog inclusion and legacy receipt summaries.
create policy "Users can update their own receipt summaries"
  on public.receipts for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create table public.receipt_training_examples (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  schema_version integer not null default 1 check (schema_version = 1),
  original_path text not null,
  ocr_path text not null,
  original_name text not null,
  original_mime text not null,
  ocr_mime text not null,
  raw_ocr_text text not null,
  predicted_lines jsonb not null check (jsonb_typeof(predicted_lines) = 'array'),
  scan_metadata jsonb not null check (jsonb_typeof(scan_metadata) = 'object'),
  ocr_evidence jsonb,
  reviews jsonb not null default '[]'::jsonb check (jsonb_typeof(reviews) = 'array'),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  check (original_path = user_id::text || '/' || id::text || '/original'),
  check (ocr_path = user_id::text || '/' || id::text || '/ocr-input')
);
create index receipt_training_examples_owner_idx on public.receipt_training_examples (user_id, created_at);
alter table public.receipt_training_examples enable row level security;
revoke all on public.receipt_training_examples from anon;
grant select, insert, update, delete on public.receipt_training_examples to authenticated;
create policy "Receipt examples belong to their owner"
  on public.receipt_training_examples for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit)
values ('receipt-training-images', 'receipt-training-images', false, 52428800);
create policy "Receipt images belong to their owner"
  on storage.objects for all to authenticated
  using (bucket_id = 'receipt-training-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'receipt-training-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
