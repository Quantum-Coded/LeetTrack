import { pubsub, LEADERBOARD_UPDATED } from './pubsub.js';
import {
  getAllParticipants,
  addParticipant,
  removeParticipant,
  getLeaderboard,
  getMonthlyLeaderboard,
} from '../services/trackerService.js';

import { fetchUserStats } from '../services/leetcodeService.js';
import { upsertDailyRecords } from '../services/trackerService.js';

export const resolvers = {
  Query: {
    participants: () => getAllParticipants(),
    leaderboard: () => getLeaderboard(),
    monthlyLeaderboard: () => getMonthlyLeaderboard(),
  },

  Mutation: {
    addParticipant: async (_, { username }) => {
      const participant = await addParticipant(username);
      
      // Instantly fetch their initial stats so the UI doesn't say "Updated never"
      try {
        const stats = await fetchUserStats(participant.username);
        if (stats) {
          await upsertDailyRecords(participant.username, stats);
          const leaderboard = await getLeaderboard();
          pubsub.publish(LEADERBOARD_UPDATED, { leaderboardUpdated: leaderboard });
        }
      } catch (err) {
        console.error('Initial fetch failed:', err.message);
      }
      
      return {
        id: participant.id,
        username: participant.username,
        addedAt: participant.added_at,
        active: participant.active,
      };
    },
    removeParticipant: async (_, { username }) => removeParticipant(username),
  },

  Subscription: {
    leaderboardUpdated: {
      subscribe: () => pubsub.asyncIterator([LEADERBOARD_UPDATED]),
    },
  },

  // Map snake_case Supabase fields to camelCase GraphQL fields
  Participant: {
    addedAt: (parent) => parent.added_at ?? parent.addedAt,
  },
};
