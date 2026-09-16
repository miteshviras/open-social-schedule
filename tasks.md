# Open Social Scheduler — Implementation Tasks

Tracking progress across all phases. Each phase will be committed to git upon completion.

---

## 📌 Phase 1: Foundation (COMPLETED)
- [x] **Task 1.1**: Monorepo Scaffolding & Configuration
  - Setup npm workspaces for `apps/*` and `packages/*`.
  - Root `package.json`, shared TypeScript config (`tsconfig.base.json`).
  - Move/configure Next.js under `apps/web`.
- [x] **Task 1.2**: Database Package (`packages/database`)
  - Setup Prisma schema with models: `User`, `SocialAccount`, `Post`, `PostTarget`, `PublishAttempt`, `Media`.
  - Support SQLite (local zero-setup) and PostgreSQL (production/docker).
  - Generate Prisma Client and export typed DB singleton.
- [x] **Task 1.3**: Encryption & Security Vault
  - AES-256-GCM encryption/decryption utilities for sensitive OAuth tokens at rest.
  - Key derivation and environment secret guards.
- [x] **Task 1.4**: Core Domain & Shared Service Layer (`packages/core`)
  - Canonical domain types and interfaces.
  - State machine transition definitions and guards.
  - Timezone-aware date calculations and validation rules.
  - Application services (`PostService`, `ScheduleService`, `AccountService`).
- [x] **Task 1.5**: Docker Compose & Local Orchestration
  - `docker-compose.yml` defining `web`, `worker`, and `postgres`.
  - Multi-stage `Dockerfile` definitions.
  - `.env.example` with comprehensive documentation of required variables.
- [x] **Task 1.6**: Foundation Verification & Tests
  - Unit tests for token encryption roundtrips.
  - Unit tests for state machine transitions.
  - Health check endpoint verification.
- [x] **Task 1.7**: Phase 1 Git Commit

---

## 📌 Phase 2: Social Providers (LinkedIn & X) (COMPLETED)
- [x] **Task 2.1**: Common Provider Interface (`packages/providers`)
  - Define `SocialProvider` contract (`validatePost`, `publishPost`, `getAccount`, `refreshAuth`).
  - Standardized `ProviderPostInput`, `ValidationResult`, `PublishResult`, and `SocialAccountProfile`.
- [x] **Task 2.2**: LinkedIn Provider Adapter
  - OAuth 2.0 PKCE authorization URL and token exchange.
  - LinkedIn v2 / UGC post publication logic.
  - Profile retrieval and token refresh.
- [x] **Task 2.3**: X (Twitter) Provider Adapter
  - OAuth 2.0 PKCE flow with code challenge.
  - X API v2 Tweet creation endpoint.
  - Character count validation and media handling.
- [x] **Task 2.4**: Provider Error Classification Engine
  - Classify transient (rate limits 429, timeouts, 5xx) vs permanent errors (auth revoked 401, validation 400).
- [x] **Task 2.5**: Mock Social Provider
  - Zero-credential provider simulator for local testing and CI.
- [x] **Task 2.6**: Provider Adapter Tests
  - Unit tests with mocked HTTP responses.
- [x] **Task 2.7**: Phase 2 Git Commit & Push

---

## 📌 Phase 3: Scheduling UX (Web Application)
- [ ] **Task 3.1**: Modern Dashboard Layout & Shell (`apps/web`)
  - Responsive navigation (Dashboard, Queue, Calendar, Compose, Accounts, Settings).
  - Modern UI theme with Tailwind CSS.
- [ ] **Task 3.2**: Social Accounts Management UI
  - Connect/Disconnect buttons for LinkedIn and X.
  - Account status badges (Active, Expired, Revoked).
  - Reconnection banner for expired tokens.
- [ ] **Task 3.3**: Post Composer
  - Unified compose interface with canonical text.
  - Platform target toggles with real-time character count limits.
  - Platform-specific text overrides.
- [ ] **Task 3.4**: Scheduling Engine & Timezone Picker
  - Explicit date/time selector with IANA timezone dropdown.
  - Publish Now vs Schedule Later options.
- [ ] **Task 3.5**: Queue & List Views
  - Filter by status (`SCHEDULED`, `PUBLISHING`, `PUBLISHED`, `FAILED`).
  - Inline cancel and reschedule actions.
- [ ] **Task 3.6**: Interactive Calendar View
  - Month and week calendar views with scheduled post indicators.
- [ ] **Task 3.7**: Bulk Scheduler (CSV / JSON)
  - File upload and copy-paste bulk importer (100+ posts).
  - Cadence configuration (e.g. every weekday at 9:00 AM).
  - Interactive preview table with row-level validation and error highlighting.
- [ ] **Task 3.8**: Post Details & History View
  - Full audit trail of publish attempts with safe error messages.
  - Retry button for failed posts.
- [ ] **Task 3.9**: Phase 3 Git Commit

---

## 📌 Phase 4: Publishing Worker Engine
- [ ] **Task 4.1**: Worker Daemon Scaffolding (`apps/worker`)
  - Standalone Node.js process with configurable polling loop.
  - Graceful shutdown handling (`SIGINT`, `SIGTERM`).
- [ ] **Task 4.2**: Atomic Due-Job Claiming
  - Database row-level locking (`locked_at`, `lock_token`).
  - Lease duration management to prevent worker race conditions.
- [ ] **Task 4.3**: Publishing Execution Pipeline
  - Transition from `SCHEDULED` $\rightarrow$ `PUBLISHING`.
  - Invoke target provider adapter with decrypted token.
  - Handle outcomes (`PUBLISHED`, `RETRYABLE_FAILURE`, `FAILED`).
- [ ] **Task 4.4**: Bounded Exponential Backoff
  - Retry scheduler for transient errors with jitter and maximum retry cap.
- [ ] **Task 4.5**: Crash Recovery & Stale Lease Reclaiming
  - Detect expired leases from crashed workers and safely reset state.
- [ ] **Task 4.6**: Safe Audit Logging
  - Durable `PublishAttempt` records without token or secret leakage.
- [ ] **Task 4.7**: Worker Concurrency & Idempotency Tests
- [ ] **Task 4.8**: Phase 4 Git Commit

---

## 📌 Phase 5: MCP (Model Context Protocol) Server
- [ ] **Task 5.1**: MCP Server Scaffolding (`packages/mcp`)
  - Stdio MCP server setup using `@modelcontextprotocol/sdk`.
- [ ] **Task 5.2**: Read Tools Implementation
  - `social_list_accounts`
  - `social_list_scheduled`
  - `social_get_scheduled_post`
  - `social_get_publish_status`
- [ ] **Task 5.3**: Mutation Tools Implementation
  - `social_schedule_post`
  - `social_schedule_bulk`
  - `social_update_schedule`
  - `social_cancel_schedule`
  - `social_publish_now`
- [ ] **Task 5.4**: Core Service Binding
  - Connect all tools directly to `@open-social/core` services.
- [ ] **Task 5.5**: Secret Sanitization Boundary
  - Verify that tool responses contain IDs, statuses, and times—never tokens.
- [ ] **Task 5.6**: MCP Integration Tests
- [ ] **Task 5.7**: Phase 5 Git Commit

---

## 📌 Phase 6: Open-Source Hardening & Release Packaging
- [ ] **Task 6.1**: Setup Guides & Provider Documentation
  - Step-by-step guides for registering LinkedIn & X developer apps.
- [ ] **Task 6.2**: Demo & Seed Mode
  - `npm run seed:demo` for instant exploration with pre-populated posts.
- [ ] **Task 6.3**: End-to-End Integration Verification
- [ ] **Task 6.4**: Security & Redaction Audit
- [ ] **Task 6.5**: License, README & Release Packaging
- [ ] **Task 6.6**: Phase 6 Final Git Commit
