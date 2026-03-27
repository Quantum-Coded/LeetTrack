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

const GET_LEADERBOARD = gql`
  query { leaderboard { username solvedToday score status streak updatedAt } }
`;

export default function AddParticipant() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const [addParticipant, { loading }] = useMutation(ADD_PARTICIPANT, {
    refetchQueries: [{ query: GET_LEADERBOARD }],
    onCompleted: () => { setUsername(''); setError(''); },
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) { setError('Please enter a LeetCode username.'); return; }
    setError('');
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
            disabled={loading}
            id="add-username-input"
            autoComplete="off"
          />
        </div>
        <button
          className="btn btn-primary"
          type="submit"
          disabled={loading}
          id="add-participant-btn"
        >
          {loading ? (
            <span style={{ opacity: 0.7 }}>Adding…</span>
          ) : (
            <><Plus size={16} /> <span className="label">Add</span></>
          )}
        </button>
      </form>
    </div>
  );
}
