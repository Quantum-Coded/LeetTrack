# Product Requirements Document (PRD)

## LeetCode Friends Daily Tracker

### Product Goal

Create a fun accountability tool for friends solving LeetCode problems
daily.

### Target Users

-   Students
-   Competitive programmers
-   Friend coding groups

### Features

## Core Features

### 1 User Management

-   Add username
-   Remove username
-   Admin control

### 2 Daily Tracking

System should: - Fetch submissions - Count accepted problems - Check
daily target

### 3 Leaderboard

Table:

  Username   Today   Status      Streak
  ---------- ------- ----------- --------
  UserA      3       Completed   5
  UserB      1       Pending     2

### 4 Live Updates

-   Auto refresh
-   Last update timestamp

## Nice to Have

### Gamification

-   Daily winner badge
-   Monthly leaderboard
-   Difficulty scoring

### Scoring Idea

    Easy = 1
    Medium = 3
    Hard = 5

### Future Features

-   Discord bot
-   WhatsApp alerts
-   GitHub heatmap
-   Public share link

## Technical Design

### Backend

-   Node.js or Python
-   GraphQL queries
-   Cron jobs

### Frontend

-   React / Next.js
-   Simple table UI

### Database

-   MongoDB or PostgreSQL

## Metrics

Success measured by: - Daily usage - Streak retention - Friend
participation

## MVP Scope

Must include: - Username input - Daily count - Leaderboard - Auto
refresh

Exclude: - Authentication - Payments - Social features
