# RailIo — Supabase Master Backend, Authentication & Database Architecture Guide

This document outlines the centralized **Supabase** backend architecture for **RailIo**, powering both the **React Native Expo Mobile Application** and the **Vite + React Admin Web Dashboard**.

---

## 1. System Architecture Overview

```text
                               ┌──────────────────────────────────┐
                               │         SUPABASE CLOUD           │
                               │                                  │
                               │  Auth (Google OAuth, Email, OTP) │
                               │  PostgreSQL + PostGIS            │
                               │  Row Level Security (RLS)        │
                               │  Storage (Avatars, Documents)    │
                               │  Edge Functions (Truecaller/Admin)│
                               │  Realtime Engine                 │
                               └────────────────┬─────────────────┘
                                                │
                      ┌─────────────────────────┴─────────────────────────┐
                      │                                                   │
             ┌────────▼────────┐                                 ┌────────▼────────┐
             │   MOBILE APP    │                                 │    ADMIN WEB    │
             │ React Native    │                                 │  Vite + React   │
             │ Expo 54         │                                 │  Tailwind CSS   │
             └─────────────────┘                                 └─────────────────┘
```

### Key Technical Principles:
1. **Single Centralized Backend**: ONE Supabase project, ONE database schema, and ONE identity catalog (`auth.users`) shared across Mobile and Admin Web.
2. **Role-Based Access Control (RBAC)**: Enforced via PostgreSQL `public.profiles.role` (`'user'`, `'admin'`, `'super_admin'`).
3. **Database Security & RLS**: Every table has mandatory Row Level Security policies. Public data is read-only; user data is owner-scoped; administrative mutations require elevated privileges.
4. **Service Role Isolation**: `SUPABASE_SERVICE_ROLE_KEY` is strictly reserved for server-side environments (Supabase Edge Functions & Node Backend). Never included in client bundles.
5. **Truecaller Identity Abstraction**: `PhoneVerificationProvider` interfaces with a secure Edge Function (`verify-phone`) that validates credentials server-side without exposing API keys to the client.

---

## 2. Database Schema & Relationships

All schema definitions are stored in SQL migrations under [`database/migrations/`](file:///Users/ankitkarmakar/Documents/MY%20PROJECTS%20ALL%20IN%20/Rail%20Sathi/RailIo/database/migrations/).

### Core Tables Summary:

| Table Name | Primary Key | Foreign Keys / References | Description |
| :--- | :--- | :--- | :--- |
| `profiles` | `id` (UUID) | `auth_user_id` -> `auth.users(id)` | User profiles, roles, and verification flags |
| `phone_verifications` | `id` (UUID) | `user_id` -> `profiles(id)` | State machine for Truecaller & SMS verification |
| `admin_audit_logs` | `id` (UUID) | `admin_user_id` -> `profiles(id)` | Security log of administrative mutations |
| `stations` | `code` (VARCHAR) | None | Railway stations with PostGIS spatial point `geom` |
| `trains` | `train_number` | `source_code`, `destination_code` -> `stations(code)` | Train master catalog & coach composition |
| `train_schedules` | `id` (UUID) | `train_number` -> `trains`, `station_code` -> `stations` | Stoppages, timetable & arrival/departure sequence |
| `train_live_state` | `train_number` | `train_number` -> `trains`, `last_station`, `next_station` | Live GPS location, delay prediction & PostGIS point |
| `track_sections` | `section_id` | `start_station`, `end_station` -> `stations(code)` | Track geometry & risk monitoring sections |
| `track_vibration_telemetry` | `id` (UUID) | `section_id` -> `track_sections` | ESP32 + MPU6050 vibration telemetry logs |
| `track_progressive_risk` | `id` (UUID) | `section_id` -> `track_sections` | Multi-day structural risk analysis |
| `crowd_observations` | `id` (UUID) | `station_code` -> `stations` | Computer vision platform crowd observations |
| `railway_alerts` | `id` (UUID) | `affected_train`, `affected_station` | Active network incidents & public advisories |

---

## 3. Row Level Security (RLS) Policies

All sensitive and domain tables have RLS enabled:

- **`public.profiles`**:
  - `SELECT`: Users read their own profile (`auth_user_id = auth.uid()`) OR admins read all profiles (`is_admin()`).
  - `UPDATE`: Users can update non-sensitive fields (`full_name`, `avatar_url`). Role elevation and verification flag changes are rejected via RLS `WITH CHECK` conditions unless executed by an admin.
  - `INSERT`: Executed automatically via PostgreSQL trigger `on_auth_user_created` with default `role = 'user'`.

- **`public.phone_verifications`**:
  - `SELECT`: User reads own state OR admin reads all.
  - `INSERT/UPDATE`: Executed by Service Role inside Edge Function `verify-phone`.

- **`public.admin_audit_logs`**:
  - `SELECT/INSERT`: Restricted strictly to `is_admin()`. Immutable log (no updates or deletes allowed).

- **Domain Tables (`stations`, `trains`, `train_schedules`, `train_live_state`, `track_sections`, `crowd_observations`, `railway_alerts`)**:
  - `SELECT`: Accessible to `anon` and `authenticated` users (public railway information).
  - `INSERT/UPDATE/DELETE`: Restricted strictly to `is_admin()` or `service_role`.

---

## 4. Authentication & Verification Flows

### A. Google OAuth Authentication
1. Client calls `supabase.auth.signInWithOAuth({ provider: 'google' })`.
2. User authenticates with Google identity provider.
3. Supabase Auth registers account in `auth.users`.
4. PostgreSQL trigger `on_auth_user_created` automatically creates profile in `public.profiles` with `role = 'user'`.

### B. Email & Password Authentication
1. Mobile or Admin app calls `supabase.auth.signInWithPassword({ email, password })` or `signUp`.
2. Session and refresh tokens are persisted automatically using Expo AsyncStorage / browser localStorage.
3. `onAuthStateChange` listener updates global `AuthContext` state.

### C. Truecaller Identity & Phone Verification Flow
```text
Mobile App -> Requests Verification
     ↓
Edge Function (`verify-phone`)
     ↓ (Passes truecallerToken / payload)
Server validates with Truecaller Verification API
     ↓
Idempotently updates `phone_verifications` state (`VERIFIED`)
     ↓
Service Role updates `profiles.phone_verified = true`
     ↓
Returns success result to Mobile
```

---

## 5. Environment Variables Guide

Copy [`.env.example`](file:///Users/ankitkarmakar/Documents/MY%20PROJECTS%20ALL%20IN%20/Rail%20Sathi/RailIo/.env.example) to `.env` in respective project root directories:

### Root / Global:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TRUECALLER_APP_KEY=your_truecaller_key
TRUECALLER_CLIENT_SECRET=your_truecaller_secret
```

### Mobile App (`mobile/.env`):
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Admin Web (`admin-web/.env`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 6. Step-by-Step Supabase Setup Instructions

### Step 1: Create Supabase Project
1. Log into [Supabase Dashboard](https://database.new).
2. Create project named **RailIo Central**.
3. Note project URL, Anon Key, and Service Role Key.

### Step 2: Apply Database Migrations
Run the SQL migration scripts in order in the Supabase SQL Editor:
1. Exec [`database/migrations/01_railio_master_schema.sql`](file:///Users/ankitkarmakar/Documents/MY%20PROJECTS%20ALL%20IN%20/Rail%20Sathi/RailIo/database/migrations/01_railio_master_schema.sql)
2. Exec [`database/migrations/02_railio_rls_policies.sql`](file:///Users/ankitkarmakar/Documents/MY%20PROJECTS%20ALL%20IN%20/Rail%20Sathi/RailIo/database/migrations/02_railio_rls_policies.sql)
3. Exec [`database/migrations/03_railio_storage_and_realtime.sql`](file:///Users/ankitkarmakar/Documents/MY%20PROJECTS%20ALL%20IN%20/Rail%20Sathi/RailIo/database/migrations/03_railio_storage_and_realtime.sql)

### Step 3: Configure Google OAuth Provider
1. Go to Google Cloud Console -> APIs & Services -> Credentials.
2. Create OAuth 2.0 Client ID (Web & Android/iOS).
3. In Supabase Dashboard -> Authentication -> Providers -> Google, enable provider and enter Client ID and Client Secret.

### Step 4: Deploy Edge Functions
Deploy Edge Functions using Supabase CLI:
```bash
supabase functions deploy verify-phone --project-ref <your-project-id>
supabase functions deploy admin-user-management --project-ref <your-project-id>
```

---

## 7. Local Development Commands

### Mobile Expo App:
```bash
cd mobile
npm start
```

### Admin Web Dashboard:
```bash
cd admin-web
npm run dev
```

### Backend Service Gateway:
```bash
cd backend
npm run dev
```

---

## 8. Production Deployment & Security Best Practices

1. **Service Role Security**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is NEVER committed to git or exposed in client bundles.
2. **SSL & Transport**: Enforce HTTPS for all Edge Function and web endpoints.
3. **Database Backups**: Enable Point-In-Time Recovery (PITR) in Supabase production settings.
4. **Audit Logs**: Monitor `admin_audit_logs` table periodically for privilege changes.
