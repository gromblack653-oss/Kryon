import { Logo } from '@shopcore/theme';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const login = useMutation({
    mutationFn: () => authApi.login({ email, password }),
    onSuccess: (data) => {
      if (data.user.role !== 'admin') {
        setError('Доступ лише для адміністраторів.');
        return;
      }
      setAuth(data);
      navigate('/');
    },
    onError: (err) => setError(apiError(err)),
  });

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h1>
          <Logo variant="admin" size={28} />
        </h1>
        <p className="muted">Панель керування магазином відеокарт</p>
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
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" style={{ width: '100%' }} disabled={login.isPending}>
            {login.isPending ? 'Вхід...' : 'Увійти'}
          </button>
        </form>
        <div className="hint">
          Демо-адмін: <code>admin@kryon.ua / Admin123!</code>
        </div>
      </div>
    </div>
  );
}
