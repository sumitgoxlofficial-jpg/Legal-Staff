-- 0050: review a partner's KYC documents one by one (accept / reject with a reason the partner can see).
-- Rejecting the PAN or bank proof of a partner whose KYC was "verified" sends the KYC back to "submitted" (needs a fresh look)
-- so a payout can never ride on a document that has since been rejected.
create or replace function public.admin_partner_doc_review(p_doc uuid, p_status text, p_note text default '') returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare d public.partner_documents;
begin
  perform public.ps_require('partners.manage');
  if p_status not in ('accepted', 'rejected') then raise exception 'Choose accepted or rejected.'; end if;
  if p_status = 'rejected' and btrim(coalesce(p_note, '')) = '' then raise exception 'Say why the document is rejected: the partner sees this.'; end if;
  update public.partner_documents set status = p_status, note = left(btrim(coalesce(p_note, '')), 500), reviewed_by = public.ps_email(), reviewed_at = now()
    where id = p_doc returning * into d;
  if not found then raise exception 'Document not found.'; end if;
  if p_status = 'rejected' and d.kind in ('pan', 'bank_proof') and d.partner_id is not null then
    update public.partners set kyc_status = 'submitted' where id = d.partner_id and kyc_status = 'verified'
      and not exists (select 1 from public.partner_documents x where x.partner_id = d.partner_id and x.kind = d.kind and x.status <> 'rejected');
  end if;
  perform public.ps_audit('partner.document_' || p_status, 'partner_document', p_doc::text, jsonb_build_object('kind', d.kind, 'note', p_note));
end $$;
revoke execute on function public.admin_partner_doc_review(uuid, text, text) from public, anon;
grant execute on function public.admin_partner_doc_review(uuid, text, text) to authenticated;
