import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { operatorsApi } from '../api/endpoints';
import { apiError } from '../api/client';

const EMPTY = { name: '', email: '', phone: '', password: '' };

export function OperatorsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  const { data: operators } = useQuery({ queryKey: ['operators'], queryFn: operatorsApi.list });

  const create = useMutation({
    mutationFn: () => operatorsApi.create({ ...form, phone: form.phone || undefined }),
    onSuccess: () => {
      setForm(EMPTY);
      queryClient.invalidateQueries({ queryKey: ['operators'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => operatorsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['operators'] }),
  });

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Оператори</h1>
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3>Оператори CRM ({operators?.length ?? 0})</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Ім&apos;я</th>
                <th>Email</th>
                <th>Телефон</th>
                <th>Дзвінків</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {operators?.map((o) => (
                <tr key={o.id}>
                  <td>{o.name}</td>
                  <td className="muted">{o.email}</td>
                  <td className="mono muted">{o.phone ?? '—'}</td>
                  <td>{o.calls}</td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (confirm(`Видалити оператора ${o.name}?`)) remove.mutate(o.id);
                      }}
                    >
                      Видалити
                    </button>
                  </td>
                </tr>
              ))}
              {!operators?.length && (
                <tr>
                  <td colSpan={5} className="muted">
                    Ще немає операторів
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Новий оператор</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError('');
              create.mutate();
            }}
          >
            <label>
              Ім&apos;я
              <input
                required
                minLength={2}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label>
              Email
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="operator@kryon.ua"
              />
            </label>
            <label>
              Телефон
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+380..."
              />
            </label>
            <label>
              Пароль
              <input
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Мін. 8 символів, велика літера й цифра"
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Створення...' : 'Створити оператора'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
