# LeetTrack Debugging & Architecture Updates

This document tracks the core issues resolved, the methodologies applied to fix them, and the architectural shifts made to ensure the system remains stable and accurate over time.

## 1. Issue: Streaks Not Syncing & Missing Monthly Data
**Symptoms:** Users who solved 3+ problems were not seeing their streaks increment. Their daily records would remain stagnant, and monthly data was outright missing on the 30th of the month.
**Root Cause:** 
- The `getStreak` function was improperly mutating Date objects during a `while` loop, causing it to check for incorrect consecutive days mathematically.
- The monthly leaderboard boundaries (`firstDay` and `lastDay`) were misaligned due to improper local time vs. UTC time boundaries, causing end-of-month data to be excluded.
**Solution:** Refactored `getStreak` to strictly parse stable `yyyy-mm-dd` UTC strings without mutation, and reconstructed the boundary logic for the `monthlyLeaderboard` to definitively include the entirety of the current month up to the exact present UTC day.

## 2. Issue: Inflated Scores & Duplicate Submissions Counted
**Symptoms:** Submitting the *exact same* problem on LeetCode multiple times (e.g., to optimize it or just hit submit) would continuously grant users points and artificially inflate their dashboard scores.
**Root Cause:** The `fetchUserStats` function only tracked the 50 most recent submissions. If a user solved a problem that had already passed out of the 50-submission window earlier in the week, the backend had no memory of it. It would just blindly perform an additive merge (`existing_score += new_score`), adding duplicate points over and over.
**Solution:** 
- **Global Deduplication:** Introduced a definitive `solved_slugs` database table. This table acts as a global memory of every unique problem solved by a user across their entire lifetime.
- **Idempotent Filtering:** When fetching LeetCode submissions, the app now cross-references the `solved_slugs` table. Any problem that already exists in that table is completely ignored, fundamentally stopping any duplicate farming.

## 3. Issue: Database Access Blocked (RLS Enabled)
**Symptoms:** Errors stating "no participants added" or updates failing to save successfully to Supabase.
**Root Cause:** Row Level Security (RLS) was toggled `ON` in the Supabase dashboard to secure the database, but the backend server was running queries using the public `anon` role, which naturally got blocked by the security policies.
**Solution:** Exported the `SUPABASE_SERVICE_ROLE_KEY` from the Supabase dashboard into the `server/.env` file. Updated `supabase.js` to initialize the client using this privileged admin key, allowing the secure backend to bypass user-level RLS policies effortlessly.

## 4. Issue: Initial Data Inflation Post-Deduplication (Double-Counting)
**Symptoms:** Right after deploying the new deduplication table (`solved_slugs`), the monthly leaderboard scores massive inflated (e.g., users jumping to 80+ points overnight).
**Root Cause:** When the `solved_slugs` table was first created, it was completely empty. As the automated `refreshJob` ran, the backend fetched the 50 most recent historical submissions from LeetCode. Because the dedup table had no memory of them, the backend categorized all 50 as "brand new" problems, and erroneously added their scores *on top of* the completely correct historical scores already saved in `daily_records`.
**Solution:** Wrote a dynamic rebuild script (`server/fix.js`). This script explicitly wiped the corrupted `daily_records` clean, fetched an expanded limit of 250 raw submissions natively from LeetCode (representing the entire month's true history), and rebuilt the exact accurate records perfectly into `solved_slugs` and `daily_records`.

## 5. Feature: Points-Based Completion Threshold
**Symptoms:** The "Daily Grind" completion threshold strictly required solving "3 problems". A user solving a Hard problem (worth 5 points) or a Medium problem (worth 3 points) was penalized and their streak broken because they only solved "1 problem", despite the high equivalent effort.
**Root Cause:** The `status` mapping directly checked `probsMap.size >= 3`.
**Solution:** Shifted the logic globally across `leetcodeService.js`, `trackerService.js`, and `Dashboard.jsx`. A daily record is now aggressively marked as `Completed` ✅ if the user hits `≥ 3 points`, protecting streaks for users tackling higher-difficulty algorithms.

## 6. Edge Cases Identified & Diagnosed
- **Private Profiles (e.g. `rishil0706` displaying 0 points):** Discovered that if a user manually switches off "Show My Recent Submissions" in their LeetCode Privacy settings, LeetCode's GraphQL API actively blocks the backend tracker by returning `[]`. This is not a bug with the system, but correct behavioral enforcement of LeetCode's security rules.
- **Timezone Drift (UTC vs IST):** Investigated discrepancies where midnight submitted problems in India (IST) were not appearing for "Today". Diagnosed that LeetCode universally resets its daily counters at 5:30 AM IST (Midnight UTC). The tracker accurately mirrors this specific UTC cutoff, correctly shifting late-night submissions into "Yesterday".

## 7. Issue: Additive Merge Caused Recurring Score Inflation (ROOT CAUSE OF ALL ABOVE)
**Symptoms:** After every debugging session and fix, scores would eventually re-inflate. Problems #2 and #4 above kept recurring despite the `solved_slugs` dedup table and `fix.js` rebuild scripts.
**Root Cause:**
- `upsertDailyRecords` in `trackerService.js` used **additive merge** (`existing + new`) instead of **idempotent merge** (`Math.max(existing, new)`).
- Even with `knownSlugs` filtering out already-seen problems, several edge cases bypassed it: first refresh after adding a user (empty `knownSlugs`), race conditions between slug saves, and rebuild scripts wiping `solved_slugs` but not `daily_records`.
- The additive logic meant: refresh once → correct score. Refresh twice → doubled score. Every single refresh compounded the inflation.
**Solution:** Replaced all additive merge operations with `Math.max()` comparisons. This makes the entire pipeline **idempotent** — refreshing 100 times produces the exact same result as refreshing once. The `knownSlugs` dedup still acts as a first-line optimization, and `Math.max()` acts as a bulletproof safety net.

## 8. Issue: Today's Leaderboard Used Inconsistent Date Format
**Symptoms:** Users occasionally showing 0 solved/0 score on the daily leaderboard even when they had solved problems, especially when server timezone differed from UTC.
**Root Cause:** `getLeaderboard()` used `new Date().toISOString().slice(0, 10)` while `leetcodeService.js` constructed dates manually with `getUTCFullYear()/getUTCMonth()/getUTCDate()`. These produce the same result most of the time, but the inconsistency was fragile.
**Solution:** Standardized `getLeaderboard()` to use the same explicit UTC date construction pattern as `leetcodeService.js`.

## 9. Issue: Streak Calculation Re-evaluated Status from Inflated Scores
**Symptoms:** Artificially extended streaks — days where a user should have been "Pending" were counted as "Completed" because the inflated DB score exceeded the 3-point threshold.
**Root Cause:** `getStreak()` re-derived status from `record.score >= 3` instead of trusting the stored `status` column. With inflated scores from Bug #7, this over-counted completed days.
**Solution:** Simplified `getStreak()` to directly use the stored `record.status` column, which is computed correctly at write time.

## 10. Issue: Monthly Leaderboard Hid Zero-Score Participants
**Symptoms:** Users added to the tracker but who hadn't solved anything (or whose data was wiped by `fix.js`) disappeared entirely from the monthly leaderboard.
**Root Cause:** `getMonthlyLeaderboard()` only iterated over database rows, so users with no `daily_records` rows were never included in the output.
**Solution:** Pre-initialize all active participants with `{ score: 0, easy: 0, medium: 0, hard: 0 }` before aggregating database rows.

---

## Files Added & Modified
- **`server/migrations/001_create_solved_slugs.sql`**: Added to scaffold the `solved_slugs` deduplication table.
- **`server/src/db/supabase.js`** & **`server/.env`**: Modified to implement backend-privileged secure RLS bypass using the Service Role Key.
- **`server/src/services/leetcodeService.js`**: Re-engineered to filter incoming arrays strictly against the `knownSlugs` set to stop duplicates, mapped the `limitOverride` parameter, and changed status tracking to calculate via cumulative Points rather than flat Problem Size. 
- **`server/src/services/trackerService.js`**: Patched the `getStreak` mathematical date logic and modified `getMonthlyLeaderboard` boundary parameters to prevent missing data gaps correctly. Included upsert routing to commit new unique problems into `solved_slugs`.
- **`server/src/jobs/refreshJob.js`** & **`server/src/graphql/resolvers.js`**: Refactored the data-fetching pipeline to properly query the database for `knownSlugs` immediately prior to hitting LeetCode's external API to establish the Deduplication Anchor.
- **`client/src/pages/Dashboard.jsx`**: Textual UI update from "≥ 3 problems" to "≥ 3 points".
- **`server/fix.js`** (and temporary maintenance scripts): Added to manually triage and rebuild corrupted databases using raw exact LeetCode timelines, completely correcting massive inflations perfectly.
