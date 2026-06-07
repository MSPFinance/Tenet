import { supabase } from './supabaseClient.js';

export async function insertImportRun(payload) {
  const { data, error } = await supabase
    .from('import_runs')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateImportRun(id, payload) {
  const { data, error } = await supabase
    .from('import_runs')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function upsertVendors(vendors) {
  if (!vendors?.length) return [];

  const cleanVendors = vendors
    .map((vendor) => {
      const supplierNumber = normalizeText(vendor.supplier_number || vendor.vendor_number);
      const supplierName = normalizeText(vendor.supplier_name || vendor.vendor_name);

      if (!supplierNumber) return null;

      return {
        supplier_number: supplierNumber,
        vendor_number: supplierNumber,
        supplier_name: supplierName || 'Unknown Vendor',
        vendor_name: supplierName || 'Unknown Vendor',
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  if (!cleanVendors.length) return [];

  const { data, error } = await supabase
    .from('vendors')
    .upsert(cleanVendors, { onConflict: 'supplier_number' })
    .select('*');

  if (error) throw error;
  return data || [];
}

export async function upsertOpenInvoices(rows) {
  if (!rows?.length) return [];

  const cleanRows = rows
    .map((row) => {
      const invoiceNumber = normalizeText(row.invoice_number);
      const supplierNumber = normalizeText(row.supplier_number || row.vendor_number);
      const sourceRegion = normalizeText(row.source_region);

      if (!invoiceNumber || !supplierNumber || !sourceRegion) return null;

      return {
        ...row,
        invoice_number: invoiceNumber,
        supplier_number: supplierNumber,
        vendor_number: supplierNumber,
        source_region: sourceRegion,
        supplier_name: normalizeText(row.supplier_name || row.vendor_name) || 'Unknown Vendor',
        vendor_name: normalizeText(row.vendor_name || row.supplier_name) || 'Unknown Vendor',
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  if (!cleanRows.length) return [];

  const { data, error } = await supabase
    .from('open_invoices')
    .upsert(cleanRows, { onConflict: 'invoice_number,supplier_number,source_region' })
    .select('*');

  if (error) throw error;
  return data || [];
}

export async function upsertPaidInvoices(rows) {
  if (!rows?.length) return [];

  const cleanRows = rows
    .map((row) => {
      const invoiceNumber = normalizeText(row.invoice_number);
      const checkNumber = normalizeText(row.check_number);
      const lineNumber = row.line_number ?? 0;

      if (!invoiceNumber && !checkNumber) return null;

      return {
        ...row,
        invoice_number: invoiceNumber || `NO-INVOICE-${checkNumber}-${lineNumber}`,
        check_number: checkNumber || 'NO-CHECK',
        line_number: lineNumber,
        vendor_number: normalizeText(row.vendor_number || row.supplier_number),
        supplier_number: normalizeText(row.supplier_number || row.vendor_number),
        vendor_name: normalizeText(row.vendor_name || row.supplier_name) || 'Unknown Vendor',
        supplier_name: normalizeText(row.supplier_name || row.vendor_name) || 'Unknown Vendor',
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  if (!cleanRows.length) return [];

  const { data, error } = await supabase
    .from('paid_invoices')
    .upsert(cleanRows, { onConflict: 'invoice_number' })
    .select('*');

  if (error) throw error;
  return data || [];
}

export async function findVendorHistory({
  vendorName,
  vendorNumber,
  invoiceNumber,
  invoiceNumbers,
  fromDate,
  toDate,
  status,
}) {
  const invoiceList = parseList(invoiceNumbers || invoiceNumber);
  const vendorSearch = normalizeText(vendorName);
  const vendorId = normalizeText(vendorNumber);

  let openQuery = supabase.from('open_invoices').select('*');
  let paidQuery = supabase.from('paid_invoices').select('*');

  if (vendorSearch) {
    openQuery = openQuery.ilike('supplier_name', `%${vendorSearch}%`);
    paidQuery = paidQuery.ilike('vendor_name', `%${vendorSearch}%`);
  }

  if (vendorId) {
    openQuery = openQuery.eq('supplier_number', vendorId);
    paidQuery = paidQuery.eq('vendor_number', vendorId);
  }

  if (invoiceList.length) {
    openQuery = openQuery.in('invoice_number', invoiceList);
    paidQuery = paidQuery.in('invoice_number', invoiceList);
  }

  if (status) {
    openQuery = openQuery.ilike('invoice_status', `%${status}%`);
  }

  if (fromDate) {
    openQuery = openQuery.gte('invoice_date', fromDate);
    paidQuery = paidQuery.gte('invoice_date', fromDate);
  }

  if (toDate) {
    openQuery = openQuery.lte('invoice_date', toDate);
    paidQuery = paidQuery.lte('invoice_date', toDate);
  }

  const { data: openData, error: openError } = await openQuery.order('invoice_date', {
    ascending: false,
  });

  if (openError) throw openError;

  const { data: paidData, error: paidError } = await paidQuery.order('check_date', {
    ascending: false,
  });

  if (paidError) throw paidError;

  return {
    openInvoices: openData || [],
    paidInvoices: paidData || [],
  };
}

export async function listVendors() {
  const { data, error } = await supabase
    .from('vendors')
    .select('supplier_number,supplier_name,vendor_number,vendor_name')
    .order('supplier_name', { ascending: true });

  if (error) throw error;
  return data || [];
}

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function parseList(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(normalizeText).filter(Boolean);
  }

  return String(value)
    .split(/[\n,;|]+/g)
    .map(normalizeText)
    .filter(Boolean);
}