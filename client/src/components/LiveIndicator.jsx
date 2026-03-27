import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function LiveIndicator({ lastUpdated, isLive }) {
  const [ago, setAgo] = useState('');

  useEffect(() => {
    function update() {
      if (!lastUpdated) { setAgo('never'); return; }
      const diff = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 1000);
      if (diff < 60) setAgo(`${diff}s ago`);
      else if (diff < 3600) setAgo(`${Math.floor(diff / 60)}m ago`);
      else setAgo(`${Math.floor(diff / 3600)}h ago`);
    }
    update();
    const id = setInterval(update, 10000);
    return () => clearInterval(id);
  }, [lastUpdated]);

  return (
    <div className="live-indicator">
      <span className={`live-dot ${isLive ? '' : 'offline'}`} />
      {isLive ? <Wifi size={13} /> : <WifiOff size={13} />}
      <RefreshCw size={12} />
      <span>Updated {ago}</span>
    </div>
  );
}
