export const typeDefs = `#graphql
  type Participant {
    id: ID!
    username: String!
    addedAt: String
    active: Boolean
  }

  type LeaderboardEntry {
    username: String!
    solvedToday: Int!
    score: Int!
    status: String!
    streak: Int!
    updatedAt: String
  }

  type MonthlyEntry {
    username: String!
    totalScore: Int!
    easyCount: Int!
    mediumCount: Int!
    hardCount: Int!
  }

  type Query {
    participants: [Participant!]!
    leaderboard: [LeaderboardEntry!]!
    monthlyLeaderboard: [MonthlyEntry!]!
  }

  type Mutation {
    addParticipant(username: String!): Participant!
    removeParticipant(username: String!, password: String!): Boolean!
    refreshDashboard: [LeaderboardEntry!]!
  }
`;
