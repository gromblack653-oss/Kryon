import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="empty-state">
      <h1 className="page-title">404</h1>
      <p className="muted">Сторінку не знайдено.</p>
      <Link to="/" className="btn btn-primary">
        На головну
      </Link>
    </div>
  );
}
