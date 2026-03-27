import { useMutation, gql } from '@apollo/client';
import { Trash2, Flame, Trophy, Crown, User } from 'lucide-react';
import StatusBadge from './StatusBadge';

const REMOVE_PARTICIPANT = gql`
  mutation RemoveParticipant($username: String!) {
    removeParticipant(username: $username)
  }
`;

const GET_LEADERBOARD = gql`
  query { leaderboard { username solvedToday score status streak updatedAt } }
`;

const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

export default function ParticipantRow({ entry, rank }) {
  const [remove, { loading }] = useMutation(REMOVE_PARTICIPANT, {
    refetchQueries: [{ query: GET_LEADERBOARD }],
    variables: { username: entry.username },
  });

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
          onClick={() => remove()}
          disabled={loading}
          title={`Remove ${entry.username}`}
          id={`remove-${entry.username}`}
          style={{ color: 'var(--accent-coral)' }}
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}
