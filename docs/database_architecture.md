# Cycle CRM — Hardened Database Architecture & Flowchart

This document provides a comprehensive visual and structural breakdown of how the **Cycle CRM** database functions, how native PostgreSQL features (`JSONB`, `Decimal`, `dedup_key` unique constraints) enforce production reliability, and how multi-tenant isolation is guaranteed.

---

## 1. High-Level System Data Flowchart

The diagram below illustrates how an incoming user request traverses authentication, tenant scoping, Prisma ORM, PgBouncer connection pooling, and Cloud PostgreSQL.

```mermaid
flowchart TD
    subgraph Client ["🌐 Client Layer (Next.js / Browser)"]
        User["User Device / Browser"]
        Store["Zustand Persist Store\n(Persists UI view & ID only - No PII)"]
    end

    subgraph Auth ["🔒 Supabase Auth System"]
        SupabaseAuth["Supabase Auth Service\n(JWT & HTTP Cookies)"]
        AuthUsers["auth.users Table\n(UUID Primary Key)"]
    end

    subgraph NextServer ["⚙️ Next.js Server & API Routes"]
        Middleware["Next.js Proxy / Middleware"]
        APIBusiness["/api/business\n(Owner Profile Route)"]
        APIEntities["/api/entities\n(Client & Member Route)"]
        APIReminder["/api/reminder-scan\n(Atomic Dedup Cron Engine)"]
    end

    subgraph DatabaseLayer ["🗄️ Database & ORM Layer"]
        Prisma["Prisma ORM Client\n(?pgbouncer=true)"]
        PgBouncer["Supabase PgBouncer Pooler\n(Port 6543 / Transaction Mode)"]
        PostgresDB[("Supabase PostgreSQL DB\n(AWS ap-northeast-1)")]
    end

    %% Interactions & Flow
    User -->|1. Sign In / Register| SupabaseAuth
    SupabaseAuth -->|2. Issue JWT & Cookies| User
    SupabaseAuth <-->|Sync UUID| AuthUsers

    User -->|3. Fetch Business & Clients| NextServer
    NextServer -->|4. Read Session Cookie| Middleware
    Middleware -->|5. Resolve ownerUserId| APIBusiness
    Middleware -->|5. Resolve ownerUserId| APIEntities

    APIBusiness -->|6. Query where: ownerUserId| Prisma
    APIEntities -->|6. Query where: businessId| Prisma

    Prisma -->|7. Simple Query Protocol| PgBouncer
    PgBouncer -->|8. Execute SQL Queries| PostgresDB

    PostgresDB -->|9. Isolated Records| Prisma
    Prisma -->|10. Native JSONB & DTOs| NextServer
    NextServer -->|11. Hydrate UI & Store| User
    User <-->|UI Route State| Store
```

---

## 2. Entity-Relationship (ER) Schema Diagram

The database uses a **hardened universal schema** across all business verticals (Gyms, Salons, Tuition Centers, Pet Daycares, AMC, Rentals). Verticals differ only by JSONB configuration tokens rather than table structure alterations.

```mermaid
erDiagram
    AUTH_USERS ||--o{ BUSINESSES : "owns (owner_user_id)"
    BUSINESSES ||--o{ ENTITIES : "contains (business_id)"
    ENTITIES ||--o{ CYCLES : "lifecycle history (entity_id)"
    ENTITIES ||--o{ NOTIFICATIONS_LOG : "audit logs (entity_id)"
    CYCLES ||--o{ NOTIFICATIONS_LOG : "trigger source (cycle_id)"

    AUTH_USERS {
        uuid id PK
        string email
        timestamp created_at
    }

    BUSINESSES {
        string id PK
        uuid owner_user_id FK
        string owner_name
        string name
        string vertical_type
        string entity_label
        string cycle_type
        jsonb custom_field_schema
        jsonb reminder_config
        jsonb message_templates
        string tier
        timestamp created_at
        timestamp updated_at
    }

    ENTITIES {
        string id PK
        string business_id FK
        string name
        string phone
        string email
        jsonb custom_fields
        string status
        timestamp created_at
        timestamp updated_at
    }

    CYCLES {
        string id PK
        string entity_id FK
        string plan_name
        timestamp start_date
        timestamp end_date
        int units_total
        int units_remaining
        string status
        numeric_10_2 amount
        timestamp created_at
    }

    NOTIFICATIONS_LOG {
        string id PK
        string entity_id FK
        string cycle_id FK
        string dedup_key UK
        string channel
        string trigger_type
        text message
        string status
        timestamp sent_at
    }
```

---

## 3. Atomic Claim-First Reminder Engine & Execution Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor VercelCron as Vercel Daily Cron
    participant API as /api/reminder-scan
    participant DB as PostgreSQL (Prisma)
    participant Resend as Resend / WhatsApp Transport

    VercelCron->>API: 1. Trigger POST /api/reminder-scan (08:00 UTC)
    API->>DB: 2. Query active & expiring_soon entities
    DB-->>API: 3. Return target entities & active cycles

    loop For each eligible entity/cycle
        API->>DB: 4. Attempt ATOMIC CLAIM: INSERT into notifications_log (dedup_key, status='pending')
        alt Slot Claimed Successfully (First Thread)
            DB-->>API: 5. Claim Granted (200 OK)
            API->>Resend: 6. Dispatch Email / WhatsApp Notification
            Resend-->>API: 7. Dispatch Status (Success / Sent)
            API->>DB: 8. UPDATE notifications_log SET status='sent'
        else Unique Constraint Violation P2002 (Duplicate Thread / Retry)
            DB-->>API: 9. ERROR P2002 (Slot already claimed)
            API-->>API: 10. SKIP DISPATCH (Prevent duplicate message)
        end
    end
```

---

## 4. Key Production Architectural Hardening Features

### A. Native `JSONB` Database Types
- `custom_field_schema`, `reminder_config`, `message_templates`, and `custom_fields` are stored as native PostgreSQL `jsonb` columns.
- Prevents text stringification corruptions, enables schema indexing, and eliminates manual `JSON.parse` double-serialization.

### B. Atomic Claim-First Deduplication (`dedup_key UNIQUE`)
- `notifications_log` enforces a unique constraint on `dedup_key` (`${entityId}:${cycleId}:${triggerType}:${todayIso}`).
- The system attempts an atomic slot claim in PostgreSQL **before** triggering outbound WhatsApp or email dispatches. Concurrent cron runs or timeouts cannot cause duplicate messages.

### C. Transactional State Sync (`db.$transaction`)
- Cycle updates (renewals, decrements, lapses) and entity status calculations are executed inside atomic `db.$transaction([ ... ])` calls.
- Guarantees zero status drift between `cycles.status` and `entities.status`.

### D. Currency Precision (`numeric(10,2)`)
- Financial `amount` fields are stored using PostgreSQL `numeric(10, 2)` (Prisma `Decimal` type).
- Prevents IEEE 754 floating-point rounding errors (e.g. ₹1500.10 becoming ₹1500.099999...).

### E. Privacy & Zero Client PII Storage
- Zustand browser `localStorage` persistence stores **only** UI navigation state (`view` and `selectedEntityId`).
- Client PII (names, emails, phone numbers) is never cached in local storage, preventing stale UI states and privacy risks.
