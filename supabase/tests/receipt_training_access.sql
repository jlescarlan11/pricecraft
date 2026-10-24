-- Run after migrations in a disposable development database. Rolls back all fixtures.
begin;
insert into auth.users (id) values ('10000000-0000-0000-0000-000000000001'), ('20000000-0000-0000-0000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
insert into public.receipt_training_examples (
 id, user_id, original_path, ocr_path, original_name, original_mime, ocr_mime,
 raw_ocr_text, predicted_lines, scan_metadata, created_at, updated_at
) values (
 '30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
 '10000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000003/original',
 '10000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000003/ocr-input',
 'receipt.jpg', 'image/jpeg', 'image/jpeg', 'Rice 177.00', '[]', '{}', now(), now()
);
insert into storage.objects (bucket_id, name) values ('receipt-training-images', '10000000-0000-0000-0000-000000000001/30000000-0000-0000-0000-000000000003/original');
update public.receipt_training_examples set revision = 2;
do $$ begin
 if (select count(*) from public.receipt_training_examples where revision = 2) <> 1 then raise exception 'Owner cannot update own example'; end if;
 if (select count(*) from storage.objects where bucket_id = 'receipt-training-images') <> 1 then raise exception 'Owner cannot read own image'; end if;
 begin
  update public.receipt_training_examples set user_id = '20000000-0000-0000-0000-000000000002',
    original_path = '20000000-0000-0000-0000-000000000002/30000000-0000-0000-0000-000000000003/original',
    ocr_path = '20000000-0000-0000-0000-000000000002/30000000-0000-0000-0000-000000000003/ocr-input';
  raise exception 'Owner reassignment was allowed';
 exception when insufficient_privilege then null; end;
 begin
  insert into storage.objects (bucket_id, name) values ('receipt-training-images', '20000000-0000-0000-0000-000000000002/other/original');
  raise exception 'Writing another owner image was allowed';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
do $$ declare affected integer; begin
 if exists (select 1 from public.receipt_training_examples) then raise exception 'Other owner can read examples'; end if;
 if exists (select 1 from storage.objects where bucket_id = 'receipt-training-images') then raise exception 'Other owner can read images'; end if;
 update public.receipt_training_examples set revision = 3;
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'Other owner can edit example'; end if;
 delete from storage.objects where bucket_id = 'receipt-training-images';
 get diagnostics affected = row_count;
 if affected <> 0 then raise exception 'Other owner can delete image'; end if;
end $$;
set local role anon;
do $$ begin
 begin
  perform 1 from public.receipt_training_examples;
  raise exception 'Anonymous access was allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 if (select public from storage.buckets where id = 'receipt-training-images') then raise exception 'Receipt bucket is public'; end if;
end $$;
rollback;
