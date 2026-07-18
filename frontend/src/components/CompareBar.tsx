import { Link, useLocation } from 'react-router-dom';
import { useCompareStore } from '../store/compareStore';

export function CompareBar() {
  const ids = useCompareStore((s) => s.ids);
  const clear = useCompareStore((s) => s.clear);
  const location = useLocation();

  if (ids.length === 0 || location.pathname === '/compare') return null;

  return (
    <div className="compare-bar">
      <span className="cb-count">
        До порівняння: <b>{ids.length}</b> / 4
      </span>
      <div className="cb-actions">
        <button className="btn btn-ghost btn-sm" onClick={clear}>
          Очистити
        </button>
        <Link to="/compare" className="btn btn-primary btn-sm">
          Порівняти →
        </Link>
      </div>
    </div>
  );
}
