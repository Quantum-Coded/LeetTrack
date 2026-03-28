# LeetTrack Architecture Overview

This document outlines the high-level architecture, technology stack, and core logic behind the LeetCode Friends Daily Tracker (LeetTrack) application.

## 1. High-Level Architecture
LeetTrack is a modernized full-stack application built using a decoupled client/server pattern. It scrapes data from the public LeetCode GraphQL API, stores analytics in a Supabase (PostgreSQL) database, and delivers real-time updates to connected clients using Apollo GraphQL Subscriptions over WebSockets.

### 1.1 Tech Stack
* **Frontend:** React, Vite, Apollo Client, `lucide-react` (Icons).
* **Backend:** Node.js, Express (v4), Apollo Server (v4), `graphql-ws` (v5), `graphql-subscriptions` (v2), `node-cron`.
* **Database:** Supabase (Remote PostgreSQL cluster).
* **Deployment:** Vercel (Frontend SPA), Render (Backend long-running Node service).

---

## 2. Core Modules & Data Flow

### 2.1 The Backend Poller (`refreshJob.js`)
Because LeetCode's public GraphQL endpoint does not support native push-based webhooks upon submission, LeetTrack utilizes an active polling strategy. 
* A `node-cron` orchestrator fires exactly every **5 minutes**. 
* It queries the Supabase `participants` table to retrieve all `active: true` users.
* For each user, it executes `fetchUserStats` against LeetCode. 
* Once all new analytical daily records are safely upserted into Supabase, the orchestrator triggers an Apollo `PubSub` GraphQL Subscription event across the `LEADERBOARD_UPDATED` WebSocket channel, forcing connected React clients to re-render globally.

### 2.2 Intelligent Historical Backfilling (`leetcodeService.js`)
When querying LeetCode via `recentAcSubmissionList`, the API strictly returns the latest $N$ (configured at 15) recent algorithmic submissions.
* To convert sequential problem submissions into distinct chronological days, the backend parses Unix timestamps and isolates them at precisely **Midnight UTC (5:30 AM IST)**—perfectly mirroring LeetCode's official chronological reset clock boundary.
* Each extracted problem slug (`titleSlug`) is recursively passed into `getProblemDifficulty` to pull down its specific Easy/Medium/Hard metadata constraint in parallel.
* This automatically clusters historical days backward in time and gracefully patches null-gaps in the PostgreSQL database if a user hasn't opened the UI for several days.

### 2.3 Difficulty-Weighted Scoring System
Points are strictly mapped against algorithmic complexity mapping per problem:
* **Easy:** 1 point
* **Medium:** 3 points
* **Hard:** 5 points

The backend performs deduplication on `titleSlug` explicitly to prevent score-inflation if a user submits consecutive identical successful solutions for the same exact problem in a given UTC 24-hour block.

### 2.4 The Streak Algorithm (`trackerService.js`)
LeetTrack does *not* utilize LeetCode's native streak tracking to ensure absolute integrity against non-algorithmic streak spam (e.g. daily check-ins on LC). 
Our logic requires a `status` of `"Completed"` (defined explicitly as $\ge$ 3 unique accepted algorithm solutions per day) to progress a streak. 
* To calculate the current streak efficiently, `getStreak` runs an optimized descending time-series query across the user's trailing 90 days from the `daily_records` Postgres table. 
* It decrements the UTC date by exactly $1$ day per iteration, incrementing the counter integer until it detects a day where `status !== "Completed"` or a row does not exist, abruptly breaking the loop to yield $O(k)$ streak complexity.

---

## 3. Supabase Database Schema
Data integrity strictly utilizes UUIDs and strict uniqueness constraints per day to prevent polling race conditions.

**Table 1: `participants`**
* `id`: UUID (PK)
* `username`: TEXT (Unique, lowered)
* `added_at`: TIMESTAMPTZ 
* `active`: BOOLEAN (Enables "soft deletion" on the frontend so rows never destruct).

**Table 2: `daily_records`**
* `id`: UUID (PK)
* `username`: TEXT
* `date`: DATE (YYYY-MM-DD UTC)
* `solved_today`: INT
* `score`: INT
* `easy_count`, `medium_count`, `hard_count`: INT (Chronological diff accumulation)
* `status`: TEXT ('Completed' | 'Pending')
* `streak`: INT
* `UNIQUE(username, date)`: Strongly enforced conflict constraint ensuring multiple cron invocations just execute identical SQL `UPSERT` overrides across the day.

---

## 4. The Client Application (`client/`)
The frontend utilizes a robust `Neobrutalism` static design system wrapped inside Vite.
* **Dual-Link Apollo Client:** The `apollo/client.js` initiates an operation split link: 
  * Mutations & Queries (`GET_MONTHLY`, `ADD_PARTICIPANT`) route to traditional HTTP `fetch`. 
  * Subscriptions (The real-time leaderboard) persist across a dedicated lightweight `graphql-ws` socket.
* **SPA Routing & Vercel Fix:** React Router handles single-page transitions without full DOM reloads. A `vercel.json` rewrite rule forcibly points `/monthly` internal paths to `/index.html` on HTTP refresh requests, guaranteeing 404 bypasses on the static Vercel edge network natively.
