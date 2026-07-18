import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { productsApi, categoriesApi, ProductQuery } from '../api/endpoints';
import { formatPrice } from '../lib/format';
import { apiError } from '../api/client';
import { ProductImage } from '../components/ProductImage';
import type { Product } from '../types';

const EMPTY = { title: '', slug: '', description: '', price: '', stock: '', categoryId: '' };

export function ProductsPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState<ProductQuery>({ page: 1, limit: 10, sort: 'newest' });
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ price: '', stock: '', is_active: true });
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
  const { data } = useQuery({
    queryKey: ['admin-products', query],
    queryFn: () => productsApi.list(query),
    placeholderData: keepPreviousData,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-products'] });

  const create = useMutation({
    mutationFn: () =>
      productsApi.create({
        title: form.title,
        slug: form.slug,
        description: form.description,
        price: Math.round(Number(form.price) * 100),
        stock: Number(form.stock || 0),
        ...(form.categoryId ? { categoryId: form.categoryId } : {}),
      }),
    onSuccess: () => {
      setForm({ ...EMPTY });
      setShowForm(false);
      refresh();
    },
    onError: (err) => setError(apiError(err)),
  });

  const update = useMutation({
    mutationFn: (id: string) =>
      productsApi.update(id, {
        price: Math.round(Number(edit.price) * 100),
        stock: Number(edit.stock),
        isActive: edit.is_active,
      }),
    onSuccess: () => {
      setEditId(null);
      refresh();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: refresh,
  });

  const upload = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => productsApi.uploadImage(id, file),
    onSuccess: refresh,
  });

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  function startEdit(p: Product) {
    setEditId(p.id);
    setEdit({ price: String(p.price_cents / 100), stock: String(p.stock), is_active: p.is_active });
  }

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Товари</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? 'Згорнути' : '+ Новий товар'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>Новий товар</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError('');
              create.mutate();
            }}
          >
            <div className="form-grid">
              <label>
                Назва
                <input required value={form.title} onChange={set('title')} />
              </label>
              <label>
                Slug
                <input required value={form.slug} onChange={set('slug')} placeholder="rtx-4090" />
              </label>
              <label>
                Ціна, грн
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={form.price}
                  onChange={set('price')}
                />
              </label>
              <label>
                Кількість
                <input type="number" min={0} required value={form.stock} onChange={set('stock')} />
              </label>
              <label>
                Категорія
                <select value={form.categoryId} onChange={set('categoryId')}>
                  <option value="">— без категорії —</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Опис
              <textarea rows={2} value={form.description} onChange={set('description')} />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn btn-primary" disabled={create.isPending}>
              {create.isPending ? 'Створення...' : 'Створити'}
            </button>
          </form>
        </div>
      )}

      <div className="toolbar">
        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery((q) => ({ ...q, page: 1, search: search || undefined }));
          }}
        >
          <input placeholder="Пошук товарів..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
        <select
          value={query.category ?? ''}
          onChange={(e) => setQuery((q) => ({ ...q, page: 1, category: e.target.value || undefined }))}
        >
          <option value="">Усі категорії</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Назва</th>
                <th>Категорія</th>
                <th>Ціна</th>
                <th>Склад</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="thumb">
                      <ProductImage product={p} compact />
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.title}</div>
                    <div className="muted mono">{p.slug}</div>
                  </td>
                  <td className="muted">{p.category_name ?? '—'}</td>
                  {editId === p.id ? (
                    <>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={edit.price}
                          onChange={(e) => setEdit((s) => ({ ...s, price: e.target.value }))}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={edit.stock}
                          onChange={(e) => setEdit((s) => ({ ...s, stock: e.target.value }))}
                        />
                      </td>
                      <td>
                        <label style={{ margin: 0, display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                          <input
                            type="checkbox"
                            style={{ width: 'auto' }}
                            checked={edit.is_active}
                            onChange={(e) => setEdit((s) => ({ ...s, is_active: e.target.checked }))}
                          />
                          активний
                        </label>
                      </td>
                      <td className="row-actions">
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={update.isPending}
                          onClick={() => update.mutate(p.id)}
                        >
                          Зберегти
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>
                          ✕
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{formatPrice(p.price_cents)}</td>
                      <td>{p.stock}</td>
                      <td>
                        {p.is_active ? (
                          <span className="pill pill-delivered">активний</span>
                        ) : (
                          <span className="pill pill-cancelled">прихований</span>
                        )}
                      </td>
                      <td className="row-actions">
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          ref={(el) => (fileRefs.current[p.id] = el)}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) upload.mutate({ id: p.id, file: f });
                          }}
                        />
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => fileRefs.current[p.id]?.click()}
                        >
                          Фото
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => startEdit(p)}>
                          Редагувати
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(p.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data && data.pages > 1 && (
          <div className="pagination">
            <button
              className="btn btn-ghost btn-sm"
              disabled={data.page <= 1}
              onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))}
            >
              ← Назад
            </button>
            <span className="muted">
              {data.page} / {data.pages}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              disabled={data.page >= data.pages}
              onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}
            >
              Далі →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
