const LEETCODE_GQL = 'https://leetcode.com/graphql';
async function run() {
  const res = await fetch(LEETCODE_GQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com' },
    body: JSON.stringify({
      query: 'query q($u: String!, $l: Int!) { recentAcSubmissionList(username: $u, limit: $l) { titleSlug timestamp } }',
      variables: { u: 'pushpendra_rathod', l: 150 }
    })
  });
  const data = await res.json();
  const subs = data.data.recentAcSubmissionList;
  const days = {};
  for (const s of subs) {
    const d = new Date(parseInt(s.timestamp) * 1000).toISOString().slice(0, 10);
    if (!days[d]) days[d] = new Set();
    days[d].add(s.titleSlug);
  }
  for (const d of Object.keys(days).sort()) {
    console.log(d, days[d].size);
  }
}
run();
