# LeetTrack — Friends Daily LeetCode Tracker

A real-time leaderboard to track your friend group's daily LeetCode grind.  
**Stack:** Node.js · Apollo Server (GraphQL) · Supabase (PostgreSQL) · React (Vite) · Lucide Icons  
**Theme:** Neobrutalism · Light/Dark mode · Zero paid APIs

---

## Quick Start

### 1. Supabase Setup

Create a free project at [supabase.com](https://supabase.com).  
Run the following SQL in the **SQL Editor**:

```sql
CREATE TABLE participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true
);

CREATE TABLE daily_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  date DATE NOT NULL,
  solved_today INT DEFAULT 0,
  score INT DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  streak INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(username, date)
);
```

Copy your **Project URL** and **anon public key** from Settings → API.

---

### 2. Backend

```bash
cd server
# Fill in your Supabase credentials
cp .env .env.local   # or just edit .env directly
# SUPABASE_URL=https://xxxx.supabase.co
# SUPABASE_ANON_KEY=your_anon_key
# PORT=4000

npm run dev
# → http://localhost:4000/graphql (Apollo Studio)
```

### 3. Frontend

```bash
cd client
npm run dev
# → http://localhost:5173
```

---

## Features

| Feature | Details |
|---|---|
| Live leaderboard | GraphQL subscriptions via WebSocket |
| Auto-refresh | Cron job every 5 min + 5-min poll fallback |
| Daily tracking | Solved today, score (E=1, M=3, H=5), status |
| Streak | Consecutive days with ≥ 3 problems solved |
| Monthly view | Cumulative score bar chart |
| Gamification | Crown for #1, flame streaks, score chips |
| Theme | Neobrutalism · Light/Dark toggle |
| Icons | Lucide React throughout |

---

## Scoring

```
Easy   → 1 pt
Medium → 3 pts
Hard   → 5 pts
Completed = solved ≥ 3 unique problems today
```

---

## Architecture

```
client (Vite React) ──GraphQL──► server (Express + Apollo)
                                        │
                               LeetCode public GraphQL
                                        │
                                  Supabase (PostgreSQL)
```

Cron runs every 5 min → fetches LeetCode data → upserts Supabase → publishes `leaderboardUpdated` subscription → all connected clients update instantly.
