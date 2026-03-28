import { fetchUserStats } from '../services/leetcodeService.js';
import {
  getAllParticipants,
  upsertDailyRecords,
  getLeaderboard,
} from '../services/trackerService.js';

// Manual refresh — called on-demand from GraphQL mutation instead of cron
export async function refreshAllParticipants() {
  console.log('[Refresh] Manual refresh triggered...');
  const participants = await getAllParticipants();

  for (const participant of participants) {
    try {
      const stats = await fetchUserStats(participant.username);
      if (stats) {
        await upsertDailyRecords(participant.username, stats);
        console.log(`[Refresh] Updated ${participant.username} across ${stats.length} days`);
      }
    } catch (err) {
      console.error(`[Refresh] Error updating ${participant.username}:`, err.message);
    }
  }

  const leaderboard = await getLeaderboard();
  console.log('[Refresh] Complete.');
  return leaderboard;
}
