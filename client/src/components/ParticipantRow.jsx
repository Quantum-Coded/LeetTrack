import { useMutation, gql } from '@apollo/client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, Flame, Crown, User, X, Lock } from 'lucide-react';
import StatusBadge from './StatusBadge';

const REMOVE_PARTICIPANT = gql`
  mutation RemoveParticipant($username: String!, $password: String!) {
    removeParticipant(username: $username, password: $password)
  }
`;

const GET_LEADERBOARD = gql`
  query { leaderboard { username solvedToday score status streak updatedAt } }
`;

const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

export default function ParticipantRow({ entry, rank }) {
  const [showModal, setShowModal] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [remove, { loading }] = useMutation(REMOVE_PARTICIPANT, {
    refetchQueries: [{ query: GET_LEADERBOARD }],
    onCompleted: () => {
      setShowModal(false);
      setPassword('');
      setError('');
    },
    onError: (err) => {
      if (err.message.includes('INVALID_PASSWORD')) {
        setError('Incorrect password');
      } else {
        setError(err.message);
      }
    },
  });

  const handleDelete = () => {
    if (!password.trim()) { setError('Please enter the admin password.'); return; }
    setError('');
    remove({ variables: { username: entry.username, password: password.trim() } });
  };

  const handleCancel = () => {
    setShowModal(false);
    setPassword('');
    setError('');
  };

  const rankDisplay = rank === 0
    ? <span title="Leader"><Crown size={18} style={{ color: 'var(--accent-yellow)' }} /></span>
    : rank <= 2
    ? RANK_EMOJIS[rank]
    : <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{rank + 1}</span>;

  const streakColor = entry.streak >= 7
    ? 'var(--accent-coral)'
    : entry.streak >= 3
    ? 'var(--accent-mint)'
    : 'var(--text-muted)';

  return (
    <>
      <tr>
        <td className="rank-cell">{rankDisplay}</td>
        <td>
          <div className="username-cell">
            <User size={15} style={{ opacity: 0.5, flexShrink: 0 }} />
            <a
              href={`https://leetcode.com/${entry.username}`}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700 }}
            >
              {entry.username}
            </a>
          </div>
        </td>
        <td style={{ textAlign: 'center', fontWeight: 700 }}>
          {entry.solvedToday}
        </td>
        <td>
          <span className="score-chip">{entry.score} pt{entry.score !== 1 ? 's' : ''}</span>
        </td>
        <td>
          <StatusBadge status={entry.status} />
        </td>
        <td>
          <div className="streak-cell" style={{ color: streakColor }}>
            <Flame size={14} />
            {entry.streak}d
          </div>
        </td>
        <td style={{ textAlign: 'center' }}>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => setShowModal(true)}
            title={`Remove ${entry.username}`}
            id={`remove-${entry.username}`}
            style={{ color: 'var(--accent-coral)' }}
          >
            <Trash2 size={14} />
          </button>
        </td>
      </tr>

      {/* Portal the modal to document.body so it doesn't cause table re-layout */}
      {showModal && createPortal(
        <div className="modal-overlay" onClick={handleCancel}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lock size={18} /> Confirm Delete
              </h3>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={handleCancel}>
                <X size={18} />
              </button>
            </div>
            <p style={{ marginBottom: 12, opacity: 0.8 }}>
              Remove <strong>{entry.username}</strong> from the tracker?
            </p>
            <input
              className="input"
              type="password"
              placeholder="Enter admin password…"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleDelete()}
              autoFocus
              style={{ marginBottom: 8, width: '100%' }}
            />
            {error && (
              <p style={{ color: 'var(--accent-coral)', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>
                {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <button className="btn btn-ghost" onClick={handleCancel}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleDelete}
                disabled={loading}
                style={{ background: 'var(--accent-coral)', borderColor: 'var(--accent-coral)' }}
              >
                {loading ? 'Deleting…' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
