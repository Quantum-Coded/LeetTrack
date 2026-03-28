# Product Requirements Document

## LeetCode Friends Daily Tracker (LeetTrack)

### Product Goal

A fun, competitive accountability tool for friend groups solving LeetCode problems daily. Gamifies the grind with difficulty-weighted scoring, streaks, and monthly leaderboards.

### Target Users

- College students preparing for placements / internships
- Competitive programmers in study groups
- Friend coding circles doing daily DSA challenges

---

## Core Features

### 1. User Management
- **Add participant** — enter any public LeetCode username
- **Remove participant** — admin password required (prevents accidental/trolling deletions)
- **Soft deletion** — removed users retain all historical data; re-adding restores them

### 2. Daily Tracking
- Fetches up to 15 recent accepted submissions from LeetCode's public GraphQL API
- Groups submissions by UTC date, deduplicates by problem slug
- Scores each problem: **Easy = 1 pt, Medium = 3 pts, Hard = 5 pts**
- Status: **Completed** (≥ 3 unique problems) or **Pending** (< 3)

### 3. Daily Leaderboard

| # | Username | Solved | Score | Status | Streak | ✕ |
|---|----------|--------|-------|--------|--------|---|
| 🏆 | userA | 4 | 11 | ✅ Completed | 🔥 7d | 🗑️ |
| 2 | userB | 1 | 3 | ⏳ Pending | 2d | 🗑️ |

### 4. Monthly Leaderboard
- Cumulative score aggregated across the entire calendar month
- Visual bar chart per user
- Breakdown: **Easy count, Medium count, Hard count**
- Resets automatically on the 1st of each month

### 5. Streak System
- Custom algorithm — does **not** use LeetCode's native streak
- Requires "Completed" status (≥ 3 problems) to count a day
- Counts consecutive UTC days backward from today
- Resets at **Midnight UTC (5:30 AM IST)**

### 6. Manual Refresh
- Single **Refresh Dashboard** button — no automatic polling or cron jobs
- Fetches live data from LeetCode for all participants on demand
- Displays loading spinner and "Last updated: HH:MM:SS" timestamp
- Auto-triggers after adding a new participant

### 7. Theme & Design
- **Neobrutalism** aesthetic: bold borders, hard shadows, boxy layouts
- **Light / Dark mode** toggle, persisted in localStorage
- **Space Grotesk** font from Google Fonts
- **Lucide React** icons throughout
- Mobile responsive (375px breakpoint)

---

## Security (MVP)

| Action | Protection |
|--------|-----------|
| View dashboard | Public — anyone with the link |
| Add participant | Public — no password needed |
| Remove participant | Admin password required |
| Refresh data | Public — anyone can trigger |

No JWT, OAuth, sessions, or login systems. This is a private MVP dashboard.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite · Apollo Client · Lucide Icons · Vanilla CSS |
| Backend | Node.js + Express v4 · Apollo Server v4 (GraphQL) |
| Database | Supabase (hosted PostgreSQL) |
| Data Source | LeetCode public GraphQL API |
| Deployment | Vercel (frontend) · Render (backend) |
| Paid APIs | **None** |

---

## Future Ideas

- 🤖 Discord / WhatsApp bot for daily notifications
- 📊 GitHub-style heatmap visualization
- 🔗 Shareable public profile links
- 🏅 Achievement badges (first Hard solve, 30-day streak, etc.)
- 📧 Weekly digest emails

---

## MVP Scope

**Included:** Daily leaderboard, monthly view, scoring, streaks, manual refresh, admin delete, light/dark theme, mobile responsive.

**Excluded:** Authentication, payments, social features, notifications, real-time WebSockets.
