import { useQuery, useSubscription, gql } from '@apollo/client';
import { useState } from 'react';
import { LayoutDashboard, AlertCircle } from 'lucide-react';
import ParticipantRow from './ParticipantRow';
import LiveIndicator from './LiveIndicator';

const GET_LEADERBOARD = gql`
  query GetLeaderboard {
    leaderboard {
      username
      solvedToday
      score
      status
      streak
      updatedAt
    }
  }
`;

const LEADERBOARD_SUB = gql`
  subscription {
    leaderboardUpdated {
      username
      solvedToday
      score
      status
      streak
      updatedAt
    }
  }
`;

function SkeletonRow() {
  return (
    <tr>
      {[52, 130, 60, 80, 100, 60, 44].map((w, i) => (
        <td key={i}>
          <div className="skeleton" style={{ width: w, height: 18, borderRadius: 'var(--radius)' }} />
        </td>
      ))}
    </tr>
  );
}

export default function Leaderboard() {
  const { data, loading, error, refetch } = useQuery(GET_LEADERBOARD, {
    pollInterval: 5 * 60 * 1000, // fallback poll every 5 min
  });

  const [isLive, setIsLive] = useState(false);
  const [liveData, setLiveData] = useState(null);

  useSubscription(LEADERBOARD_SUB, {
    onData: ({ data: { data } }) => {
      if (data?.leaderboardUpdated) {
        setLiveData(data.leaderboardUpdated);
        setIsLive(true);
      }
    },
    onError: () => setIsLive(false),
  });

  const leaderboard = liveData ?? data?.leaderboard ?? [];
  const lastUpdated = leaderboard[0]?.updatedAt ?? null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          <LayoutDashboard size={18} /> Today's Leaderboard
        </h2>
        <LiveIndicator lastUpdated={lastUpdated} isLive={isLive} />
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={16} /> Failed to load leaderboard: {error.message}
        </div>
      )}

      <div className="leaderboard-wrap">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'center' }}>#</th>
              <th>Username</th>
              <th style={{ textAlign: 'center' }}>Solved</th>
              <th>Score</th>
              <th>Status</th>
              <th>Streak</th>
              <th style={{ textAlign: 'center' }}>✕</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              : leaderboard.length === 0
              ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <div className="empty-icon">🏁</div>
                      <p style={{ fontWeight: 700, marginBottom: 4 }}>No participants yet</p>
                      <p style={{ fontSize: '0.85rem' }}>Add a LeetCode username below to get started.</p>
                    </div>
                  </td>
                </tr>
              )
              : leaderboard.map((entry, i) => (
                <ParticipantRow key={entry.username} entry={entry} rank={i} />
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
