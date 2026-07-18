import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoriesApi } from '../api/endpoints';
import { apiError } from '../api/client';

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', slug: '' });
  const [error, setError] = useState('');

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const create = useMutation({
    mutationFn: () => categoriesApi.create(form),
    onSuccess: () => {
      setForm({ name: '', slug: '' });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Категорії</h1>
      </div>

      <div className="dash-grid">
        <div className="card">
          <h3>Список</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Назва</th>
                <th>Slug</th>
              </tr>
            </thead>
            <tbody>
              {categories?.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="mono muted">{c.slug}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>Нова категорія</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError('');
              create.mutate();
            }}
          >
            <label>
              Назва
              <input
                required
                minLength={2}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </label>
            <label>
              Slug (латиниця)
              <input
                required
                pattern="[a-z0-9-]+"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="rtx-50"
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Створення...' : 'Створити'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
