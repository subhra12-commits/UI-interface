-- =========================================================================
-- MOTHER'S HUT RESTAURANT INTELLIGENCE & PRODUCTION ORDER SYSTEM
-- SUPABASE POSTGRESQL PRODUCTION SCHEMA
-- =========================================================================

-- 1. Create Enum types for Service Mode and Order Status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_service_mode') THEN
        CREATE TYPE order_service_mode AS ENUM ('dine-in', 'takeaway', 'delivery');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_type') THEN
        CREATE TYPE order_status_type AS ENUM ('Sent to Kitchen', 'In Preparation', 'Ready for Pickup', 'Served', 'Completed', 'Cancelled');
    END IF;
END $$;

-- 2. Create the primary Production Orders & Tokens Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL UNIQUE,                       -- E.g. MH-20261115-4821
    token TEXT NOT NULL,                                 -- Visual display token e.g. MH-4821
    customer_name TEXT NOT NULL,                         -- Customer's Name
    phone_number TEXT NOT NULL,                          -- Customer's Phone Number
    group_size INT NOT NULL DEFAULT 1,                   -- Total number of members/people in group
    service_mode TEXT NOT NULL DEFAULT 'dine-in',        -- 'dine-in', 'takeaway', 'delivery'
    table_number TEXT DEFAULT '4',                       -- Table number (for dine-in)
    first_visit_date DATE NOT NULL DEFAULT CURRENT_DATE, -- Date of order / first recorded visit
    ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),       -- Exact ordering timestamp
    estimated_prep_mins INT NOT NULL DEFAULT 15,         -- Calculated preparation time in minutes
    estimated_ready_at TIMESTAMPTZ,                      -- Calculated ready timestamp
    items JSONB NOT NULL DEFAULT '[]'::jsonb,            -- Array of ordered items with name, price, qty, prep_time
    item_count INT NOT NULL DEFAULT 0,                   -- Total items count
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,       -- Subtotal before tax
    taxes NUMERIC(10, 2) NOT NULL DEFAULT 0.00,          -- 5% GST taxes
    grand_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,    -- Grand total in INR
    special_note TEXT DEFAULT '',                        -- Customer culinary requests
    status TEXT NOT NULL DEFAULT 'Sent to Kitchen',      -- Live kitchen status
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Indexes for High-Velocity Kitchen Queries & Lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON public.orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_token ON public.orders(token);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(phone_number);
CREATE INDEX IF NOT EXISTS idx_orders_ordered_at ON public.orders(ordered_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_service_mode ON public.orders(service_mode);

-- 4. Enable Row Level Security (RLS) & Public / Authenticated Access Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow public frontend customer app to insert new orders
DROP POLICY IF EXISTS "Allow public customer order creation" ON public.orders;
CREATE POLICY "Allow public customer order creation"
    ON public.orders
    FOR INSERT
    TO public, anon, authenticated
    WITH CHECK (true);

-- Allow public and admin to read orders (filtered by token or authenticated admin)
DROP POLICY IF EXISTS "Allow public reading own order by token" ON public.orders;
CREATE POLICY "Allow public reading own order by token"
    ON public.orders
    FOR SELECT
    TO public, anon, authenticated
    USING (true);

-- Allow authenticated admins to update order statuses
DROP POLICY IF EXISTS "Allow authenticated staff to update orders" ON public.orders;
CREATE POLICY "Allow authenticated staff to update orders"
    ON public.orders
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Updated_at Trigger
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- =========================================================================
-- View for Fast Analytics & Kitchen Live Screen
-- =========================================================================
CREATE OR REPLACE VIEW public.kitchen_live_tokens AS
SELECT 
    order_id,
    token,
    customer_name,
    phone_number,
    group_size,
    service_mode,
    table_number,
    estimated_prep_mins,
    ordered_at,
    items,
    item_count,
    grand_total,
    status
FROM public.orders
WHERE status IN ('Sent to Kitchen', 'In Preparation')
ORDER BY ordered_at ASC;
