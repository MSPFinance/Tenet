import { supabase } from './supabaseClient.js';

export async function insertImportRun(payload) {
  const { data, error } = await supabase.from('import_runs').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateImportRun(id, payload) {
  const { data, error } = await supabase.from('import_runs').update(payload).eq('id', id).select('*').single();
  if (error) throw error;
  return data;
}

export async function upsertVendors(vendors) {
  if (!vendors.length) return [];
  const { data, error } = await supabase
    .from('vendors')
    .upsert(vendors, { onConflict: 'supplier_number' })
    .select('*');
  if (error) throw error;
  return data;
}

export async function upsertOpenInvoices(rows) {
  if (!rows.length) return [];
  const { data, error } = await supabase
    .from('open_invoices')
    .upsert(rows, { onConflict: 'invoice_number,supplier_number,source_region' })
    .select('*');
  if (error) throw error;
  return data;
}

export async function upsertPaidInvoices(rows) {
  if (!rows.length) return [];
  const { data, error } = await supabase
    .from('paid_invoices')
    .upsert(rows, { onConflict: 'invoice_number,check_number,line_number' })
    .select('*');
  if (error) throw error;
  return data;
}

export async function findVendorHistory({ vendorName, fromDate, toDate }) {
  const search = `%${vendorName}%`;
  const { data: openData, error: openError } = await supabase
    .from('open_invoices')
    .select('*')
    .ilike('supplier_name', search)
    .gte('invoice_date', fromDate || '1900-01-01')
    .lte('invoice_date', toDate || '2999-12-31')
    .order('invoice_date', { ascending: false });
  if (openError) throw openError;

  const { data: paidData, error: paidError } = await supabase
    .from('paid_invoices')
    .select('*')
    .ilike('vendor_name', search)
    .gte('invoice_date', fromDate || '1900-01-01')
    .lte('invoice_date', toDate || '2999-12-31')
    .order('check_date', { ascending: false });
  if (paidError) throw paidError;

  return { openInvoices: openData || [], paidInvoices: paidData || [] };
}
