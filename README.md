# AP Vendor Invoice Review App - Pilot Starter

This pilot replaces the current Excel macro workflow with a backend-first web app.

## Recommended stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Pilot database: Supabase PostgreSQL
- File storage: Box for original Excel files and supporting documents
- Data flow: Box/manual upload -> backend import parser -> database -> dashboards/search

## What this version includes
- Backend API structure with database abstraction
- Excel upload endpoints for paid register and open/unpaid invoice reports
- Matching logic that replaces the template VLOOKUP/status formula
- Supabase SQL schema
- React starter dashboard with upload and vendor search screens
- Migration-friendly design so Supabase can later move to PostgreSQL, Azure SQL, SQL Server, AWS RDS, etc.

## Files expected from current process
- Hologic_Payment_Register_Report.xlsx = Paid invoices/payment register
- USA.xlsx / CR.xlsx / EMEA.xlsx / HUB.xlsx = open/unpaid invoices
- Debit/Credit report = future import module for vendor balances/credits

## Local setup
1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql` in Supabase SQL Editor.
3. Copy `backend/.env.example` to `backend/.env` and add Supabase values.
4. In `backend`, run `npm install` then `npm run dev`.
5. In `frontend`, run `npm install` then `npm run dev`.

## Environment notes
Box is recommended as file storage. In the pilot, uploads can be manual. Later, Box API integration can read files directly from company folders.
