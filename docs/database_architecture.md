# Cycle CRM — Database Architecture & Flowchart

This document provides a comprehensive visual and structural breakdown of how the **Cycle CRM** database functions, how multi-tenant user isolation is enforced, and how data flows from user actions to Supabase PostgreSQL.

---

## 1. High-Level System Data Flowchart

The diagram below illustrates how an incoming user request traverses authentication, tenant scoping, Prisma ORM, PgBouncer connection pooling, and Cloud PostgreSQL.

```mermaid
flowchart TD
    subgraph Client ["🌐 Client Layer (Next.js / Browser)"]
        User["User Device / Browser"]
        Store["Zustand Persist Store\n(Local Storage Cache)"]
    end

    subgraph Auth ["🔒 Supabase Auth System"]
        SupabaseAuth["Supabase Auth Service\n(JWT & HTTP Cookies)"]
        AuthUsers["auth.users Table\n(UUID Primary Key)"]
    end

    subgraph NextServer ["⚙️ Next.js Server & API Routes"]
        Middleware["Next.js Proxy / Middleware"]
        APIBusiness["/api/business\n(Owner Profile Route)"]
        APIEntities["/api/entities\n(Client & Member Route)"]
        APIReminder["/api/reminder-scan\n(Cron & Scan Engine)"]
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
    Prisma -->|10. Serialized JSON| NextServer
    NextServer -->|11. Hydrate UI & Store| User
    User <-->|Local Cache| Store
```

---

## 2. Entity-Relationship (ER) Schema Diagram

The database uses a **single universal schema** across all business verticals (Gyms, Salons, Tuition Centers, Pet Daycares, AMC, Rentals). Verticals differ only by configuration tokens rather than table structures.

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
        text custom_field_schema
        text reminder_config
        text message_templates
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
        text custom_fields
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
        float amount
        timestamp created_at
    }

    NOTIFICATIONS_LOG {
        string id PK
        string entity_id FK
        string cycle_id FK
        string channel
        string trigger_type
        text message
        string status
        timestamp sent_at
    }
```

---

## 3. Step-by-Step Data Execution Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Business Owner
    participant Web as Next.js Web App
    participant Auth as Supabase Auth
    participant API as API Route Layer
    participant DB as Prisma & PostgreSQL DB

    Owner->>Web: 1. Sign In (Email & Password)
    Web->>Auth: 2. Authenticate Credentials
    Auth-->>Web: 3. Return Session & Set Auth Cookies

    Owner->>Web: 4. Open Dashboard
    Web->>API: 5. GET /api/business
    API->>Auth: 6. Extract Session user.id
    API->>DB: 7. findFirst({ where: { ownerUserId: user.id } })
    DB-->>API: 8. Return Business Record
    API-->>Web: 9. Return JSON Business Profile

    Web->>API: 10. GET /api/entities
    API->>DB: 11. findMany({ where: { businessId }, include: { cycles } })
    DB-->>API: 12. Return Client Records & Cycles
    API-->>Web: 13. Return Enriched & Calculated Status List

    Web-->>Owner: 14. Render Polished Responsive Dashboard
```

---

## 4. Key Architectural Safeguards

### A. Multi-Tenant Data Isolation
- Every database query for businesses filters strictly by `ownerUserId: user.id`.
- Every database query for entities filters strictly by `businessId: business.id`.
- This ensures **zero cross-tenant data leaks**—different owners will never see or access each other's clients.

### B. Connection Pooling (`?pgbouncer=true`)
- Supabase Pooler operates on port `6543` in **Transaction Mode**.
- The `DATABASE_URL` is configured with `?pgbouncer=true` so Prisma uses simple query protocol and avoids prepared statement collisions (`PostgresError 42P05`).

### C. Universal Schema Design
- Custom fields per vertical (e.g., `breed` for Pets, `goal` for Gyms) are stored as structured JSON strings inside `custom_fields` and `custom_field_schema`.
- Adding new business verticals requires **zero database DDL migrations**.
