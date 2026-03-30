const LEETCODE_GQL = 'https://leetcode.com/graphql';

const DIFFICULTY_SCORE = { Easy: 1, Medium: 3, Hard: 5 };

async function gqlFetch(query, variables = {}, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(LEETCODE_GQL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://leetcode.com',
        },
        body: JSON.stringify({ query, variables }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.errors) throw new Error(json.errors[0].message);
      return json.data;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

function getTodayUTCDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function getProblemDifficulty(titleSlug) {
  try {
    const data = await gqlFetch(
      `query q($titleSlug: String!) {
        question(titleSlug: $titleSlug) { difficulty }
      }`,
      { titleSlug }
    );
    return data?.question?.difficulty || 'Easy';
  } catch {
    return 'Easy';
  }
}

/**
 * Fetch user stats from LeetCode and build daily records.
 *
 * Key design decisions:
 * 1. We pass `knownSlugs` (a Set of titleSlugs already recorded in the DB for
 *    this user) so that re-solving an old problem never inflates counts.
 * 2. We never retroactively downgrade old dates. For dates that already have a
 *    saved record in the DB, the caller (upsertDailyRecords) will keep the
 *    MAX of old vs new for every field.
 * 3. We still build records for past dates so streak calculation has history,
 *    but any slug that exists in `knownSlugs` is excluded from counts.
 */
export async function fetchUserStats(username, knownSlugs = new Set()) {
  let submissions = [];
  try {
    const data = await gqlFetch(
      `query q($username: String!, $limit: Int!) {
        recentAcSubmissionList(username: $username, limit: $limit) {
          titleSlug
          timestamp
        }
      }`,
      { username, limit: 50 }
    );
    submissions = data?.recentAcSubmissionList || [];
  } catch (err) {
    console.error(`[LeetCode] Failed to fetch for ${username}:`, err.message);
    return null; // Signal failure — caller will use cached DB record
  }

  // ── Step 1: Group submissions by UTC date ──
  // Each date maps slug → submission (deduped within the same day)
  const daysMap = new Map();
  const allSlugsToFetch = new Set();

  for (const sub of submissions) {
    const ts = parseInt(sub.timestamp, 10);
    const d = new Date(ts * 1000);
    const dateStr = [d.getUTCFullYear(), String(d.getUTCMonth() + 1).padStart(2, '0'), String(d.getUTCDate()).padStart(2, '0')].join('-');
    
    if (!daysMap.has(dateStr)) daysMap.set(dateStr, new Map());
    
    if (!daysMap.get(dateStr).has(sub.titleSlug)) {
      daysMap.get(dateStr).set(sub.titleSlug, sub);
      allSlugsToFetch.add(sub.titleSlug);
    }
  }

  // Ensure "today" exists even if 0 submissions
  const todayDate = getTodayUTCDate();
  const todayStr = [todayDate.getUTCFullYear(), String(todayDate.getUTCMonth() + 1).padStart(2, '0'), String(todayDate.getUTCDate()).padStart(2, '0')].join('-');
  if (!daysMap.has(todayStr)) daysMap.set(todayStr, new Map());

  // ── Step 2: Cross-day dedup + global dedup ──
  // Only count each unique problem on its EARLIEST date within this batch.
  // Also exclude any slug that's already tracked in the DB (knownSlugs).
  const sortedDates = [...daysMap.keys()].sort(); // ascending chronological
  const batchSlugsSeen = new Set();

  for (const dateStr of sortedDates) {
    const probsMap = daysMap.get(dateStr);
    for (const slug of [...probsMap.keys()]) {
      if (knownSlugs.has(slug) || batchSlugsSeen.has(slug)) {
        probsMap.delete(slug); // already counted elsewhere
      } else {
        batchSlugsSeen.add(slug);
      }
    }
  }

  // ── Step 3: Fetch difficulties in parallel ──
  // Only fetch for slugs that actually survived dedup (optimization)
  const survivingSlugs = new Set();
  for (const probsMap of daysMap.values()) {
    for (const slug of probsMap.keys()) survivingSlugs.add(slug);
  }
  const slugsArr = [...survivingSlugs];
  const problemDifficulties = new Map();
  if (slugsArr.length > 0) {
    const difficulties = await Promise.all(slugsArr.map(getProblemDifficulty));
    slugsArr.forEach((slug, idx) => problemDifficulties.set(slug, difficulties[idx]));
  }

  // ── Step 4: Build results sorted oldest-first ──
  // trackerService processes records sequentially,
  // streak calculation for Day N depends on Day N-1 being in the DB already.
  const results = [];
  for (const dateStr of sortedDates) {
    const probsMap = daysMap.get(dateStr);
    let score = 0;
    let easyCount = 0;
    let mediumCount = 0;
    let hardCount = 0;
    
    // Collect the new slugs for this date so tracker can save them
    const newSlugs = [...probsMap.keys()];
    
    for (const slug of probsMap.keys()) {
      const diff = problemDifficulties.get(slug) || 'Easy';
      
      if (diff === 'Medium') mediumCount++;
      else if (diff === 'Hard') hardCount++;
      else easyCount++;
      
      score += DIFFICULTY_SCORE[diff] || 1;
    }

    results.push({
      date: dateStr,
      solvedToday: probsMap.size,
      score,
      easyCount,
      mediumCount,
      hardCount,
      status: score >= 3 ? 'Completed' : 'Pending',
      newSlugs, // pass slugs so tracker can persist them
    });
  }

  return results;
}
