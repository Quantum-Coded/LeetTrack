import { fetchUserStats } from '../services/leetcodeService.js';
import {
  getAllParticipants,
  upsertDailyRecords,
  getLeaderboard,
  getKnownSlugs,
} from '../services/trackerService.js';

// Manual refresh — called on-demand from GraphQL mutation instead of cron
export async function refreshAllParticipants() {
  console.log('[Refresh] Manual refresh triggered...');
  const participants = await getAllParticipants();

  for (const participant of participants) {
    try {
      // Fetch slugs this user has already solved (from our DB)
      const knownSlugs = await getKnownSlugs(participant.username);
      console.log(`[Refresh] ${participant.username} has ${knownSlugs.size} known slugs in DB`);

      const stats = await fetchUserStats(participant.username, knownSlugs);
      if (stats) {
        await upsertDailyRecords(participant.username, stats);
        const newProblems = stats.reduce((sum, s) => sum + s.solvedToday, 0);
        console.log(`[Refresh] Updated ${participant.username} across ${stats.length} days (${newProblems} new problems)`);
      }
    } catch (err) {
      console.error(`[Refresh] Error updating ${participant.username}:`, err.message);
    }
  }

  const leaderboard = await getLeaderboard();
  console.log('[Refresh] Complete.');
  return leaderboard;
}
