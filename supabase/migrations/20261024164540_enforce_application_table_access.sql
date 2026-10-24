-- Apply the same access rules when recreating the app from migration history.
alter table public.presets enable row level security;
revoke all on public.presets from anon;
grant select, insert, update, delete on public.presets to authenticated;
alter table public.catalog_ingredients enable row level security;
revoke all on public.catalog_ingredients from anon;
grant select, insert, update, delete on public.catalog_ingredients to authenticated;
alter table public.receipts enable row level security;
revoke all on public.receipts from anon;
grant select, insert, update, delete on public.receipts to authenticated;
alter table public.price_history enable row level security;
revoke all on public.price_history from anon;
grant select, insert, update, delete on public.price_history to authenticated;
alter table public.sales enable row level security;
revoke all on public.sales from anon;
grant select, insert, update, delete on public.sales to authenticated;
alter policy "Users can view their own presets" on public.presets to authenticated;
alter policy "Users can insert their own presets" on public.presets to authenticated;
alter policy "Users can update their own presets" on public.presets to authenticated with check (auth.uid() = user_id);
alter policy "Users can delete their own presets" on public.presets to authenticated;
alter policy "Users can view their own catalog" on public.catalog_ingredients to authenticated;
alter policy "Users can insert their own catalog" on public.catalog_ingredients to authenticated;
alter policy "Users can update their own catalog" on public.catalog_ingredients to authenticated with check (auth.uid() = user_id);
alter policy "Users can delete their own catalog" on public.catalog_ingredients to authenticated;
alter policy "Users can view their own receipts" on public.receipts to authenticated;
alter policy "Users can insert their own receipts" on public.receipts to authenticated;
alter policy "Users can delete their own receipts" on public.receipts to authenticated;
alter policy "Users can view their own price history" on public.price_history to authenticated;
alter policy "Users can insert their own price history" on public.price_history to authenticated;
alter policy "Users can delete their own price history" on public.price_history to authenticated;
alter policy "Users can view their own sales" on public.sales to authenticated;
alter policy "Users can insert their own sales" on public.sales to authenticated;
alter policy "Users can update their own sales" on public.sales to authenticated with check (auth.uid() = user_id);
alter policy "Users can delete their own sales" on public.sales to authenticated;

-- Supabase's optional automatic-RLS event trigger is not a client RPC.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
