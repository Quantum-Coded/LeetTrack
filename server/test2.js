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
  let count25 = 0;
  for (const s of subs) {
    const d = new Date(parseInt(s.timestamp) * 1000).toISOString().slice(0, 10);
    if (d === '2026-03-25') {
       count25++;
       console.log('2026-03-25 Submission:', s.titleSlug);
    }
  }
  console.log('Total accepted submissions on March 25:', count25);
}
run();
