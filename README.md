# Double-Entry Banking System

A full-stack banking simulation built around an immutable double-entry ledger, modeling the core mechanics of a real fintech backend: fund transfers, fraud detection, loans, scheduled payments, and savings automation — all enforced at the database layer.

## Overview

Every transaction is recorded as two balanced journal entries (one debit, one credit), never mutated after creation. Account balances are derived from this ledger and maintained in a cache table that is kept in sync via PostgreSQL triggers, so the system stays consistent even under concurrent writes.

```
Client (React) → REST API (Express) → Service Layer → PostgreSQL (triggers + journal)
```

## Tech Stack

- **Frontend:** React, Vite
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (PL/pgSQL functions, triggers, views)
- **Auth:** JWT, bcrypt
- **Background jobs:** node-cron

## Key Features

**Double-entry ledger** — every transfer writes a debit and credit journal entry; a `double_entry_check` view continuously verifies that all transactions net to zero.

**Concurrency-safe transfers** — transfers lock both account rows in a deterministic (sorted) order to prevent deadlocks, and balances are checked and updated within a single database transaction.

**Write-ahead logging** — a `wal_log` table records the intent of each transaction before it commits, supporting auditability and recovery.

**Trigger-enforced business rules** — PostgreSQL triggers handle balance reconciliation, insufficient-funds checks, vault time-locks and goal-locks with penalty enforcement, and audit logging on account/customer changes, so these rules can't be bypassed by application-layer bugs.

**Fraud detection engine** — a rule-based scanner flags suspicious activity using SQL statistical queries: transaction velocity checks, round-amount pattern detection, dormant account reactivation, and a 3σ standard-deviation anomaly check.

**Automated money management** — round-up savings into vaults, percentage-based auto-split rules on incoming credits, budget threshold alerts, and recurring scheduled transfers/EMI loan repayments via cron jobs.

**Reliable event delivery** — notifications use the outbox pattern (write to an `outbox` table, process asynchronously) to avoid dropped events.

## Database Design

- 20+ tables covering customers, accounts, journal/ledger, transactions, loans, fraud flags, scheduled transactions, and audit/outbox logs
- PL/pgSQL triggers for balance updates, vault rule enforcement, audit logging, and round-up automation
- Views for account balances, running transaction history (window functions), monthly spend by category, fraud summaries, and loan summaries

See [`backend/sql/`](backend/sql) for the full schema, triggers, and views.

## Project Structure

```
backend/
  sql/            # schema, triggers, views, seed data
  src/
    routes/       # accounts, transactions, loans, fraud, vaults, reversals, scheduled, analytics
    services/     # business logic (transactions, fraud, loans, vaults, scheduler, reversals)
    jobs/         # cron jobs: fraud scanner, outbox processor, scheduled tx executor, summary refresher
    middleware/
    config/

frontend/
  src/
    api/
    components/
    pages/
```

## Running Locally

**Backend**
```bash
cd backend
npm install
# create a .env file with DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
psql -d your_db -f sql/01_schema.sql
psql -d your_db -f sql/02_triggers.sql
psql -d your_db -f sql/03_views.sql
psql -d your_db -f sql/04_seed.sql
npm run dev
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```
