-- Enable RLS
alter table if exists public.presets enable row level security;

-- Create presets table
create table if not exists public.presets (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  preset_type text not null default 'default',
  base_recipe jsonb not null default '{}'::jsonb,
  variants jsonb not null default '[]'::jsonb,
  pricing_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz,
  
  constraint presets_pkey primary key (id)
);

-- Policies
create policy "Users can view their own presets"
  on public.presets for select
  using (auth.uid() = user_id);

create policy "Users can insert their own presets"
  on public.presets for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own presets"
  on public.presets for update
  using (auth.uid() = user_id);

create policy "Users can delete their own presets"
  on public.presets for delete
  using (auth.uid() = user_id);

-- Optional: Create an index on user_id for faster lookups
create index if not exists presets_user_id_idx on public.presets (user_id);

-- ============================================================================
-- Catalog: personal ingredient library
-- ============================================================================

create table if not exists public.catalog_ingredients (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  purchase_quantity numeric not null,
  purchase_unit text not null,
  purchase_cost numeric not null,
  current_price_per_base_unit numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_synced_at timestamptz,
  constraint catalog_ingredients_pkey primary key (id)
);

alter table public.catalog_ingredients enable row level security;

create policy "Users can view their own catalog"
  on public.catalog_ingredients for select using (auth.uid() = user_id);
create policy "Users can insert their own catalog"
  on public.catalog_ingredients for insert with check (auth.uid() = user_id);
create policy "Users can update their own catalog"
  on public.catalog_ingredients for update using (auth.uid() = user_id);
create policy "Users can delete their own catalog"
  on public.catalog_ingredients for delete using (auth.uid() = user_id);

create index if not exists catalog_ingredients_user_id_idx on public.catalog_ingredients (user_id);
create index if not exists catalog_ingredients_normalized_name_idx on public.catalog_ingredients (user_id, normalized_name);

-- ============================================================================
-- Receipts: scan history
-- ============================================================================

create table if not exists public.receipts (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_name text,
  scanned_at timestamptz not null default now(),
  raw_ocr_text text,
  line_count int not null default 0,
  accepted_count int not null default 0,
  constraint receipts_pkey primary key (id)
);

alter table public.receipts enable row level security;

create policy "Users can view their own receipts"
  on public.receipts for select using (auth.uid() = user_id);
create policy "Users can insert their own receipts"
  on public.receipts for insert with check (auth.uid() = user_id);
create policy "Users can delete their own receipts"
  on public.receipts for delete using (auth.uid() = user_id);

create index if not exists receipts_user_id_idx on public.receipts (user_id);

-- ============================================================================
-- Price history: append-only price log per catalog ingredient
-- ============================================================================

create table if not exists public.price_history (
  id uuid not null default gen_random_uuid(),
  catalog_ingredient_id uuid not null references public.catalog_ingredients(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  purchase_quantity numeric not null,
  purchase_unit text not null,
  purchase_cost numeric not null,
  source text not null check (source in ('manual', 'receipt')),
  receipt_id uuid references public.receipts(id) on delete set null,
  recorded_at timestamptz not null default now(),
  constraint price_history_pkey primary key (id)
);

alter table public.price_history enable row level security;

create policy "Users can view their own price history"
  on public.price_history for select using (auth.uid() = user_id);
create policy "Users can insert their own price history"
  on public.price_history for insert with check (auth.uid() = user_id);
create policy "Users can delete their own price history"
  on public.price_history for delete using (auth.uid() = user_id);

create index if not exists price_history_ingredient_idx on public.price_history (catalog_ingredient_id, recorded_at desc);
create index if not exists price_history_user_id_idx on public.price_history (user_id);

-- ============================================================================
-- Sales: planned vs actual reconciliation
-- ============================================================================

create table if not exists public.sales (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preset_id uuid,
  preset_name text,
  units_sold numeric not null default 0,
  actual_price_per_unit numeric not null default 0,
  actual_cost_per_unit numeric not null default 0,
  occurred_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  constraint sales_pkey primary key (id)
);

alter table public.sales enable row level security;

create policy "Users can view their own sales"
  on public.sales for select using (auth.uid() = user_id);
create policy "Users can insert their own sales"
  on public.sales for insert with check (auth.uid() = user_id);
create policy "Users can update their own sales"
  on public.sales for update using (auth.uid() = user_id);
create policy "Users can delete their own sales"
  on public.sales for delete using (auth.uid() = user_id);

create index if not exists sales_user_idx on public.sales (user_id, occurred_at desc);
