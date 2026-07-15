import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { apiError } from '../api/client';

export function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const register = useMutation({
    mutationFn: () => authApi.register(form),
    onSuccess: (data) => {
      setAuth(data);
      navigate('/');
    },
    onError: (err) => setError(apiError(err)),
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="auth-card card">
      <h1>Реєстрація</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError('');
          register.mutate();
        }}
      >
        <label>
          Ім'я
          <input required minLength={2} value={form.name} onChange={set('name')} />
        </label>
        <label>
          Email
          <input type="email" required value={form.email} onChange={set('email')} />
        </label>
        <label>
          Пароль
          <input type="password" required value={form.password} onChange={set('password')} />
          <small className="muted">Мінімум 8 символів, велика літера і цифра.</small>
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-lg" disabled={register.isPending}>
          {register.isPending ? 'Створюємо...' : 'Зареєструватися'}
        </button>
      </form>
      <p className="muted">
        Вже є акаунт? <Link to="/login">Увійти</Link>
      </p>
    </div>
  );
}
