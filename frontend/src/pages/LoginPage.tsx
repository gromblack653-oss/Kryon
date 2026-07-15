import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { apiError } from '../api/client';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/';

  const login = useMutation({
    mutationFn: () => authApi.login({ email, password }),
    onSuccess: (data) => {
      setAuth(data);
      navigate(from, { replace: true });
    },
    onError: (err) => setError(apiError(err)),
  });

  return (
    <div className="auth-card card">
      <h1>Вхід</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError('');
          login.mutate();
        }}
      >
        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Пароль
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-lg" disabled={login.isPending}>
          {login.isPending ? 'Входимо...' : 'Увійти'}
        </button>
      </form>
      <p className="muted">
        Немає акаунту? <Link to="/register">Зареєструватися</Link>
      </p>
      <div className="hint">
        Демо: <code>admin@shopcore.dev / Admin123!</code> або{' '}
        <code>user@shopcore.dev / User123!</code>
      </div>
    </div>
  );
}
