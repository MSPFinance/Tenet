import express from 'express';
import { supabase } from '../db/supabaseClient.js';

export const vendorRouter = express.Router();

const AP_MANAGER_LIST = [
  'Karleen Oberton',
  'MacMillan Steve',
  'Griffin, John',
  'Liddy, Anne',
  'Stein, Jay',
  'International Sales Dist…',
  'De Walt, Diana',
  'Aguirre, Monica',
  'Khani, Julie',
  'Mitchell, Essex',
  'Oberton, Karleen',
  'Watts, Michael',
  'Schnitter, Brandon',
  'Christensen, Scott',
  'Schneiders, Jennifer',
  'Horvath, Mark',
  'Malenchini, Paul',
  'Verstreken, Jan',
];

const PROCESSING_DEPARTMENT_LIST = [
  'Nayuribe Alvarez Zuniga',
  'Hector Adolfo Escoto Hernandez',
  'Lizandro Santiesteban',
  'Daniela Gomez',
  'Hairo Vargas',
  'Luis M Ramírez Gamboa',
  'Kimberly Poulin',
  'Amanda Chen Artavia',
  'Stephanie Araya Fuentes',
  'Kenny J Gómez',
  'Yordi Josue Pereira Berrocal',
  'Maria Angel Guerra Rodriguez',
  'Marian Cortes Salazar',
  'Marcia Maria Bolanos Ramirez',
  'Hannia Vargas Hidalgo',
];

function parseList(value) {
  if (!value) return [];
  return String(value)
    .split(/[\n,;|\t ]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function isTodayOrPast(value) {
  if (!value) return false;
  const dueDate = new Date(value);
  const today = new Date();

  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return dueDate <= today;
}

function getInvoiceStatusMessage(invoice, payment) {
  const paymentNumber = payment?.payment_number || payment?.check_number;
  const paymentDate = payment?.payment_date || payment?.check_date;

  const validationStatus =
    invoice?.validation_status ||
    invoice?.invoice_status ||
    invoice?.status ||
    '';

  const requester =
    invoice?.requester ||
    invoice?.internal_owner ||
    invoice?.revalidation_owner ||
    '';

  const dueDate =
    invoice?.due_date ||
    invoice?.payment_due_date ||
    invoice?.terms_date;

  if (!invoice && !payment) {
    return 'Invoice not registered. Please make sure to submit invoice(s) in PDF format to: accounts.payable@hologic.com. Once submitting invoice(s), please do not compile multiple invoices in one PDF. One invoice per PDF. Thanks!';
  }

  if (paymentNumber && paymentDate) {
    return `Invoice already paid, Payment Number ${paymentNumber} / Payment date ${formatDate(paymentDate)}`;
  }

  if (paymentNumber) {
    return `Invoice already paid, Payment Number ${paymentNumber}`;
  }

  if (validationStatus === 'Validated') {
    if (isTodayOrPast(dueDate)) {
      return 'The Invoice is ready for this week payment run';
    }

    return `Invoice is approved, due date is on ${formatDate(dueDate)}`;
  }

  if (AP_MANAGER_LIST.includes(requester)) {
    return 'Please contact AP Manager, AP Supervisor';
  }

  if (PROCESSING_DEPARTMENT_LIST.includes(requester)) {
    return 'Invoice is on a working process from our internal Processing department, we already escalated this invoice in order to be completed and paid in a short period of time';
  }

  if (validationStatus === 'Never Validated' || validationStatus === 'Needs Revalidation') {
    return requester || 'The Invoice is currently pending validation or revalidation';
  }

  if (requester) {
    return `The Invoice is currently being reviewed by the approver and it is pending to be released by ${requester}`;
  }

  return 'The Invoice is currently being reviewed by the approver and it is pending to be released';
}

function enrichInvoices(invoices = [], payments = []) {
  return invoices.map((invoice) => {
    const matchingPayment = payments.find(
      (payment) =>
        normalize(payment.invoice_number) === normalize(invoice.invoice_number) &&
        normalize(payment.vendor_name || payment.supplier_name) === normalize(invoice.vendor_name || invoice.supplier_name)
    );

    return {
      ...invoice,
      vendor_name: invoice.vendor_name || invoice.supplier_name || '',
      supplier_name: invoice.supplier_name || invoice.vendor_name || '',
      requester: invoice.requester || invoice.internal_owner || '',
      status_message: getInvoiceStatusMessage(invoice, matchingPayment),
      debit_balance: invoice.debit_balance || invoice.net_balance || '',
    };
  });
}

vendorRouter.get('/list', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('supplier_name, vendor_name, supplier_number')
      .limit(5000);

    if (error) throw error;

    const vendors = Array.from(
      new Map(
        (data || [])
          .map((row) => {
            const name = row.supplier_name || row.vendor_name || '';
            const number = row.supplier_number || '';
            return [normalize(`${name}-${number}`), { name, number }];
          })
          .filter(([, vendor]) => vendor.name)
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name));

    res.json({ vendors });
  } catch (error) {
    next(error);
  }
});

vendorRouter.get('/history', async (req, res, next) => {
  try {
    const { vendorName, vendorNumber, invoiceNumber, invoiceNumbers, fromDate, toDate } = req.query;

    const invoiceList = parseList(invoiceNumbers || invoiceNumber);

    if (!vendorName && !vendorNumber && invoiceList.length === 0) {
      return res.status(400).json({
        error: 'Please enter vendor name, vendor number, or invoice number.',
      });
    }

    let invoicesQuery = supabase.from('invoices').select('*').order('invoice_date', { ascending: false }).limit(3000);
    let paymentsQuery = supabase.from('payments').select('*').order('payment_date', { ascending: false }).limit(3000);

    if (vendorName) invoicesQuery = invoicesQuery.or(`vendor_name.ilike.%${vendorName}%,supplier_name.ilike.%${vendorName}%`);
    if (vendorName) paymentsQuery = paymentsQuery.ilike('vendor_name', `%${vendorName}%`);

    if (vendorNumber) invoicesQuery = invoicesQuery.eq('supplier_number', vendorNumber);
    if (vendorNumber) paymentsQuery = paymentsQuery.eq('vendor_number', vendorNumber);

    if (invoiceList.length === 1) {
      invoicesQuery = invoicesQuery.ilike('invoice_number', `%${invoiceList[0]}%`);
      paymentsQuery = paymentsQuery.ilike('invoice_number', `%${invoiceList[0]}%`);
    }

    if (invoiceList.length > 1) {
      invoicesQuery = invoicesQuery.in('invoice_number', invoiceList);
      paymentsQuery = paymentsQuery.in('invoice_number', invoiceList);
    }

    if (fromDate) invoicesQuery = invoicesQuery.gte('invoice_date', fromDate);
    if (toDate) invoicesQuery = invoicesQuery.lte('invoice_date', toDate);

    const { data: invoices, error: invoicesError } = await invoicesQuery;
    if (invoicesError) throw invoicesError;

    const { data: payments, error: paymentsError } = await paymentsQuery;
    if (paymentsError) throw paymentsError;

    const enrichedInvoices = enrichInvoices(invoices || [], payments || []);

    const foundInvoiceNumbers = new Set(enrichedInvoices.map((row) => normalize(row.invoice_number)));
    const missingInvoiceNumbers = invoiceList.filter((invoice) => !foundInvoiceNumbers.has(normalize(invoice)));

    res.json({
      invoices: enrichedInvoices,
      payments: payments || [],
      openInvoices: enrichedInvoices.filter((row) => !row.is_paid),
      paidInvoices: payments || [],
      missingInvoiceNumbers,
    });
  } catch (error) {
    next(error);
  }
});

vendorRouter.get('/dashboard', async (req, res, next) => {
  try {
    const {
      vendorName,
      vendorNames,
      vendorNumber,
      invoiceNumber,
      invoiceNumbers,
      fromDate,
      toDate,
      status,
      paidStatus,
      discountEligible,
      region,
      currency,
      minAmount,
      maxAmount,
    } = req.query;

    const vendorNameList = parseList(vendorNames || vendorName);
    const invoiceList = parseList(invoiceNumbers || invoiceNumber);

    let query = supabase.from('invoices').select('*').order('invoice_date', { ascending: false }).limit(3000);

    if (vendorNameList.length === 1) {
      query = query.or(`vendor_name.ilike.%${vendorNameList[0]}%,supplier_name.ilike.%${vendorNameList[0]}%`);
    }

    if (vendorNumber) query = query.eq('supplier_number', vendorNumber);

    if (invoiceList.length === 1) {
      query = query.ilike('invoice_number', `%${invoiceList[0]}%`);
    }

    if (invoiceList.length > 1) {
      query = query.in('invoice_number', invoiceList);
    }

    if (fromDate) query = query.gte('invoice_date', fromDate);
    if (toDate) query = query.lte('invoice_date', toDate);
    if (status && status !== 'all') query = query.eq('status', status);
    if (region && region !== 'all') query = query.eq('source_region', region);
    if (currency && currency !== 'all') query = query.eq('invoice_currency', currency);
    if (minAmount) query = query.gte('invoice_amount', Number(minAmount));
    if (maxAmount) query = query.lte('invoice_amount', Number(maxAmount));
    if (paidStatus === 'paid') query = query.eq('is_paid', true);
    if (paidStatus === 'unpaid') query = query.eq('is_paid', false);

    const { data, error } = await query;
    if (error) throw error;

    let rows = enrichInvoices(data || [], []);

    if (vendorNameList.length > 1) {
      rows = rows.filter((row) =>
        vendorNameList.some((name) =>
          normalize(row.vendor_name || row.supplier_name).includes(normalize(name))
        )
      );
    }

    if (discountEligible === 'yes') {
      rows = rows.filter((row) => row.payment_discount_date || Number(row.discount_percent || 0) > 0);
    }

    if (discountEligible === 'no') {
      rows = rows.filter((row) => !row.payment_discount_date && Number(row.discount_percent || 0) <= 0);
    }

    const foundInvoiceNumbers = new Set(rows.map((row) => normalize(row.invoice_number)));
    const missingInvoiceNumbers = invoiceList.filter((invoice) => !foundInvoiceNumbers.has(normalize(invoice)));

    const summary = {
      total: rows.length,
      paid: rows.filter((row) => row.is_paid).length,
      open: rows.filter((row) => !row.is_paid).length,
      rejected: rows.filter((row) => row.status === 'rejected').length,
      needs_revalidation: rows.filter((row) => row.status === 'needs_revalidation' || row.invoice_status === 'Needs Revalidation').length,
      discount_eligible: rows.filter((row) => row.payment_discount_date || Number(row.discount_percent || 0) > 0).length,
      total_amount: rows.reduce((sum, row) => sum + Number(row.invoice_amount || 0), 0),
    };

    res.json({
      summary,
      invoices: rows,
      missingInvoiceNumbers,
    });
  } catch (error) {
    next(error);
  }
});

vendorRouter.post('/correct-vendor', async (req, res, next) => {
  try {
    const { invoiceNumbers, supplierName, supplierNumber } = req.body;

    const invoiceList = parseList(invoiceNumbers);

    if (!invoiceList.length) {
      return res.status(400).json({ error: 'At least one invoice number is required.' });
    }

    if (!supplierName && !supplierNumber) {
      return res.status(400).json({ error: 'Supplier name or supplier number is required.' });
    }

    const updates = {
      updated_at: new Date().toISOString(),
    };

    if (supplierName) {
      updates.supplier_name = supplierName;
      updates.vendor_name = supplierName;
    }

    if (supplierNumber) {
      updates.supplier_number = supplierNumber;
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .in('invoice_number', invoiceList)
      .select('*');

    if (error) throw error;

    res.json({
      success: true,
      updated: data || [],
      updated_count: data?.length || 0,
    });
  } catch (error) {
    next(error);
  }
});