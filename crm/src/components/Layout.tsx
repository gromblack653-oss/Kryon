import { Logo } from '@shopcore/theme';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/endpoints';
import { Avatar } from './Avatar';

const NAV = [
  { to: '/', label: 'Дашборд', icon: '📊', end: true },
  { to: '/customers', label: 'Клієнти', icon: '👥' },
  { to: '/calls', label: 'Дзвінки', icon: '📞' },
  { to: '/settings', label: 'Налаштування', icon: '⚙️' },
];

export function Layout() {
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    logout();
    navigate('/login');
  }

  return (
    <div className="crm-shell">
      <aside className="sidebar">
        <div className="brand">
          <Logo variant="crm" size={26} />
        </div>

        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <Avatar name={user?.name ?? '?'} size={38} />
          <div className="su-info">
            <span className="su-name">{user?.name}</span>
            <span className="su-role">{user?.role === 'admin' ? 'Адміністратор' : 'Оператор'}</span>
          </div>
          <button className="icon-btn" title="Вийти" onClick={handleLogout}>
            ⎋
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
