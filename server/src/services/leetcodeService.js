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

export async function fetchUserStats(username) {
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
  // Group submissions by UTC date 'YYYY-MM-DD'
  const daysMap = new Map();
  const allSlugsToFetch = new Set();

  for (const sub of submissions.slice(0, 15)) {
    const ts = parseInt(sub.timestamp, 10);
    const d = new Date(ts * 1000);
    const dateStr = [d.getUTCFullYear(), String(d.getUTCMonth() + 1).padStart(2, '0'), String(d.getUTCDate()).padStart(2, '0')].join('-');
    
    if (!daysMap.has(dateStr)) daysMap.set(dateStr, new Map());
    
    if (!daysMap.get(dateStr).has(sub.titleSlug)) {
      daysMap.get(dateStr).set(sub.titleSlug, sub);
      allSlugsToFetch.add(sub.titleSlug);
    }
  }

  // Ensure "today" exists even if 0 submissions, mapping to an empty set
  const todayDate = getTodayUTCDate();
  const todayStr = [todayDate.getUTCFullYear(), String(todayDate.getUTCMonth() + 1).padStart(2, '0'), String(todayDate.getUTCDate()).padStart(2, '0')].join('-');
  if (!daysMap.has(todayStr)) daysMap.set(todayStr, new Map());

  // Fetch difficulties in parallel (limited to what we actually use, max 15)
  const slugsArr = [...allSlugsToFetch];
  const problemDifficulties = new Map();
  if (slugsArr.length > 0) {
    const difficulties = await Promise.all(slugsArr.map(getProblemDifficulty));
    slugsArr.forEach((slug, idx) => problemDifficulties.set(slug, difficulties[idx]));
  }

  const results = [];
  for (const [dateStr, probsMap] of daysMap.entries()) {
    let score = 0;
    let easyCount = 0;
    let mediumCount = 0;
    let hardCount = 0;
    
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
      status: probsMap.size >= 3 ? 'Completed' : 'Pending',
    });
  }

  return results;
}
