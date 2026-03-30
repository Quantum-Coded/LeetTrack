import { supabase } from '../db/supabase.js';

// ──────────────────────────────────────────────
// Participants
// ──────────────────────────────────────────────

export async function getAllParticipants() {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .eq('active', true)
    .order('added_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function addParticipant(username) {
  const { data, error } = await supabase
    .from('participants')
    .upsert({ username: username.trim().toLowerCase(), active: true }, { onConflict: 'username' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeParticipant(username) {
  const { error } = await supabase
    .from('participants')
    .update({ active: false })
    .eq('username', username.trim().toLowerCase());
  if (error) throw error;
  return true;
}

// ──────────────────────────────────────────────
// Solved Slugs — global dedup across all time
// ──────────────────────────────────────────────

/**
 * Fetch every slug this user has ever solved (from our DB).
 * Returns a Set<string> of titleSlugs.
 */
export async function getKnownSlugs(username) {
  const slugs = new Set();
  const cleanUser = username.trim().toLowerCase();

  // Fetch from solved_slugs table
  const { data, error } = await supabase
    .from('solved_slugs')
    .select('slug')
    .eq('username', cleanUser);

  if (error) {
    // Table might not exist yet — that's okay, fall through
    console.warn('[Slugs] Could not fetch solved_slugs:', error.message);
    return slugs;
  }

  for (const row of data || []) {
    slugs.add(row.slug);
  }
  return slugs;
}

/**
 * Save newly discovered slugs to the solved_slugs table.
 */
async function saveSlugs(username, slugs, date) {
  if (!slugs || slugs.length === 0) return;
  const cleanUser = username.trim().toLowerCase();

  const rows = slugs.map(slug => ({
    username: cleanUser,
    slug,
    solved_date: date,
  }));

  const { error } = await supabase
    .from('solved_slugs')
    .upsert(rows, { onConflict: 'username,slug' });

  if (error) {
    console.warn('[Slugs] Could not save slugs:', error.message);
  }
}

// ──────────────────────────────────────────────
// Daily Records
// ──────────────────────────────────────────────

export async function upsertDailyRecords(username, records) {
  const cleanUser = username.trim().toLowerCase();

  for (const record of records) {
    const { date, solvedToday, score, easyCount, mediumCount, hardCount, status, newSlugs } = record;

    // Fetch existing record for this date
    const { data: existing } = await supabase
      .from('daily_records')
      .select('solved_today, score, easy_count, medium_count, hard_count, status')
      .eq('username', cleanUser)
      .eq('date', date)
      .maybeSingle();

    // ── Merge logic: NEVER downgrade any field ──
    // The new values from LeetCode API are ADDITIVE to existing DB values.
    // On each refresh, leetcodeService only returns NEW unique slugs (not
    // previously tracked ones), so we ADD counts/scores to existing values.
    const mergedSolvedToday = (existing?.solved_today || 0) + solvedToday;
    const mergedScore = (existing?.score || 0) + score;
    const mergedEasy = (existing?.easy_count || 0) + (easyCount || 0);
    const mergedMedium = (existing?.medium_count || 0) + (mediumCount || 0);
    const mergedHard = (existing?.hard_count || 0) + (hardCount || 0);
    
    // Status: 'Completed' if cumulative score >= 3, or if already completed
    const mergedStatus = (mergedScore >= 3 || existing?.status === 'Completed')
      ? 'Completed'
      : (status === 'Completed' ? 'Completed' : 'Pending');

    const streak = await getStreak(cleanUser, mergedStatus, date);

    const { error } = await supabase
      .from('daily_records')
      .upsert(
        {
          username: cleanUser,
          date,
          solved_today: mergedSolvedToday,
          score: mergedScore,
          easy_count: mergedEasy,
          medium_count: mergedMedium,
          hard_count: mergedHard,
          status: mergedStatus,
          streak,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'username,date' }
      );
    if (error) console.error(`[Supabase] Upsert error for ${cleanUser} on ${date}:`, error.message);

    // Persist newly solved slugs so future refreshes don't re-count them
    await saveSlugs(cleanUser, newSlugs, date);
  }
}

export async function getStreak(username, currentStatus, today) {
  // Fetch last 90 days of records, sorted descending
  const { data, error } = await supabase
    .from('daily_records')
    .select('date, status')
    .eq('username', username.trim().toLowerCase())
    .lt('date', today)
    .order('date', { ascending: false })
    .limit(90);

  if (error) return currentStatus === 'Completed' ? 1 : 0;

  let streak = currentStatus === 'Completed' ? 1 : 0;

  // Walk backwards day-by-day from "today - 1" checking for continuous Completed
  const checkDate = new Date(today + 'T00:00:00Z'); // force UTC parse

  // Build a lookup map for O(1) access instead of iterating linearly
  const dateStatusMap = new Map();
  for (const record of data) {
    dateStatusMap.set(record.date, record.status);
  }

  for (let i = 0; i < 90; i++) {
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    const expectedDate = checkDate.toISOString().slice(0, 10);
    const status = dateStatusMap.get(expectedDate);

    if (status === 'Completed') {
      streak++;
    } else {
      break; // gap or non-completed day → streak ends
    }
  }

  return streak;
}

export async function getLeaderboard() {
  const today = new Date().toISOString().slice(0, 10);

  // Get all active participants
  const participants = await getAllParticipants();
  if (!participants.length) return [];

  const usernames = participants.map(p => p.username);

  // Get today's records for all participants
  const { data, error } = await supabase
    .from('daily_records')
    .select('*')
    .eq('date', today)
    .in('username', usernames);

  if (error) throw error;

  const recordMap = new Map((data || []).map(r => [r.username, r]));

  const leaderboard = participants.map(p => {
    const record = recordMap.get(p.username);
    return {
      username: p.username,
      solvedToday: record?.solved_today ?? 0,
      score: record?.score ?? 0,
      status: record?.status ?? 'Pending',
      streak: record?.streak ?? 0,
      updatedAt: record?.updated_at ?? null,
    };
  });

  // Sort: score desc, then streak desc
  leaderboard.sort((a, b) => b.score - a.score || b.streak - a.streak);
  return leaderboard;
}

export async function getMonthlyLeaderboard() {
  const now = new Date();
  // Use UTC consistently for first/last day of month
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const firstDay = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
  // Last day of the month = day 0 of next month
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);

  const participants = await getAllParticipants();
  const usernames = participants.map(p => p.username);

  const { data, error } = await supabase
    .from('daily_records')
    .select('username, score, easy_count, medium_count, hard_count')
    .gte('date', firstDay)
    .lte('date', lastDay)
    .in('username', usernames);

  if (error) throw error;

  const totals = {};
  for (const row of data || []) {
    if (!totals[row.username]) {
      totals[row.username] = { score: 0, easy: 0, medium: 0, hard: 0 };
    }
    totals[row.username].score += row.score || 0;
    totals[row.username].easy += row.easy_count || 0;
    totals[row.username].medium += row.medium_count || 0;
    totals[row.username].hard += row.hard_count || 0;
  }

  return Object.entries(totals)
    .map(([username, counts]) => ({ 
      username, 
      totalScore: counts.score,
      easyCount: counts.easy,
      mediumCount: counts.medium,
      hardCount: counts.hard
    }))
    .sort((a, b) => b.totalScore - a.totalScore);
}
