create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  supplier_number text unique,
  supplier_name text not null,
  normalized_name text generated always as (lower(regexp_replace(supplier_name, '[^a-zA-Z0-9]+', '', 'g'))) stored,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists import_runs (
  id uuid primary key default gen_random_uuid(),
  file_name text not null,
  import_type text not null check (import_type in ('paid_register','open_invoices','credit_debit_balance')),
  source_region text,
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  rows_imported integer default 0,
  error_message text,
  created_at timestamptz default now()
);

create table if not exists paid_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  check_number text,
  line_number integer,
  check_date date,
  vendor_number text,
  vendor_name text,
  vendor_site_code text,
  country text,
  state text,
  amount_paid numeric(14,2),
  payment_currency_code text,
  description text,
  invoice_date date,
  invoice_currency_code text,
  payment_process_request text,
  import_run_id uuid references import_runs(id),
  created_at timestamptz default now(),
  unique(invoice_number, check_number, line_number)
);

create table if not exists open_invoices (
  id uuid primary key default gen_random_uuid(),
  source_region text not null,
  operating_unit text,
  supplier_name text,
  supplier_number text,
  invoice_number text not null,
  invoice_type_code text,
  pay_group text,
  invoice_status text,
  payment_terms text,
  on_hold text,
  payment_due_date date,
  ap_aging_status text,
  payment_discount_date date,
  ap_aging_status_discount text,
  invoice_date date,
  invoice_currency text,
  invoice_amount numeric(14,2),
  usd_invoice_amount numeric(14,2),
  payment_due_day text,
  payment_method text,
  internal_owner text,
  terms_date date,
  po_number text,
  exchange_rate numeric(14,6),
  liability_account text,
  bank_account_length text,
  remit_advice_email text,
  import_run_id uuid references import_runs(id),
  created_at timestamptz default now(),
  unique(invoice_number, supplier_number, source_region)
);

create table if not exists vendor_balances (
  id uuid primary key default gen_random_uuid(),
  supplier_number text,
  supplier_name text,
  balance_type text check (balance_type in ('credit','debit','outstanding','unknown')),
  balance_amount numeric(14,2),
  currency text,
  as_of_date date,
  source_file text,
  created_at timestamptz default now()
);

create table if not exists invoice_reviews (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  supplier_number text,
  normalized_status text not null,
  status_message text not null,
  discount_eligible boolean default false,
  discount_percentage numeric(7,4) default 0,
  discount_amount numeric(14,2) default 0,
  reviewed_at timestamptz default now(),
  reviewed_by uuid
);

create index if not exists idx_paid_invoice_number on paid_invoices(invoice_number);
create index if not exists idx_paid_vendor_name on paid_invoices using gin (vendor_name gin_trgm_ops);
create index if not exists idx_open_invoice_number on open_invoices(invoice_number);
create index if not exists idx_open_supplier_name on open_invoices using gin (supplier_name gin_trgm_ops);
create index if not exists idx_open_status on open_invoices(invoice_status);
