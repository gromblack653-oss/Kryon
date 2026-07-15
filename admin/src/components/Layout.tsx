import { Logo } from '@shopcore/theme';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/endpoints';
import { useSocket } from '../hooks/useSocket';

const NAV = [
  { to: '/', label: 'Дашборд', icon: '📊', end: true },
  { to: '/products', label: 'Товари', icon: '🎮' },
  { to: '/orders', label: 'Замовлення', icon: '📦' },
  { to: '/categories', label: 'Категорії', icon: '🗂️' },
];

export function Layout() {
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();
  useSocket();

  async function handleLogout() {
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    logout();
    navigate('/login');
  }

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo variant="admin" size={26} />
        </div>
        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="side-link">
              <span className="side-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="who">
            <span className="who-name">{user?.name}</span>
            <span className="who-role">адміністратор</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
            Вийти
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
