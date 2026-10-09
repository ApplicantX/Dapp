-- Dahod Jewellery & Gold/Silver Lending Ledger Database Schema
-- Run this in your Supabase SQL Editor (supabase.com/dashboard/project/_/sql)

-- 1. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    village TEXT NOT NULL,
    diary TEXT NOT NULL,
    page_number TEXT NOT NULL,
    mobile TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast search by name, village, diary
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (LOWER(name));
CREATE INDEX IF NOT EXISTS idx_customers_village ON public.customers (LOWER(village));
CREATE INDEX IF NOT EXISTS idx_customers_diary ON public.customers (diary, page_number);

-- 2. LOANS TABLE
CREATE TABLE IF NOT EXISTS public.loans (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    loan_date DATE NOT NULL,
    loan_amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
    closed_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loans_customer_id ON public.loans (customer_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON public.loans (status);

-- 3. ORNAMENTS TABLE (COLLATERAL HELD IN VAULT)
CREATE TABLE IF NOT EXISTS public.ornaments (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    metal TEXT NOT NULL CHECK (metal IN ('Gold', 'Silver')),
    category TEXT NOT NULL,
    weight NUMERIC NOT NULL,
    quantity INTEGER DEFAULT 1,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ornaments_loan_id ON public.ornaments (loan_id);

-- 4. LOAN PAYMENTS (PARTIAL REPAYMENTS)
CREATE TABLE IF NOT EXISTS public.loan_payments (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    interest_amount NUMERIC DEFAULT 0,
    principal_amount NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON public.loan_payments (loan_id);

-- 5. LOAN TOP-UPS (ADDITIONAL LOANS ON SAME JEWELRY)
CREATE TABLE IF NOT EXISTS public.loan_top_ups (
    id TEXT PRIMARY KEY,
    loan_id TEXT NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
    top_up_date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_top_ups_loan_id ON public.loan_top_ups (loan_id);

-- 6. ACTIVITY LOGS (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_name TEXT DEFAULT 'Family Admin',
    action TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    village TEXT NOT NULL,
    details TEXT NOT NULL,
    previous_value TEXT,
    new_value TEXT
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON public.activity_logs (timestamp DESC);

-- 7. APP CONFIG / SETTINGS
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) setup
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ornaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_top_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow read/write policies for anon / authenticated client
CREATE POLICY "Allow public all customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all loans" ON public.loans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all ornaments" ON public.ornaments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all loan_payments" ON public.loan_payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all loan_top_ups" ON public.loan_top_ups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all app_settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.loans;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ornaments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.loan_payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.loan_top_ups;
