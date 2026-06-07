const AP_MANAGER_OWNERS = new Set([
  'Karleen Oberton', 'MacMillan Steve', 'Griffin, John', 'Liddy, Anne', 'Stein, Jay',
  'International Sales Dist…', 'De Walt, Diana', 'Aguirre, Monica', 'Khani, Julie',
  'Mitchell, Essex', 'Oberton, Karleen', 'Watts, Michael', 'Schnitter, Brandon',
  'Christensen, Scott', 'Schneiders, Jennifer', 'Horvath, Mark', 'Malenchini, Paul', 'Verstreken, Jan'
]);

const PROCESSING_OWNERS = new Set([
  'Nayuribe Alvarez Zuniga', 'Hector Adolfo Escoto Hernandez', 'Lizandro Santiesteban',
  'Daniela Gomez', 'Hairo Vargas', 'Luis M Ramírez Gamboa', 'Kimberly Poulin',
  'Amanda Chen Artavia', 'Stephanie Araya Fuentes', 'Kenny J Gómez',
  'Yordi Josue Pereira Berrocal', 'Maria Angel Guerra Rodriguez', 'Marian Cortes Salazar',
  'Marcia Maria Bolanos Ramirez', 'Hannia Vargas Hidalgo'
]);

export function buildInvoiceStatus({ paidInvoice, openInvoice, today = new Date() }) {
  if (!paidInvoice && !openInvoice) {
    return {
      normalized_status: 'not_registered',
      message: 'Invoice not registered. Please submit invoice in PDF format to Accounts Payable. Use one invoice per PDF.'
    };
  }

  if (paidInvoice?.check_number && paidInvoice?.check_date) {
    return {
      normalized_status: 'paid',
      message: `Invoice already paid. Payment Number ${paidInvoice.check_number} / Payment date ${formatDate(paidInvoice.check_date)}.`
    };
  }

  if (paidInvoice?.check_number) {
    return {
      normalized_status: 'paid',
      message: `Invoice already paid. Payment Number ${paidInvoice.check_number}.`
    };
  }

  const status = openInvoice?.invoice_status;
  const owner = openInvoice?.internal_owner;
  const dueDate = openInvoice?.payment_due_date ? new Date(openInvoice.payment_due_date) : null;

  if (status === 'Validated') {
    if (!dueDate || dueDate <= startOfDay(today)) {
      return { normalized_status: 'approved_ready_to_pay', message: 'Invoice is approved and ready for this week payment run.' };
    }
    return { normalized_status: 'approved_future_due', message: `Invoice is approved. Due date is ${formatDate(dueDate)}.` };
  }

  if (AP_MANAGER_OWNERS.has(owner)) {
    return { normalized_status: 'manager_review', message: 'Please contact AP Manager / AP Supervisor.' };
  }

  if (PROCESSING_OWNERS.has(owner)) {
    return {
      normalized_status: 'processing',
      message: 'Invoice is in process with the internal Processing department and has been escalated for completion.'
    };
  }

  if (status === 'Never Validated') {
    return { normalized_status: 'never_validated', message: owner || 'Invoice was never validated.' };
  }

  if (status === 'Needs Revalidation') {
    return { normalized_status: 'needs_revalidation', message: owner ? `Pending revalidation by ${owner}.` : 'Pending revalidation.' };
  }

  return {
    normalized_status: 'pending_approver_review',
    message: owner ? `Invoice is currently being reviewed and pending release by ${owner}.` : 'Invoice is currently being reviewed and pending release.'
  };
}

function formatDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: '2-digit' });
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
