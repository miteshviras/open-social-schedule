<p align="center">
  <a href="https://github.com/miteshviras/open-social-schedule">
    <img src="apps/web/public/logo-mark.svg" width="88" height="88" alt="Open Social Scheduler Logo" />
  </a>
</p>

<h1 align="center">Open Social Scheduler</h1>

<p align="center">
  <strong>Self-hostable, local-first social media scheduling for LinkedIn & X, equipped with a native Model Context Protocol (MCP) interface for AI workflows.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16-000000.svg?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" /></a>
  <a href="https://fastify.dev/"><img src="https://img.shields.io/badge/Fastify-5.2-000000.svg?style=flat-square&logo=fastify&logoColor=white" alt="Fastify" /></a>
  <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma-6-2D3748.svg?style=flat-square&logo=prisma&logoColor=white" alt="Prisma" /></a>
  <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP-Native_9_Tools-7C3AED.svg?style=flat-square" alt="MCP" /></a>
  <img src="https://img.shields.io/badge/Tests-30%2F30_Passing-10B981.svg?style=flat-square" alt="Tests: 30/30 Passing" />
  <img src="https://img.shields.io/badge/Privacy-Zero_Telemetry-0ea5e9.svg?style=flat-square" alt="Privacy: Zero Telemetry" />
</p>

---

## 🌟 Why Open Social Scheduler?

Commercial social media schedulers (Buffer, Hootsuite, Later) require you to hand over your sensitive OAuth tokens, drafts, and campaign data to their third-party cloud infrastructure.

**Open Social Scheduler** gives you total ownership and privacy:

| Cloud SaaS (Buffer / Hootsuite) | Open Social Scheduler |
|---|---|
| Stores OAuth tokens on third-party cloud servers | **🔒 Local-First Privacy**: Database and OAuth credentials stay on your machine with **AES-256-GCM** encryption at rest. |
| Monthly subscription tiers & strict post limits | **⚡ 100% Free & Open Source**: Self-host locally or deploy to your own private VPS. |
| Siloed proprietary APIs | **🤖 MCP-Native for AI**: AI agents (Claude, Cursor, Antigravity) draft, schedule, and publish via natural language. |
| Vendor lock-in | **📦 Pluggable Provider Architecture**: Platform-agnostic core engine. Easily add Threads, Bluesky, Mastodon. |
| Closed or flaky background processes | **🛡️ Crash-Resilient Worker**: Database atomic row leases (`lockedAt`, `lockToken`), exponential retries, and stale lease recovery. |

---

## 📸 Key Features & UI Surfaces

- **📊 Dashboard Overview (`/`)**: Live metric counters for scheduled, published, and failed posts, plus a *"Next Up to Publish"* live countdown banner with instant publish triggers.
- **✏️ Post Composer (`/compose`)**: Multi-channel targeting, live character counts (**X: 280**, **LinkedIn: 3,000**), tailored **platform-specific text overrides**, and explicit IANA timezone scheduling.
- **⏳ Schedule Queue (`/queue`)**: Filter posts by status (`SCHEDULED`, `PUBLISHING`, `PUBLISHED`, `FAILED`, `CANCELED`) and inspect granular execution audit attempts with safe error classification.
- **📅 Interactive Calendar (`/calendar`)**: Visual monthly calendar planner showing scheduled releases across channels.
- **📦 Bulk CSV Importer (`/bulk`)**: Schedule 100+ posts at once with cadence interval rules (e.g. every 60 min, daily at 9:00 AM) and an **interactive live preview table** with row-level validation.
- **🔗 Social Accounts (`/accounts`)**: One-click OAuth 2.0 PKCE connection for **LinkedIn** and **X**, plus a built-in **Mock Channel** for instant exploration without developer keys.

---

## 🏗️ Architecture

```
                    ┌─────────────────────────┐         ┌─────────────────────────┐
                    │    Web UI (Next.js 16)  │         │   AI Agent (via MCP)    │
                    └────────────┬────────────┘         └────────────┬────────────┘
                                 │                                   │
                                 │ HTTP (REST)                       │ Stdio Transport
                                 ▼                                   ▼
                    ┌─────────────────────────┐         ┌─────────────────────────┐
                    │    API Server (Fastify) │         │       MCP Server        │
                    └────────────┬────────────┘         └────────────┬────────────┘
                                 │                                   │
                                 └─────────────────┬─────────────────┘
                                                   │
                                                   ▼
                                    ┌─────────────────────────────┐
                                    │      @open-social/core      │
                                    │   (State Machine, Domain,   │
                                    │    Scheduling & Validation) │
                                    └──────────────┬──────────────┘
                                                   │
                            ┌──────────────────────┴──────────────────────┐
                            ▼                                             ▼
             ┌─────────────────────────────┐               ┌─────────────────────────────┐
             │    @open-social/database    │               │    Publishing Worker        │
             │  (Prisma + AES-256 Vault)   │               │   (Leased Polling Loop)     │
             └─────────────────────────────┘               └──────────────┬──────────────┘
                                                                          │
                                                          ┌───────────────┴───────────────┐
                                                          ▼                               ▼
                                                ┌───────────────────┐           ┌───────────────────┐
                                                │ LinkedIn Adapter  │           │     X Adapter     │
                                                └───────────────────┘           └───────────────────┘
```

### Monorepo Structure

```plain text
open-social-schedule/
├── apps/
│   ├── web/                     # Next.js 16 App Router (Dashboard, Calendar, Queue, Bulk UI)
│   ├── api/                     # Fastify REST API Server (port 4000)
│   └── worker/                  # Leased background publishing worker daemon
├── packages/
│   ├── core/                    # Domain logic, state machine, scheduling services
│   ├── database/                # Prisma schema (SQLite / Postgres) + AES-256-GCM vault
│   ├── providers/               # SocialProvider implementations (LinkedIn, X, Mock)
│   └── mcp/                     # Stdio Model Context Protocol (MCP) server
├── scripts/
│   └── seed-demo.ts             # Instant zero-config demo seeder
├── docker-compose.yml           # Multi-container orchestration (web, api, worker, db)
├── tasks.md                     # Implementation phase progress tracker
└── .env.example                 # Environment configuration template
```

---

## ⚡ Quickstart (Zero External Dependencies)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/miteshviras/open-social-schedule.git
cd open-social-schedule
npm install
```

### 2. Configure Environment & Push Database
```bash
cp .env.example .env
# Generates and pushes database schema (defaults to SQLite dev.db automatically)
npx prisma db push --schema=packages/database/prisma/schema.prisma
```

### 3. Seed Demo Data (Instant Exploration)
Populate realistic sample channels, scheduled posts, and publish logs:
```bash
npm run seed:demo
```

### 4. Start Development Services
Open three terminal tabs (or run with Docker Compose):

```bash
# Terminal 1: API Server (port 4000)
npm run dev:api

# Terminal 2: Web Dashboard (port 3000)
npm run dev:web

# Terminal 3: Publishing Worker Engine
npm run dev:worker
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

---

## 🐳 Docker Compose Deployment

To run the entire stack with a production-ready PostgreSQL instance:

```bash
docker compose up --build
```

Services started:
- `open_social_web`: Next.js frontend (Port `3000`)
- `open_social_worker`: Background polling daemon
- `open_social_db`: PostgreSQL 16 (Port `5432`)

---

## 🤖 AI Assistant Integration via Model Context Protocol (MCP)

Open Social Scheduler includes an MCP server that gives LLM clients direct access to your local social media schedule without duplicating business logic:

### The 9 MCP Tools

| MCP Tool | Type | Description |
|---|---|---|
| `social_list_accounts` | Read | List connected social accounts and their health status (zero secrets exposed) |
| `social_schedule_post` | Mutation | Schedule a post to one or more channels at a given UTC/timezone |
| `social_schedule_bulk` | Mutation | Bulk import and schedule multiple posts with cadence intervals |
| `social_list_scheduled` | Read | Query queue/calendar items filtered by date range, status, or provider |
| `social_get_scheduled_post` | Read | Inspect specific target details, overrides, and publish attempt history |
| `social_update_schedule` | Mutation | Reschedule an existing post to a new date/time |
| `social_cancel_schedule` | Mutation | Cancel an upcoming scheduled publication |
| `social_publish_now` | Mutation | Immediately dispatch a post target to the publishing queue |
| `social_get_publish_status`| Read | Check execution outcome and safe error logs for a post target |

### Claude Desktop / Cursor Configuration

Add this entry to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "social-scheduler": {
      "command": "node",
      "args": ["/absolute/path/to/open-social-schedule/packages/mcp/dist/index.js"],
      "env": {
        "DATABASE_URL": "file:/absolute/path/to/open-social-schedule/packages/database/prisma/dev.db",
        "ENCRYPTION_SECRET": "your-32-character-secret-encryption-key!"
      }
    }
  }
}
```

Now you can ask Claude:
> *"What posts do I have scheduled for LinkedIn this week?"*  
> *"Schedule these 5 engineering tips on X every weekday at 10:00 AM."*  
> *"Publish post target cm123 now."*

---

## 🔑 Social Provider Setup

### LinkedIn Application
1. Go to the [LinkedIn Developer Portal](https://www.linkedin.com/developers/).
2. Create an App and enable **"Sign In with LinkedIn using OpenID Connect"** and **"Share on LinkedIn"**.
3. Add redirect URI: `http://localhost:3000/api/auth/linkedin/callback`.
4. Copy `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` into `.env`.

### X (Twitter) Application
1. Go to the [X Developer Portal](https://developer.x.com/en/portal/dashboard).
2. Configure User Authentication Settings with **OAuth 2.0 PKCE**.
3. Scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`.
4. Add redirect URI: `http://localhost:3000/api/auth/x/callback`.
5. Copy `X_CLIENT_ID` and `X_CLIENT_SECRET` into `.env`.

---

## 🧪 Testing Suite (100% Passing)

Run the unified test suite across all packages:

```bash
npm test
```

Verification includes:
- **AES-256-GCM Vault**: Encrypt/decrypt roundtrips, key tampering detection.
- **State Machine**: Validates transitions (`DRAFT` $\rightarrow$ `SCHEDULED` $\rightarrow$ `PUBLISHING` $\rightarrow$ `PUBLISHED` / `RETRYABLE_FAILURE` / `FAILED` / `CANCELED`).
- **Timezone Calculations**: Precision conversion between local IANA timezones and UTC execution instants.
- **Provider Constraints**: Real-time validation of character limits (**LinkedIn: 3,000**, **X: 280**).
- **Error Classifier**: Correctly identifies transient errors (429, timeouts, 5xx) for exponential backoff retries vs permanent errors (401, 400).
- **Worker Engine**: Database row-locking, lease tokens, and stale lease crash recovery.
- **MCP Server**: Tool registration, schema validation, and zero-secret redaction boundary.

---

## 📄 License

Open Social Scheduler is open-source software licensed under the [MIT License](LICENSE).
