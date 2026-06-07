import { readSheetRows, toNumber } from '../utils/excel.js';
import { insertImportRun, updateImportRun, upsertOpenInvoices, upsertPaidInvoices, upsertVendors } from '../db/repository.js';

export async function importPaidRegister({ fileBuffer, fileName }) {
  const run = await insertImportRun({ file_name: fileName, import_type: 'paid_register', status: 'processing' });
  try {
    const { rows } = readSheetRows(fileBuffer, 'ReportOutput', 1);
    const paidRows = rows.map((r) => ({
      check_number: r.check_number,
      line_number: toNumber(r.line_number),
      check_date: r.check_date,
      vendor_number: r.vendor_number,
      vendor_name: r.vendor_name,
      vendor_site_code: r.vendor_site_code,
      country: r.country,
      state: r.state,
      amount_paid: toNumber(r.amount_paid),
      payment_currency_code: r.payment_currency_code,
      description: r.description,
      invoice_number: r.invoice_num,
      invoice_date: r.invoice_date,
      invoice_currency_code: r.invoice_currency_code,
      payment_process_request: r.payment_process_request,
      import_run_id: run.id
    })).filter((r) => r.invoice_number || r.check_number);

    const vendors = dedupeBy(paidRows.map((r) => ({
      supplier_number: r.vendor_number,
      supplier_name: r.vendor_name
    })).filter((v) => v.supplier_number), 'supplier_number');

    await upsertVendors(vendors);
    const imported = await upsertPaidInvoices(paidRows);
    return await updateImportRun(run.id, { status: 'completed', rows_imported: imported.length });
  } catch (error) {
    await updateImportRun(run.id, { status: 'failed', error_message: error.message });
    throw error;
  }
}

export async function importOpenInvoices({ fileBuffer, fileName, sourceRegion }) {
  const run = await insertImportRun({ file_name: fileName, import_type: 'open_invoices', status: 'processing', source_region: sourceRegion });
  try {
    const { rows } = readSheetRows(fileBuffer, null, 0);
    const openRows = rows.map((r) => ({
      source_region: sourceRegion,
      operating_unit: r.operating_unit,
      supplier_name: r.supplier_name,
      supplier_number: r.supplier_number,
      invoice_number: r.invoice_number,
      invoice_type_code: r.invoice_type_code,
      pay_group: r.pay_group,
      invoice_status: r.invoice_status,
      payment_terms: r.payment_terms,
      on_hold: r.on_hold,
      payment_due_date: r.payment_due_date,
      ap_aging_status: r.ap_aging_status,
      payment_discount_date: r.payment_discount_date,
      ap_aging_status_discount: r.ap_aging_status_disc,
      invoice_date: r.invoice_date,
      invoice_currency: r.invoice_currency,
      invoice_amount: toNumber(r.invoice_amount),
      usd_invoice_amount: toNumber(r.usd_invoice_amount),
      payment_due_day: r.payment_due_day,
      payment_method: r.payment_method,
      internal_owner: r.user_wf_user_description,
requester: r.user_wf_user_description,
      terms_date: r.terms_date,
      po_number: r.po_number,
      exchange_rate: toNumber(r.exchange_rate),
      liability_account: r.liability_account,
      bank_account_length: r.bank_account_length,
      remit_advice_email: r.remit_advice_email,
      import_run_id: run.id
    })).filter((r) => r.invoice_number && r.supplier_number);

    const vendors = dedupeBy(openRows.map((r) => ({
      supplier_number: r.supplier_number,
      supplier_name: r.supplier_name
    })), 'supplier_number');

    await upsertVendors(vendors);
    const imported = await upsertOpenInvoices(openRows);
    return await updateImportRun(run.id, { status: 'completed', rows_imported: imported.length });
  } catch (error) {
    await updateImportRun(run.id, { status: 'failed', error_message: error.message });
    throw error;
  }
}

function dedupeBy(items, key) {
  return [...new Map(items.filter(Boolean).map((item) => [item[key], item])).values()];
}
