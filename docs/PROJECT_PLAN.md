# Project Plan - AP Vendor Invoice Review App

## Objective
Create an English web application that replaces the current Excel macro process for vendor invoice review, paid/unpaid invoice comparison, status messaging, discount review, and vendor historical search.

## Current Excel process translated
1. Open the Review Columns file.
2. Button 1 imports the Hologic Payment Register already-paid report into the Official Template paid sheet.
3. Button 2 imports the acronym/regional files into the Official Template unpaid sheet.
4. Button 3 runs VLOOKUP formulas to compare paid and unpaid information.
5. The official template uses IF formulas to return invoice status messages.
6. The cover sheet shows invoice number, invoice status, supplier name, and due date.
7. A third balance report should be added to compare debit/credit balances before payment decisions.

## Pilot architecture
- Box: stores original files.
- Backend: receives uploads or later reads from Box API.
- Database: Supabase PostgreSQL stores normalized data.
- Frontend: React dashboard for upload, search, and review.

## Phase 1 - Backend foundation
- Create database schema.
- Build import endpoints.
- Normalize paid and unpaid reports.
- Store import history.
- Create vendor history API.

## Phase 2 - Invoice review logic
- Match by invoice number, supplier/vendor number, and region.
- Return paid, approved, ready to pay, pending approver, needs revalidation, processing, or not registered.
- Store review result for audit.

## Phase 3 - Discounts and credits
- Parse payment terms and discount percentage.
- Compare payment date vs discount date.
- Add credit/debit report import.
- Show whether payment should continue or credit should be reviewed first.

## Phase 4 - Production controls
- Add Supabase Auth.
- Add user roles: admin, AP reviewer, read-only manager.
- Add Box API integration.
- Add exportable reports.
- Add audit logs and RLS policies.

## Migration strategy
The app uses backend APIs and repository files. If Supabase must be replaced later, update the repository/database connection while keeping the frontend and business logic mostly unchanged.
