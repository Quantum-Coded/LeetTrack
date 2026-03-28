# LeetTrack — Architecture Overview

A comprehensive technical reference for software engineers working on or reviewing the LeetTrack codebase.

---

## 1. System Architecture

LeetTrack is a full-stack web application built using a decoupled client/server pattern. The frontend is a React SPA deployed on Vercel, communicating with a Node.js + Apollo Server backend deployed on Render, which stores data in Supabase (hosted PostgreSQL) and fetches live data from LeetCode's public GraphQL API.

```
┌──────────────┐    GraphQL (HTTP)    ┌──────────────────┐     REST      ┌──────────┐
│  React SPA   │ ──────────────────►  │  Express v4 +    │ ───────────►  │ Supabase │
│  Vite + Apollo│ ◄──────────────────  │  Apollo Server v4│ ◄───────────  │ Postgres │
└──────────────┘    JSON responses    └────────┬─────────┘    rows       └──────────┘
     Vercel                                    │ fetch()                  Supabase.com
                                               ▼
                                     ┌──────────────────┐
                                     │  LeetCode Public  │
                                     │  GraphQL API      │
                                     └──────────────────┘
```

### 1.1 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + Vite | React 19, Vite 5 |
| State / Data | Apollo Client | v3 |
| Icons | lucide-react | latest |
| Styling | Vanilla CSS (Neobrutalism design system) | — |
| Backend Runtime | Node.js + Express | Node 20, Express v4 |
| API Layer | Apollo Server (GraphQL) | v4 |
| Database | Supabase (PostgreSQL) | Free tier |
| Deployment (FE) | Vercel | — |
| Deployment (BE) | Render (Web Service) | — |

### 1.2 Key Design Decisions

- **Express v4 (not v5):** Apollo Server v4's `expressMiddleware` was designed for Express v4. Express v5 causes runtime incompatibilities.
- **No WebSockets / Subscriptions:** Removed in favor of a simpler manual refresh model. Eliminates complexity, reduces Render resource usage, and avoids ISP-level WebSocket blocking issues.
- **No Cron Jobs:** Refresh is fully on-demand (user-triggered). Prevents unnecessary LeetCode API calls and simplifies the server to a stateless request handler.
- **Soft Deletion:** Removing a user sets `active: false` instead of deleting rows. Historical data is preserved and restored if the user is re-added.

---

## 2. Core Modules & Data Flow

### 2.1 Manual Refresh (`refreshJob.js`)

The refresh function is invoked on-demand via the `refreshDashboard` GraphQL mutation (no cron, no polling).

```
User clicks "Refresh" → Frontend fires refreshDashboard mutation
→ Backend calls refreshAllParticipants()
→ For each active participant:
    → fetchUserStats(username) from LeetCode
    → upsertDailyRecords(username, records) into Supabase
→ getLeaderboard() returns fresh sorted data
→ Frontend re-renders
```

### 2.2 LeetCode Data Fetcher (`leetcodeService.js`)

Queries LeetCode's public GraphQL endpoint at `https://leetcode.com/graphql`.

**Key behaviors:**
- Fetches up to **50 recent accepted submissions** via `recentAcSubmissionList`
- Groups the latest **15 submissions** by UTC date (`YYYY-MM-DD`)
- Deduplicates by `titleSlug` within each day
- Fetches difficulty metadata for each unique problem via `question(titleSlug)` query
- Scores: Easy = 1, Medium = 3, Hard = 5
- Returns an **array of day objects** (not just today), enabling historical backfilling
- Retry logic: 3 attempts with exponential backoff (1s, 2s, 3s)
- All timestamps aligned to **Midnight UTC** (matching LeetCode's official day boundary)

**Return shape:**
```javascript
[
  { date: '2026-03-28', solvedToday: 3, score: 7, easyCount: 1, mediumCount: 1, hardCount: 1, status: 'Completed' },
  { date: '2026-03-27', solvedToday: 2, score: 4, easyCount: 0, mediumCount: 1, hardCount: 0, status: 'Pending' },
]
```

### 2.3 Tracker Service (`trackerService.js`)

Handles all Supabase database operations.

| Function | Description |
|----------|-------------|
| `getAllParticipants()` | Returns all `active: true` participants |
| `addParticipant(username)` | Upserts (lowercased) into `participants`, sets `active: true` |
| `removeParticipant(username)` | Sets `active: false` (soft delete) |
| `upsertDailyRecords(username, records)` | Iterates array of day objects, upserts each with streak calculation |
| `getStreak(username, status, date)` | Descending scan of last 90 days, counts consecutive "Completed" days |
| `getLeaderboard()` | Joins participants + today's records, sorted by score desc then streak desc |
| `getMonthlyLeaderboard()` | Aggregates scores + difficulty counts for the current calendar month |

### 2.4 Streak Algorithm

LeetTrack uses a **custom streak algorithm** — it does NOT use LeetCode's native streak.

**Rules:**
- A day counts toward the streak only if `status === "Completed"` (≥ 3 unique accepted problems)
- Streak is calculated by scanning backward from the current date
- Query: last 90 `daily_records` rows for the user, ordered by date descending
- Loop: decrement expected date by 1 day; if the row matches and is "Completed", increment streak; otherwise break
- Complexity: O(k) where k = current streak length
- Reset boundary: **Midnight UTC (5:30 AM IST)**

---

## 3. Database Schema (Supabase PostgreSQL)

### Table: `participants`
| Column | Type | Constraints |
|--------|------|------------|
| `id` | UUID | PK, auto-generated |
| `username` | TEXT | UNIQUE, NOT NULL, lowercased |
| `added_at` | TIMESTAMPTZ | DEFAULT now() |
| `active` | BOOLEAN | DEFAULT true (soft delete flag) |

### Table: `daily_records`
| Column | Type | Constraints |
|--------|------|------------|
| `id` | UUID | PK, auto-generated |
| `username` | TEXT | NOT NULL |
| `date` | DATE | NOT NULL (YYYY-MM-DD, UTC) |
| `solved_today` | INT | DEFAULT 0 |
| `score` | INT | DEFAULT 0 |
| `easy_count` | INT | DEFAULT 0 |
| `medium_count` | INT | DEFAULT 0 |
| `hard_count` | INT | DEFAULT 0 |
| `status` | TEXT | DEFAULT 'Pending' |
| `streak` | INT | DEFAULT 0 |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() |
| | | **UNIQUE(username, date)** |

The `UNIQUE(username, date)` constraint ensures that multiple refresh invocations safely execute as SQL `UPSERT` operations without creating duplicate rows.

---

## 4. GraphQL API

### Queries
| Query | Returns | Description |
|-------|---------|-------------|
| `participants` | `[Participant!]!` | All active participants |
| `leaderboard` | `[LeaderboardEntry!]!` | Today's ranked leaderboard |
| `monthlyLeaderboard` | `[MonthlyEntry!]!` | Current month's cumulative scores with difficulty breakdown |

### Mutations
| Mutation | Args | Returns | Description |
|----------|------|---------|-------------|
| `addParticipant` | `username: String!` | `Participant!` | Adds user + auto-fetches their stats |
| `removeParticipant` | `username: String!, password: String!` | `Boolean!` | Soft-deletes user (requires admin password) |
| `refreshDashboard` | — | `[LeaderboardEntry!]!` | Fetches fresh data from LeetCode for all users |

### Security
- `removeParticipant` validates `password` against the `ADMIN_PASSWORD` environment variable
- Invalid password throws `INVALID_PASSWORD` error
- No JWT, OAuth, or session-based auth (MVP scope)

---

## 5. Frontend Architecture

### Apollo Client (`apollo/client.js`)
- Simple `HttpLink` pointing to the backend GraphQL endpoint
- URL configurable via `VITE_GRAPHQL_URL` environment variable
- Falls back to `http://localhost:4000/graphql` for local development
- No WebSocket link (subscriptions removed)

### Key Components

| Component | Responsibility |
|-----------|---------------|
| `Leaderboard.jsx` | Fetches & displays daily leaderboard, hosts Refresh button |
| `ParticipantRow.jsx` | Renders a single leaderboard row, handles delete with password modal (React Portal) |
| `AddParticipant.jsx` | Username input form, auto-triggers refresh after adding |
| `StatusBadge.jsx` | Renders Completed (green) or Pending (amber) badge |
| `ThemeToggle.jsx` | Sun/Moon icon button, toggles light/dark theme |
| `MonthlyLeaderboard.jsx` | Monthly score bar chart with difficulty breakdown |

### Design System
- **Style:** Neobrutalism — bold 2.5px borders, hard offset box-shadows, 4px border-radius
- **Font:** Space Grotesk (Google Fonts)
- **Colors:** Yellow `#FFDD00`, Coral `#FF6B6B`, Mint `#00E5A0`
- **Theming:** CSS variables on `:root` (light) and `[data-theme="dark"]` (dark)
- **Animations:** Hover translate, skeleton shimmer, modal slide-up, refresh spin

---

## 6. Environment Variables

### Backend (`server/.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_ANON_KEY` | ✅ | Supabase anonymous public key |
| `ADMIN_PASSWORD` | ✅ | Password for delete operations |
| `PORT` | ❌ | Server port (default: 4000) |

### Frontend (Vercel Environment Variables)
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GRAPHQL_URL` | ✅ | Full URL to backend GraphQL endpoint |
