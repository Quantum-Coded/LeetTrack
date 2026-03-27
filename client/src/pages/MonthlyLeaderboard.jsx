import { useQuery, gql } from '@apollo/client';
import { BarChart2, Trophy } from 'lucide-react';

const GET_MONTHLY = gql`
  query {
    monthlyLeaderboard {
      username
      totalScore
      easyCount
      mediumCount
      hardCount
    }
  }
`;

export default function MonthlyLeaderboard() {
  const { data, loading, error } = useQuery(GET_MONTHLY, { pollInterval: 60000 });

  const entries = data?.monthlyLeaderboard ?? [];
  const maxScore = entries.length ? entries[0].totalScore : 1;

  const monthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div>
      <h1 className="page-title">
        <BarChart2 style={{ verticalAlign: 'middle', marginRight: 8 }} size={28} />
        Monthly Leaderboard
      </h1>
      <p className="page-subtitle">{monthName} — cumulative scores</p>

      {error && (
        <div className="error-message">Failed to load monthly data: {error.message}</div>
      )}

      {loading && !data ? (
        <div className="card">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
              <div className="skeleton" style={{ width: 100, height: 20 }} />
              <div className="skeleton" style={{ flex: 1, height: 28 }} />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <p style={{ fontWeight: 700 }}>No data for this month yet</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="monthly-bars">
            {entries.map((e, i) => (
              <div key={e.username} className="monthly-bar-row">
                <div className="monthly-bar-label" title={e.username}>
                  {i === 0 && <Trophy size={13} style={{ color: 'var(--accent-yellow)', marginRight: 4, verticalAlign: 'middle' }} />}
                  {e.username}
                </div>
                <div className="monthly-bar-track">
                  <div
                    className="monthly-bar-fill"
                    style={{ width: `${Math.round((e.totalScore / maxScore) * 100)}%` }}
                  >
                    {e.totalScore > 0 && `${e.totalScore}pt`}
                  </div>
                </div>
                {e.totalScore > 0 && (
                  <div style={{ fontSize: '0.8rem', marginTop: '6px', opacity: 0.9, display: 'flex', gap: '12px' }}>
                     <span style={{ color: 'var(--accent-mint)', fontWeight: 600 }}>Easy: {e.easyCount}</span>
                     <span style={{ color: 'var(--accent-yellow)', fontWeight: 600 }}>Med: {e.mediumCount}</span>
                     <span style={{ color: 'var(--accent-coral)', fontWeight: 600 }}>Hard: {e.hardCount}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
