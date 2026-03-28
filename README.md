<div align="center">

# 🏆 LeetTrack

### Friends Daily LeetCode Tracker

**Track your squad's daily LeetCode grind with a beautiful, competitive leaderboard.**

[![Node.js](https://img.shields.io/badge/Node.js-v20-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![GraphQL](https://img.shields.io/badge/Apollo-GraphQL-E10098?logo=graphql&logoColor=white)](https://www.apollographql.com/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vite.dev/)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 📊 **Daily Leaderboard** | Ranked table with solved count, weighted score, status badge & streak |
| 📅 **Monthly View** | Cumulative score bar chart with Easy / Medium / Hard breakdown |
| 🔄 **Manual Refresh** | One-click refresh button — fetches latest data from LeetCode on demand |
| 🔒 **Admin-Protected Delete** | Removing a user requires an admin password (no accidental deletions) |
| 🎨 **Neobrutalism UI** | Bold borders, hard shadows, Space Grotesk font, vibrant accent colors |
| 🌗 **Light / Dark Mode** | Toggle persisted in localStorage — full theme switch |
| 🔥 **Streak Tracking** | Custom streak algorithm (≥ 3 problems/day = Completed) aligned to UTC midnight |
| 📱 **Mobile Responsive** | Fully responsive down to 375px breakpoints |
| 💰 **Zero Paid APIs** | Uses only LeetCode's free public GraphQL endpoint |

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + Vite · Apollo Client · Lucide Icons · Vanilla CSS |
| **Backend** | Node.js + Express v4 · Apollo Server v4 (GraphQL) |
| **Database** | Supabase (hosted PostgreSQL) |
| **Data Source** | LeetCode public GraphQL API — no auth required |
| **Deployment** | Vercel (frontend) · Render (backend) |

---

## 🚀 Quick Start

### 1. Supabase Setup

Create a free project at [supabase.com](https://supabase.com) and run this SQL in the **SQL Editor**:

```sql
CREATE TABLE IF NOT EXISTS participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS daily_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  date DATE NOT NULL,
  solved_today INT DEFAULT 0,
  score INT DEFAULT 0,
  easy_count INT DEFAULT 0,
  medium_count INT DEFAULT 0,
  hard_count INT DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  streak INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(username, date)
);
```

### 2. Backend

```bash
cd server
npm install
```

Create a `.env` file:

```env
PORT=4000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
ADMIN_PASSWORD=your_secret_password
```

```bash
npm run dev
# → http://localhost:4000/graphql
```

### 3. Frontend

```bash
cd client
npm install
npm run dev
# → http://localhost:5173
```

### 4. One-Click Start (Windows)

```bash
start.bat
```

Opens both servers and your browser automatically.

---

## 🎯 Scoring System

| Difficulty | Points |
|------------|--------|
| Easy | 1 pt |
| Medium | 3 pts |
| Hard | 5 pts |

- **Completed** = solved ≥ 3 unique problems in a UTC day
- **Streak** = consecutive days with "Completed" status
- **Monthly Score** = sum of all daily scores in the current calendar month

---

## 🏛️ Architecture

```
┌──────────────┐    GraphQL (HTTP)    ┌──────────────────┐     REST      ┌──────────┐
│              │ ──────────────────►  │                  │ ───────────►  │          │
│  React SPA   │                      │  Express +       │               │ Supabase │
│  (Vite)      │ ◄──────────────────  │  Apollo Server   │ ◄───────────  │ Postgres │
│              │    JSON responses    │                  │    rows       │          │
└──────────────┘                      └────────┬─────────┘               └──────────┘
     Vercel                                    │                          Supabase.com
                                               │ fetch()
                                               ▼
                                     ┌──────────────────┐
                                     │  LeetCode Public  │
                                     │  GraphQL API      │
                                     └──────────────────┘
```

**Data Flow:** User clicks **Refresh** → Frontend fires `refreshDashboard` mutation → Backend fetches latest submissions from LeetCode for all participants → Scores calculated with difficulty weighting → Upserted into Supabase → Fresh leaderboard returned to client.

---

## 🌐 Deployment

| Service | What | Config |
|---------|------|--------|
| **Vercel** | Frontend (`client/`) | Set env: `VITE_GRAPHQL_URL=https://your-render-url/graphql` |
| **Render** | Backend (`server/`) | Build: `cd server && npm install` · Start: `cd server && node src/index.js` · Set env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ADMIN_PASSWORD` |
| **Supabase** | Database | Free tier, zero config after table creation |

---

## 📁 Project Structure

```
leet/
├── server/
│   ├── src/
│   │   ├── graphql/
│   │   │   ├── schema.js          # GraphQL type definitions
│   │   │   └── resolvers.js       # Query / Mutation resolvers
│   │   ├── services/
│   │   │   ├── leetcodeService.js  # LeetCode API fetcher + scoring
│   │   │   └── trackerService.js   # Supabase CRUD + streak logic
│   │   ├── db/
│   │   │   └── supabase.js         # Supabase client init
│   │   ├── jobs/
│   │   │   └── refreshJob.js       # On-demand refresh function
│   │   └── index.js                # Express + Apollo bootstrap
│   ├── .env
│   └── package.json
│
├── client/
│   ├── src/
│   │   ├── apollo/client.js        # Apollo Client config
│   │   ├── components/             # Leaderboard, ParticipantRow, AddParticipant, etc.
│   │   ├── pages/                  # Dashboard, MonthlyLeaderboard
│   │   ├── context/ThemeContext.jsx # Light/Dark state
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css               # Neobrutalism design system
│   ├── vercel.json                  # SPA routing fix
│   └── package.json
│
├── architecture.md
├── ps.md
├── prd.md
├── start.bat
└── README.md
```

---

## 📄 License

MIT — Built with ❤️ for the grind.
