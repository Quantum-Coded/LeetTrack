import Leaderboard from '../components/Leaderboard';
import AddParticipant from '../components/AddParticipant';
import { UserPlus } from 'lucide-react';

export default function Dashboard() {
  return (
    <div>
      <h1 className="page-title">Friends Dashboard</h1>
      <p className="page-subtitle">
        Track your squad's daily LeetCode grind. ≥ 3 points = ✅ Completed.
      </p>

      <div className="card" style={{ marginBottom: 24 }}>
        <Leaderboard />
      </div>

      <div className="card">
        <h2 className="section-title">
          <UserPlus size={18} /> Add Participant
        </h2>
        <AddParticipant />
      </div>
    </div>
  );
}
