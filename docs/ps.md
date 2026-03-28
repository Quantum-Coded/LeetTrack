# Problem Statement

## LeetCode Friends Daily Tracker

### Objective

Build a dashboard that tracks whether each participant in a friend group solves at least **3 LeetCode problems daily**, using only their public LeetCode usernames.

### Problem

Friend groups doing daily DSA challenges lack a simple, automated way to track consistency. Manual reporting causes friction, is easy to fake, and doesn't scale. The system should automatically fetch progress from LeetCode and display results in a competitive leaderboard format.

### Inputs

- A list of LeetCode usernames (e.g., `hetsalot`, `Dev_QuantumCoder`)
- Add / remove username operations (remove protected by admin password)

### Functional Requirements

#### User Management
- Add a participant by LeetCode username
- Remove a participant (admin password required)
- Soft-delete: removed users retain their historical data and can be re-added

#### Data Collection
- Fetch recent accepted submissions via LeetCode's public GraphQL API
- Group submissions by UTC date, deduplicate by problem slug
- Score each problem by difficulty: Easy = 1, Medium = 3, Hard = 5
- Backfill up to 15 recent submissions across multiple historical days

#### Dashboard
- Daily leaderboard: username, solved count, score, status, streak
- Monthly leaderboard: cumulative score with Easy/Medium/Hard breakdown
- Manual refresh button (no automatic polling)
- Last updated timestamp

#### Status Logic

```
Solved ≥ 3 unique problems in a UTC day → Completed
Solved < 3                              → Pending
```

#### Streak Logic
- Custom algorithm (not LeetCode's native streak)
- Counts consecutive UTC days with "Completed" status
- Resets at Midnight UTC (5:30 AM IST)

### Non-Functional Requirements

- Support 5–50 users
- Mobile responsive (375px breakpoint)
- Handle LeetCode API failures gracefully (retry with exponential backoff)
- Admin-protected destructive actions

### Constraints

- Only public LeetCode data (no authentication tokens)
- No paid APIs
- No user login system (MVP scope)
- Username-only input

### Success Criteria

- Automatic tracking from public LeetCode data
- Manual refresh on demand
- Difficulty-weighted scoring with monthly aggregation
- Easy user management with admin protection
- Zero manual reporting required
