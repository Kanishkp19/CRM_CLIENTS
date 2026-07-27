-- Cycle — Universal Membership & Lifecycle CRM
-- Initial Supabase Schema & Row-Level Security (RLS) Policies
-- Corresponds to TRD §3 & §7.

-- 1. Create Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    owner_name TEXT NOT NULL,
    name TEXT NOT NULL,
    vertical_type TEXT NOT NULL,
    entity_label TEXT NOT NULL,
    cycle_type TEXT NOT NULL DEFAULT 'date_based',
    custom_field_schema TEXT NOT NULL DEFAULT '[]',
    reminder_config TEXT NOT NULL DEFAULT '{}',
    message_templates TEXT NOT NULL DEFAULT '{}',
    tier TEXT NOT NULL DEFAULT 'free',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create Entities Table
CREATE TABLE IF NOT EXISTS public.entities (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    custom_fields TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create Cycles Table
CREATE TABLE IF NOT EXISTS public.cycles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entity_id TEXT NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    plan_name TEXT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    units_total INT,
    units_remaining INT,
    status TEXT NOT NULL DEFAULT 'active',
    amount DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create Notification Log Table
CREATE TABLE IF NOT EXISTS public.notifications_log (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entity_id TEXT NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    cycle_id TEXT REFERENCES public.cycles(id) ON DELETE SET NULL,
    channel TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'sent'
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_businesses_owner ON public.businesses(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_entities_business ON public.entities(business_id);
CREATE INDEX IF NOT EXISTS idx_cycles_entity ON public.cycles(entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON public.notifications_log(entity_id);

-- Enable Row-Level Security (RLS) on all tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- RLS POLICIES
-- -------------------------------------------------------------

-- Businesses RLS: Owners can access and manage only their own business records
CREATE POLICY "Owners can manage their own business"
ON public.businesses
FOR ALL
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);

-- Entities RLS: Access restricted to entities belonging to the owner's business
CREATE POLICY "Owners can manage entities in their business"
ON public.entities
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.businesses
        WHERE public.businesses.id = public.entities.business_id
          AND public.businesses.owner_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.businesses
        WHERE public.businesses.id = public.entities.business_id
          AND public.businesses.owner_user_id = auth.uid()
    )
);

-- Cycles RLS: Access restricted to cycles belonging to entities in owner's business
CREATE POLICY "Owners can manage cycles in their business"
ON public.cycles
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.entities
        JOIN public.businesses ON public.businesses.id = public.entities.business_id
        WHERE public.entities.id = public.cycles.entity_id
          AND public.businesses.owner_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.entities
        JOIN public.businesses ON public.businesses.id = public.entities.business_id
        WHERE public.entities.id = public.cycles.entity_id
          AND public.businesses.owner_user_id = auth.uid()
    )
);

-- Notifications RLS: Access restricted to notification logs for owner's entities
CREATE POLICY "Owners can manage notifications in their business"
ON public.notifications_log
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.entities
        JOIN public.businesses ON public.businesses.id = public.entities.business_id
        WHERE public.entities.id = public.notifications_log.entity_id
          AND public.businesses.owner_user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.entities
        JOIN public.businesses ON public.businesses.id = public.entities.business_id
        WHERE public.entities.id = public.notifications_log.entity_id
          AND public.businesses.owner_user_id = auth.uid()
    )
);
