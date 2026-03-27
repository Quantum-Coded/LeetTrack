import { CheckCircle2, Clock } from 'lucide-react';

export default function StatusBadge({ status }) {
  const isCompleted = status === 'Completed';
  return (
    <span className={`badge ${isCompleted ? 'badge-completed' : 'badge-pending'}`}>
      {isCompleted
        ? <CheckCircle2 size={12} />
        : <Clock size={12} />}
      {status}
    </span>
  );
}
