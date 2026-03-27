import cron from 'node-cron';
import { fetchUserStats } from '../services/leetcodeService.js';
import {
  getAllParticipants,
  upsertDailyRecords,
  getLeaderboard,
} from '../services/trackerService.js';
import { pubsub, LEADERBOARD_UPDATED } from '../graphql/pubsub.js';

export function startRefreshJob() {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('[Cron] Refreshing all participants...');
    try {
      const participants = await getAllParticipants();

      for (const participant of participants) {
        try {
          const stats = await fetchUserStats(participant.username);
          if (stats) {
            await upsertDailyRecords(participant.username, stats);
            console.log(`[Cron] Updated ${participant.username} across ${stats.length} days`);
          }
        } catch (err) {
          console.error(`[Cron] Error updating ${participant.username}:`, err.message);
        }
      }

      // Publish updated leaderboard to all subscribers
      const leaderboard = await getLeaderboard();
      pubsub.publish(LEADERBOARD_UPDATED, { leaderboardUpdated: leaderboard });
      console.log('[Cron] Leaderboard published.');
    } catch (err) {
      console.error('[Cron] Refresh job error:', err.message);
    }
  });

  console.log('[Cron] Refresh job started (every 5 min).');
}
