import { useQuery, useMutation, gql } from '@apollo/client';
import { useState } from 'react';
import { LayoutDashboard, AlertCircle, RefreshCw } from 'lucide-react';
import ParticipantRow from './ParticipantRow';

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

const REFRESH_DASHBOARD = gql`
  mutation RefreshDashboard {
    refreshDashboard {
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
  const { data, loading, error, refetch } = useQuery(GET_LEADERBOARD);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const [refreshDashboard] = useMutation(REFRESH_DASHBOARD, {
    onCompleted: () => {
      setLastRefreshed(new Date());
      setRefreshing(false);
      refetch();
    },
    onError: () => setRefreshing(false),
  });

  const handleRefresh = () => {
    setRefreshing(true);
    refreshDashboard();
  };

  const leaderboard = data?.leaderboard ?? [];
  const lastUpdated = leaderboard[0]?.updatedAt ?? null;

  const formatTime = (dateStr) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          <LayoutDashboard size={18} /> Today's Leaderboard
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>
            Last updated: {lastRefreshed ? formatTime(lastRefreshed.toISOString()) : formatTime(lastUpdated)}
          </span>
          <button
            className="btn btn-primary"
            onClick={handleRefresh}
            disabled={refreshing}
            id="refresh-dashboard-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
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
