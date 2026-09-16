# 🚀 Open Social Scheduler

> **Self-hostable, local-first social media scheduling for LinkedIn and X, equipped with a native Model Context Protocol (MCP) interface for AI-assisted operations.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6-informational.svg)](https://www.prisma.io/)
[![MCP](https://img.shields.io/badge/MCP-Native-purple.svg)](https://modelcontextprotocol.io/)

---

## 🌟 Why Open Social Scheduler?

Commercial social media tools (Buffer, Hootsuite, Later) store your sensitive OAuth credentials and private draft contents on their cloud servers. **Open Social Scheduler** gives you total ownership:

- **🔒 Local-First Privacy**: Your SQLite/PostgreSQL database and OAuth tokens remain on your own machine. Tokens are encrypted at rest with **AES-256-GCM**.
- **🤖 MCP-Native for AI Workflows**: AI clients (Claude, Cursor, Antigravity) manage, draft, schedule, and publish posts conversationally using the exact same service layer as the web UI.
- **⚡ Pluggable Social Providers**: The core scheduler is platform-agnostic. Initial support for **LinkedIn** and **X (Twitter)**, plus a built-in **Mock Provider** for zero-setup local exploration.
- **🛡️ Crash-Resilient Worker Engine**: Uses database row leases (`lockedAt`, `lockToken`), bounded exponential backoff retries, and automatic stale lease recovery.
- **📅 Visual Calendar & Queue**: Interactive month calendar, queue inspector, real-time character counters, per-platform overrides, and bulk CSV scheduling for 100+ posts.

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
                                    │    @open-social/core        │
                                    │  (Domain State Machine,     │
                                    │   Scheduling & Validation)  │
                                    └──────────────┬──────────────┘
                                                   │
                            ┌──────────────────────┴──────────────────────┐
                            ▼                                             ▼
             ┌─────────────────────────────┐               ┌─────────────────────────────┐
             │    @open-social/database    │               │    Publishing Worker        │
             │ (Prisma + AES-256 Vault)    │               │ (Leased Polling Daemon)     │
             └─────────────────────────────┘               └──────────────┬──────────────┘
                                                                          │
                                                          ┌───────────────┴───────────────┐
                                                          ▼                               ▼
                                                ┌───────────────────┐           ┌───────────────────┐
                                                │ LinkedIn Adapter  │           │     X Adapter     │
                                                └───────────────────┘           └───────────────────┘
```

---

## ⚡ Quickstart (Zero External Dependencies)

### 1. Clone & Install
```bash
git clone https://github.com/miteshviras/open-social-schedule.git
cd open-social-schedule
npm install
```

### 2. Configure Environment & Push Database
```bash
cp .env.example .env
# Push database schema (defaults to SQLite dev.db automatically)
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

Visit [http://localhost:3000](http://localhost:3000) to access the dashboard!

---

## 🐳 Docker Compose Deployment

To run the entire stack with PostgreSQL:

```bash
docker compose up --build
```

---

## 🤖 AI Integration via Model Context Protocol (MCP)

Open Social Scheduler ships with an MCP server exposing 9 dedicated tools:

| MCP Tool | Operation | Description |
|---|---|---|
| `social_list_accounts` | Read | List connected social accounts and their health status |
| `social_schedule_post` | Mutation | Schedule a post to one or more channels at a given UTC/timezone |
| `social_schedule_bulk` | Mutation | Bulk import and schedule multiple posts with cadence rules |
| `social_list_scheduled` | Read | Query queue/calendar items filtered by date range or status |
| `social_get_scheduled_post` | Read | Inspect specific target details, overrides, and publish history |
| `social_update_schedule` | Mutation | Modify scheduled content or change publication time |
| `social_cancel_schedule` | Mutation | Cancel an upcoming scheduled post |
| `social_publish_now` | Mutation | Immediately dispatch a post to the publishing queue |
| `social_get_publish_status`| Read | Check execution outcome and safe error logs |

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

---

## 🔑 Social Provider Setup

### LinkedIn Application
1. Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/).
2. Create an App and add the **"Sign In with LinkedIn using OpenID Connect"** and **"Share on LinkedIn"** products.
3. Add redirect URI: `http://localhost:3000/api/auth/linkedin/callback` (or port `4000`).
4. Copy `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` into `.env`.

### X (Twitter) Application
1. Go to [X Developer Portal](https://developer.x.com/en/portal/dashboard).
2. Configure User Authentication Settings with **OAuth 2.0 PKCE**.
3. Scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`.
4. Add redirect URI: `http://localhost:3000/api/auth/x/callback`.
5. Copy `X_CLIENT_ID` and `X_CLIENT_SECRET` into `.env`.

---

## 🧪 Testing Suite

Run the full unified test suite across all packages:

```bash
npm test
```

Verifies:
- AES-256-GCM token encryption and key tampering guards
- Domain state machine transitions and invalid status rejections
- Timezone and cadence calculations
- LinkedIn & X character limit and validation rules
- Fastify API health and OAuth endpoints
- Worker row-leasing, crash recovery, and retry backoff
- MCP server tools and secret sanitization boundary

---

## 📄 License

Open Social Scheduler is open-source software licensed under the [MIT License](LICENSE).
