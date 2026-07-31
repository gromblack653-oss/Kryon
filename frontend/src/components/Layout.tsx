import { Logo } from '@shopcore/theme';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/endpoints';
import { useCartStore, cartCount } from '../store/cartStore';
import { useSocket } from '../hooks/useSocket';
import { useWishlist } from '../hooks/useWishlist';
import { CompareBar } from './CompareBar';

export function Layout() {
  const { user, refreshToken, logout } = useAuthStore();
  const navigate = useNavigate();
  const wishlist = useWishlist();
  useSocket();

  const count = cartCount(useCartStore((s) => s.items));

  async function handleLogout() {
    if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
    logout();
    navigate('/');
  }

  return (
    <div className="app">
      <header className="navbar">
        <Link to="/" className="brand">
          <Logo size={26} />
        </Link>
        <nav className="nav-links">
          <NavLink to="/">Каталог</NavLink>
          <NavLink to="/builder">Збірка ПК</NavLink>
          <NavLink to="/promo" className="nav-promo">
            Акції
          </NavLink>
          <NavLink to="/cart">Кошик{count > 0 && <span className="badge">{count}</span>}</NavLink>
          {user?.role === 'customer' && (
            <>
              <NavLink to="/wishlist">
                Обране{wishlist.count > 0 && <span className="badge">{wishlist.count}</span>}
              </NavLink>
              <NavLink to="/orders">Мої замовлення</NavLink>
            </>
          )}
        </nav>
        <div className="nav-auth">
          {user ? (
            <>
              <span className="user-name">{user.name}</span>
              <button className="btn btn-ghost" onClick={handleLogout}>
                Вийти
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn btn-ghost">
                Увійти
              </NavLink>
              <NavLink to="/register" className="btn btn-primary">
                Реєстрація
              </NavLink>
            </>
          )}
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>

      <footer className="footer">
        <strong>Kryon</strong> · Холодна голова, гаряча гра
        <br />© {new Date().getFullYear()} — демо fullstack-проєкт (React · Node · PostgreSQL)
      </footer>

      <CompareBar />
    </div>
  );
}
