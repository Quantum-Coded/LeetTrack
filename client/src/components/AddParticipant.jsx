import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { UserPlus, Plus, AlertCircle } from 'lucide-react';

const ADD_PARTICIPANT = gql`
  mutation AddParticipant($username: String!) {
    addParticipant(username: $username) {
      id
      username
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

const GET_LEADERBOARD = gql`
  query { leaderboard { username solvedToday score status streak updatedAt } }
`;

export default function AddParticipant() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const [refreshDashboard] = useMutation(REFRESH_DASHBOARD, {
    refetchQueries: [{ query: GET_LEADERBOARD }],
    onCompleted: () => setAdding(false),
    onError: () => setAdding(false),
  });

  const [addParticipant] = useMutation(ADD_PARTICIPANT, {
    onCompleted: () => {
      setUsername('');
      setError('');
      // Auto-trigger a full refresh so the new user's stats load immediately
      refreshDashboard();
    },
    onError: (err) => {
      setError(err.message);
      setAdding(false);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) { setError('Please enter a LeetCode username.'); return; }
    setError('');
    setAdding(true);
    addParticipant({ variables: { username: trimmed } });
  };

  return (
    <div>
      {error && (
        <div className="error-message">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      <form className="add-form" onSubmit={handleSubmit}>
        <div style={{ position: 'relative', flex: 1 }}>
          <UserPlus
            size={15}
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5, pointerEvents: 'none' }}
          />
          <input
            className="input"
            style={{ paddingLeft: '34px' }}
            placeholder="Enter LeetCode username…"
            value={username}
            onChange={e => setUsername(e.target.value)}
            disabled={adding}
            id="add-username-input"
            autoComplete="off"
          />
        </div>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={adding}
          id="add-participant-btn"
        >
          {adding ? (
            <span style={{ opacity: 0.7 }}>Adding…</span>
          ) : (
            <><Plus size={16} /> <span className="label">Add</span></>
          )}
        </button>
      </form>
    </div>
  );
}
