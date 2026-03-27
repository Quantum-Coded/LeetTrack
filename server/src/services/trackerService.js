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
// Daily Records
// ──────────────────────────────────────────────

export async function upsertDailyRecords(username, records) {
  for (const record of records) {
    const { date, solvedToday, score, easyCount, mediumCount, hardCount, status } = record;
    const streak = await getStreak(username, status, date);

    const { error } = await supabase
      .from('daily_records')
      .upsert(
        {
          username: username.trim().toLowerCase(),
          date,
          solved_today: solvedToday,
          score,
          easy_count: easyCount || 0,
          medium_count: mediumCount || 0,
          hard_count: hardCount || 0,
          status,
          streak,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'username,date' }
      );
    if (error) console.error(`[Supabase] Upsert error for ${username} on ${date}:`, error.message);
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
  const checkDate = new Date(today);

  for (const record of data) {
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    const expectedDate = checkDate.toISOString().slice(0, 10);
    if (record.date === expectedDate && record.status === 'Completed') {
      streak++;
    } else {
      break;
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
  const firstDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString().slice(0, 10);
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
    .toISOString().slice(0, 10);

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
