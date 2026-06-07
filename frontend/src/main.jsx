import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Upload, Search, Database, FileCheck2, Trash2, BarChart3, FileSpreadsheet, Mail, Copy, Wrench } from 'lucide-react';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

function App() {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Accounts Payable Automation</p>
          <h1>AP Vendor Invoice Review</h1>
          <p>Drag and drop Excel reports, review invoice lists, correct vendor mismatches, and generate email-ready tables.</p>
        </div>
        <div className="hero-card">
          <Database size={30} />
          <span>Box + Supabase Pilot</span>
        </div>
      </header>

      <nav className="tabs">
        <button className={activeTab === 'upload' ? 'active' : ''} onClick={() => setActiveTab('upload')}><Upload size={18} /> Upload Center</button>
        <button className={activeTab === 'review' ? 'active' : ''} onClick={() => setActiveTab('review')}><Wrench size={18} /> Invoice Review</button>
        <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}><BarChart3 size={18} /> Visual Dashboard</button>
        <button className={activeTab === 'vendors' ? 'active' : ''} onClick={() => setActiveTab('vendors')}><Search size={18} /> Vendor Search</button>
        <button className={activeTab === 'email' ? 'active' : ''} onClick={() => setActiveTab('email')}><Mail size={18} /> Email Generator</button>
        <button className={activeTab === 'admin' ? 'active' : ''} onClick={() => setActiveTab('admin')}><Trash2 size={18} /> Admin Cleanup</button>
      </nav>

      {activeTab === 'upload' && <UploadCenter />}
      {activeTab === 'review' && <InvoiceReview />}
      {activeTab === 'dashboard' && <LiveDashboard />}
      {activeTab === 'vendors' && <VendorSearch />}
      {activeTab === 'email' && <EmailGenerator />}
      {activeTab === 'admin' && <AdminCleanup />}
    </main>
  );
}

function getDefaultFilters() {
  return {
    vendorNames: [],
    vendorNumber: '',
    invoiceNumbers: '',
    fromDate: '',
    toDate: '',
    status: 'all',
    paidStatus: 'all',
    discountEligible: 'all',
    region: 'all',
    currency: 'all',
    minAmount: '',
    maxAmount: '',
  };
}

function parseInvoiceList(value) {
  return String(value || '')
    .split(/[\n,;|\t ]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function fetchDashboard(filters) {
  const params = new URLSearchParams();

  if (filters.vendorNames?.length) params.set('vendorNames', filters.vendorNames.join('|'));
  if (filters.vendorNumber) params.set('vendorNumber', filters.vendorNumber);
  if (filters.invoiceNumbers) params.set('invoiceNumbers', filters.invoiceNumbers);
  if (filters.fromDate) params.set('fromDate', filters.fromDate);
  if (filters.toDate) params.set('toDate', filters.toDate);
  if (filters.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters.paidStatus && filters.paidStatus !== 'all') params.set('paidStatus', filters.paidStatus);
  if (filters.discountEligible && filters.discountEligible !== 'all') params.set('discountEligible', filters.discountEligible);
  if (filters.region && filters.region !== 'all') params.set('region', filters.region);
  if (filters.currency && filters.currency !== 'all') params.set('currency', filters.currency);
  if (filters.minAmount) params.set('minAmount', filters.minAmount);
  if (filters.maxAmount) params.set('maxAmount', filters.maxAmount);

  const res = await fetch(`${API_BASE}/vendors/dashboard?${params.toString()}`);
  const json = await res.json();

  if (!res.ok) throw new Error(json.error || 'Dashboard failed to load.');
  return json;
}

function VendorMultiSelect({ selected, onChange }) {
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    async function loadVendors() {
      try {
        const res = await fetch(`${API_BASE}/vendors/list`);
        const json = await res.json();
        setVendors(json.vendors || []);
      } catch {
        setVendors([]);
      }
    }

    loadVendors();
  }, []);

  function toggleVendor(name) {
    if (!name) return;

    if (selected.includes(name)) {
      onChange(selected.filter((item) => item !== name));
    } else {
      onChange([...selected, name]);
    }
  }

  return (
    <div className="vendor-picker">
      <select value="" onChange={(e) => toggleVendor(e.target.value)}>
        <option value="">Add vendor filter</option>
        {vendors.map((vendor) => (
          <option key={`${vendor.name}-${vendor.number}`} value={vendor.name}>
            {vendor.name} {vendor.number ? `- ${vendor.number}` : ''}
          </option>
        ))}
      </select>

      {selected.length > 0 && (
        <div className="selected-tags">
          {selected.map((name) => (
            <button type="button" key={name} onClick={() => toggleVendor(name)}>
              {name} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DashboardFilters({ filters, updateFilter }) {
  return (
    <div className="dashboard-filters">
      <VendorMultiSelect selected={filters.vendorNames} onChange={(value) => updateFilter('vendorNames', value)} />

      <input placeholder="Vendor / Supplier number" value={filters.vendorNumber} onChange={(e) => updateFilter('vendorNumber', e.target.value)} />

      <textarea
        placeholder="Paste one or multiple invoice numbers here"
        value={filters.invoiceNumbers}
        onChange={(e) => updateFilter('invoiceNumbers', e.target.value)}
      />

      <input type="date" value={filters.fromDate} onChange={(e) => updateFilter('fromDate', e.target.value)} />
      <input type="date" value={filters.toDate} onChange={(e) => updateFilter('toDate', e.target.value)} />

      <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
        <option value="all">All statuses</option>
        <option value="open">Open</option>
        <option value="paid">Paid</option>
        <option value="approved">Approved</option>
        <option value="pending">Pending</option>
        <option value="needs_revalidation">Needs Revalidation</option>
        <option value="rejected">Rejected</option>
      </select>

      <select value={filters.paidStatus} onChange={(e) => updateFilter('paidStatus', e.target.value)}>
        <option value="all">Paid and unpaid</option>
        <option value="paid">Paid only</option>
        <option value="unpaid">Unpaid only</option>
      </select>

      <select value={filters.discountEligible} onChange={(e) => updateFilter('discountEligible', e.target.value)}>
        <option value="all">All discounts</option>
        <option value="yes">Discount eligible</option>
        <option value="no">No discount</option>
      </select>

      <select value={filters.region} onChange={(e) => updateFilter('region', e.target.value)}>
        <option value="all">All regions</option>
        <option value="USA">USA</option>
        <option value="CR">CR</option>
        <option value="EMEA">EMEA</option>
        <option value="HUB">HUB</option>
      </select>

      <select value={filters.currency} onChange={(e) => updateFilter('currency', e.target.value)}>
        <option value="all">All currencies</option>
        <option value="USD">USD</option>
        <option value="CRC">CRC</option>
        <option value="EUR">EUR</option>
      </select>

      <input placeholder="Min amount" type="number" value={filters.minAmount} onChange={(e) => updateFilter('minAmount', e.target.value)} />
      <input placeholder="Max amount" type="number" value={filters.maxAmount} onChange={(e) => updateFilter('maxAmount', e.target.value)} />
    </div>
  );
}

function InvoiceReview() {
  const [filters, setFilters] = useState(getDefaultFilters());
  const [data, setData] = useState({ invoices: [], missingInvoiceNumbers: [] });
  const [message, setMessage] = useState('');
  const [correctVendorName, setCorrectVendorName] = useState('');
  const [correctVendorNumber, setCorrectVendorNumber] = useState('');

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  async function searchInvoices() {
    try {
      const json = await fetchDashboard(filters);
      setData(json);
      setMessage(`Found ${json.invoices?.length || 0} invoice(s).`);
    } catch (err) {
      setMessage(err.message);
    }
  }

  async function updateVendor() {
    try {
      const invoiceNumbers = parseInvoiceList(filters.invoiceNumbers);

      if (!invoiceNumbers.length) {
        setMessage('Paste invoice numbers first before updating vendor.');
        return;
      }

      if (!correctVendorName && !correctVendorNumber) {
        setMessage('Enter the correct vendor name or vendor number.');
        return;
      }

      const res = await fetch(`${API_BASE}/vendors/correct-vendor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumbers,
          supplierName: correctVendorName,
          supplierNumber: correctVendorNumber,
        }),
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Vendor update failed.');

      setMessage(`Updated ${json.updated_count || 0} invoice(s).`);
      await searchInvoices();
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Bulk Invoice Review</p>
          <h2>Invoice List Search & Vendor Correction</h2>
          <p>Paste a list of invoices, review their vendor assignment, correct vendor mismatches, then generate email-ready information.</p>
        </div>
        <button onClick={searchInvoices}>Search Invoice List</button>
      </div>

      <DashboardFilters filters={filters} updateFilter={updateFilter} />

      <div className="dashboard-table-card">
        <h3>Correct Vendor for Pasted Invoice List</h3>
        <div className="filters">
          <input placeholder="Correct supplier name" value={correctVendorName} onChange={(e) => setCorrectVendorName(e.target.value)} />
          <input placeholder="Correct supplier number" value={correctVendorNumber} onChange={(e) => setCorrectVendorNumber(e.target.value)} />
          <button onClick={updateVendor}>Update Vendor Match</button>
        </div>
      </div>

      {message && <p className="message">{message}</p>}

      {data.missingInvoiceNumbers?.length > 0 && (
        <div className="dashboard-table-card">
          <h3>Invoices Not Found</h3>
          <p>{data.missingInvoiceNumbers.join(', ')}</p>
        </div>
      )}

      <div className="dashboard-table-card">
        <h3>Invoice Review Results</h3>
        <SimpleTable rows={data.invoices || []} columns={invoiceEmailColumns()} />
      </div>

      <EmailPreview invoices={data.invoices || []} />
    </section>
  );
}

function LiveDashboard() {
  const [filters, setFilters] = useState(getDefaultFilters());
  const [data, setData] = useState({ summary: {}, invoices: [] });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const delay = setTimeout(() => loadDashboard(), 400);
    return () => clearTimeout(delay);
  }, [filters]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  async function loadDashboard() {
    try {
      const json = await fetchDashboard(filters);
      setData(json);
      setMessage('');
    } catch (err) {
      setMessage(err.message);
    }
  }

  const invoices = data.invoices || [];
  const summary = data.summary || {};

  return (
    <section className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Live Accounts Payable View</p>
          <h2>Visual Invoice Dashboard</h2>
          <p>Filter by vendor, invoice list, invoice number, vendor number, status, region, dates, discount, amount, and payment status.</p>
        </div>
        <button onClick={loadDashboard}>Refresh Dashboard</button>
      </div>

      <DashboardFilters filters={filters} updateFilter={updateFilter} />

      {message && <p className="message">{message}</p>}

      <div className="kpi-grid">
        <MetricCard label="Total invoices" value={summary.total || 0} />
        <MetricCard label="Paid" value={summary.paid || 0} />
        <MetricCard label="Open" value={summary.open || 0} />
        <MetricCard label="Discount eligible" value={summary.discount_eligible || 0} />
        <MetricCard label="Rejected" value={summary.rejected || 0} />
        <MetricCard label="Needs revalidation" value={summary.needs_revalidation || 0} />
        <MetricCard label="Total amount" value={`$${Number(summary.total_amount || 0).toLocaleString()}`} />
        <MetricCard label="Rows showing" value={invoices.length} />
      </div>

      <div className="dashboard-table-card">
        <h3>Filtered Invoice Results</h3>
        <SimpleTable rows={invoices} columns={invoiceEmailColumns()} />
      </div>
    </section>
  );
}

function EmailGenerator() {
  const [filters, setFilters] = useState(getDefaultFilters());
  const [data, setData] = useState({ invoices: [] });
  const [message, setMessage] = useState('');

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  async function generateEmail() {
    try {
      const json = await fetchDashboard(filters);
      setData(json);
      setMessage(`Email generated with ${json.invoices?.length || 0} invoice(s).`);
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <p className="eyebrow">Copy/Paste Email Support</p>
          <h2>Email Generator</h2>
          <p>Generate a separate email-ready table from filtered invoice results.</p>
        </div>
        <button onClick={generateEmail}>Generate Email</button>
      </div>

      <DashboardFilters filters={filters} updateFilter={updateFilter} />

      {message && <p className="message">{message}</p>}

      <EmailPreview invoices={data.invoices || []} />
    </section>
  );
}

function EmailPreview({ invoices }) {
  const [message, setMessage] = useState('');
  const emailText = useMemo(() => buildEmailText(invoices || []), [invoices]);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(emailText);
      setMessage('Email table copied to clipboard.');
    } catch {
      setMessage('Unable to copy automatically. Please select the table and copy manually.');
    }
  }

  return (
    <div className="dashboard-table-card">
      <div className="dashboard-header mini-header">
        <div>
          <h3>Email Template Preview</h3>
          <p>Copy and paste this into the email body.</p>
        </div>
        <button onClick={copyEmail}><Copy size={16} /> Copy Email</button>
      </div>

      {message && <p className="message">{message}</p>}
      <textarea className="email-template-box" value={emailText} readOnly />
    </div>
  );
}

function buildEmailText(invoices) {
  const rows = invoices || [];

  const header = [
    'Invoice/Item #',
    'Invoice Status',
    'Supplier Name',
    'Supplier Number',
    'Due Date',
    'Due Date with Discount',
    'Debit Balance (Name and Vendor Number)',
  ];

  const tableRows = rows.length
    ? rows.map((row) =>
        [
          row.invoice_number || '',
          row.status_message || row.invoice_status || row.status || '',
          row.supplier_name || row.vendor_name || '',
          row.supplier_number || row.vendor_number || '',
          row.payment_due_date || row.due_date || '',
          row.payment_discount_date || '',
          row.debit_balance || row.net_balance || '',
        ].join('\t')
      )
    : [['[Invoice Number]', '[Invoice Status]', '[Supplier Name]', '[Supplier Number]', '[Due Date]', '[Discount Due Date]', '[Debit Balance - Name and Vendor Number]'].join('\t')];

  return ['Hello,', '', 'Please review the invoice status details below:', '', header.join('\t'), ...tableRows, '', 'Thank you.'].join('\n');
}

function invoiceEmailColumns() {
  return ['invoice_number', 'status_message', 'supplier_name', 'supplier_number', 'payment_due_date', 'payment_discount_date', 'debit_balance', 'requester'];
}

function MetricCard({ label, value }) {
  return (
    <div className="kpi-card">
      <p>{label}</p>
      <h2>{value}</h2>
    </div>
  );
}

function UploadCenter() {
  return (
    <section className="grid two">
      <UploadCard title="Paid Register" description="Drag and drop Hologic Payment Register Report." endpoint="/import/paid-register" />
      <RegionUploadCard />
      <InfoCard title="Upload order recommendation" items={['First upload the Paid Register.', 'Then upload USA, CR, EMEA, or HUB open invoice reports.', 'The app will normalize records into Supabase.', 'Original Excel files can remain stored in Box.']} />
      <InfoCard title="What the app reviews" items={['Invoice payment status.', 'Requester / User WF - User Description.', 'Due date and discount date.', 'Vendor name, vendor number, and invoice number.', 'AP status message based on the Excel formula logic.']} />
    </section>
  );
}

function UploadCard({ title, description, endpoint }) {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);

  function handleFileSelect(selectedFile) {
    if (!selectedFile) return;
    const name = selectedFile.name.toLowerCase();

    if (!name.endsWith('.xlsx') && !name.endsWith('.xlsm') && !name.endsWith('.xls')) {
      setFile(null);
      setMessage('Please upload an Excel file only: .xlsx, .xlsm, or .xls');
      return;
    }

    setFile(selectedFile);
    setMessage(`Selected file: ${selectedFile.name}`);
  }

  async function handleUpload() {
    if (!file) return setMessage('Please select or drag and drop a file first.');

    setLoading(true);
    setMessage('Uploading and processing...');

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setMessage(`Completed: ${data.rows_imported || 0} rows imported.`);
      setFile(null);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <FileCheck2 size={26} />
      <h2>{title}</h2>
      <p>{description}</p>

      <div
        className={`drop-zone ${dragging ? 'dragging' : ''}`}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFileSelect(event.dataTransfer.files?.[0]);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragging(false);
        }}
      >
        <FileSpreadsheet size={34} />
        <strong>{file ? file.name : 'Drag and drop Excel file here'}</strong>
        <span>or click below to browse</span>
      </div>

      <input type="file" accept=".xlsx,.xlsm,.xls" onChange={(e) => handleFileSelect(e.target.files?.[0])} />

      <button onClick={handleUpload} disabled={loading}>{loading ? 'Processing...' : 'Upload File'}</button>

      {message && <p className="message">{message}</p>}
    </div>
  );
}

function RegionUploadCard() {
  const [region, setRegion] = useState('USA');

  return (
    <div className="card">
      <h2>Open / Unpaid Invoices</h2>
      <p>Select the report region, then drag and drop the matching Excel file.</p>
      <label>Region</label>
      <select value={region} onChange={(e) => setRegion(e.target.value)}>
        <option>USA</option>
        <option>CR</option>
        <option>EMEA</option>
        <option>HUB</option>
      </select>
      <UploadCard title={`${region} Open Invoices`} description={`Import ${region} open invoice report.`} endpoint={`/import/open-invoices/${region}`} />
    </div>
  );
}

function VendorSearch() {
  const [filters, setFilters] = useState(getDefaultFilters());
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  async function search() {
    if (!filters.vendorNames.length && !filters.vendorNumber && !filters.invoiceNumbers) {
      setMessage('Please enter vendor name, vendor number, or invoice number.');
      return;
    }

    try {
      const json = await fetchDashboard(filters);
      setData(json);
      setMessage('');
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <section className="card wide">
      <h2>Vendor / Invoice Search</h2>
      <DashboardFilters filters={filters} updateFilter={updateFilter} />
      <button onClick={search}>Search</button>
      {message && <p className="message">{message}</p>}
      {data && <SimpleTable rows={data.invoices || []} columns={invoiceEmailColumns()} />}
    </section>
  );
}

function AdminCleanup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');

  async function runCleanup() {
    const confirmed = window.confirm('This will delete all imported pilot data from Supabase, including vendors, invoices, payments, discounts, credit/debit balances, and import history. Original Excel files stored in Box will not be deleted. Continue?');
    if (!confirmed) return;

    setLoading(true);
    setMessage('Running full pilot data cleanup...');
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/admin/cleanup`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Cleanup failed');

      setResult(data.result);
      setMessage(data.message || 'Cleanup completed successfully.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card wide">
      <h2>Admin Cleanup</h2>
      <p>Manually clear all imported pilot data from Supabase. This deletes database records only and does not delete original files stored in Box.</p>
      <button onClick={runCleanup} disabled={loading}>{loading ? 'Running Cleanup...' : 'Run Full Pilot Data Cleanup'}</button>
      {message && <p className="message">{message}</p>}
      {result && <SimpleTable rows={[result]} columns={['import_batches_deleted', 'vendors_deleted', 'invoices_deleted', 'payments_deleted', 'credit_debits_deleted', 'discount_reviews_deleted', 'status_history_deleted']} />}
    </section>
  );
}

function SimpleTable({ rows = [], columns = [] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column.replaceAll('_', ' ')}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length}>No records found.</td></tr>
          ) : (
            rows.slice(0, 100).map((row, index) => (
              <tr key={`${row.id || index}`}>
                {columns.map((column) => (
                  <td key={column}>
                    {column === 'status' ? <span className={`status-chip ${row[column] || 'open'}`}>{row[column] || 'open'}</span> : row[column] ?? ''}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function InfoCard({ title, items }) {
  return (
    <div className="card muted">
      <h2>{title}</h2>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);