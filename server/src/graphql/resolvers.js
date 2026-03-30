import {
  getAllParticipants,
  addParticipant,
  removeParticipant,
  getLeaderboard,
  getMonthlyLeaderboard,
  getKnownSlugs,
} from '../services/trackerService.js';

import { fetchUserStats } from '../services/leetcodeService.js';
import { upsertDailyRecords } from '../services/trackerService.js';
import { refreshAllParticipants } from '../jobs/refreshJob.js';
import dotenv from 'dotenv';
dotenv.config();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export const resolvers = {
  Query: {
    participants: () => getAllParticipants(),
    leaderboard: () => getLeaderboard(),
    monthlyLeaderboard: () => getMonthlyLeaderboard(),
  },

  Mutation: {
    addParticipant: async (_, { username }) => {
      const participant = await addParticipant(username);

      // Instantly fetch their initial stats
      try {
        const knownSlugs = await getKnownSlugs(participant.username);
        const stats = await fetchUserStats(participant.username, knownSlugs);
        if (stats) {
          await upsertDailyRecords(participant.username, stats);
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

    removeParticipant: async (_, { username, password }) => {
      if (password !== ADMIN_PASSWORD) {
        throw new Error('INVALID_PASSWORD');
      }
      return removeParticipant(username);
    },

    refreshDashboard: async () => {
      return refreshAllParticipants();
    },
  },

  // Map snake_case Supabase fields to camelCase GraphQL fields
  Participant: {
    addedAt: (parent) => parent.added_at ?? parent.addedAt,
  },
};
