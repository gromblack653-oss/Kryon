import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { productsApi, categoriesApi, ProductFilters, encodeAttrs } from '../api/endpoints';
import { ProductCard } from '../components/ProductCard';
import { useDebounce } from '../hooks/useDebounce';

const SORTS: Array<{ value: NonNullable<ProductFilters['sort']>; label: string }> = [
  { value: 'newest', label: 'Спочатку нові' },
  { value: 'rating', label: 'За рейтингом' },
  { value: 'price_asc', label: 'Дешевші спочатку' },
  { value: 'price_desc', label: 'Дорожчі спочатку' },
  { value: 'title', label: 'За назвою' },
];

export function CatalogPage() {
  // Тип компонента живе в URL — посиланням «/?type=psu» можна поділитися.
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get('type') ?? undefined;

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [inStock, setInStock] = useState(false);
  const [attrs, setAttrs] = useState<Record<string, string[]>>({});
  const [sort, setSort] = useState<NonNullable<ProductFilters['sort']>>('newest');
  const [page, setPage] = useState(1);

  const debSearch = useDebounce(search, 400);
  const debMin = useDebounce(minPrice, 500);
  const debMax = useDebounce(maxPrice, 500);

  useEffect(() => setPage(1), [debSearch, type, category, debMin, debMax, inStock, attrs, sort]);

  const { data: types } = useQuery({ queryKey: ['product-types'], queryFn: productsApi.types });
  const { data: categories } = useQuery({
    queryKey: ['categories', type],
    queryFn: () => categoriesApi.list(type),
  });

  // Базовий контекст для facets (без обраних характеристик — щоб опції не зникали).
  const baseFilters = {
    search: debSearch.trim() || undefined,
    type,
    category,
    minPrice: debMin ? Number(debMin) : undefined,
    maxPrice: debMax ? Number(debMax) : undefined,
    inStock: inStock || undefined,
  };
  const { data: facets } = useQuery({
    queryKey: ['facets', baseFilters],
    queryFn: () => productsApi.facets(baseFilters),
    placeholderData: keepPreviousData,
  });

  const filters: ProductFilters = { page, limit: 12, ...baseFilters, attrs: encodeAttrs(attrs), sort };

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsApi.list(filters),
    placeholderData: keepPreviousData,
  });

  const activeType = types?.find((t) => t.key === type);
  const catName = (slug?: string) => categories?.find((c) => c.slug === slug)?.name ?? slug;

  const attrPairs = Object.entries(attrs).filter(([, v]) => v.length > 0);
  const hasFilters = !!(debSearch || category || debMin || debMax || inStock || attrPairs.length);

  function toggleAttr(key: string, value: string) {
    setAttrs((prev) => {
      const cur = prev[key] ?? [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      const copy = { ...prev };
      if (next.length) copy[key] = next;
      else delete copy[key];
      return copy;
    });
  }

  /** Зміна типу скидає фільтри, специфічні для попереднього типу. */
  function changeType(next?: string) {
    setSearchParams(next ? { type: next } : {}, { replace: true });
    setCategory(undefined);
    setAttrs({});
  }

  function resetAll() {
    setSearch('');
    setCategory(undefined);
    setMinPrice('');
    setMaxPrice('');
    setInStock(false);
    setAttrs({});
    setSort('newest');
  }

  const facetLabel = (key: string) => facets?.find((f) => f.key === key)?.label ?? key;
  const facetUnit = (key: string) => facets?.find((f) => f.key === key)?.unit;

  return (
    <div>
      <h1 className="page-title">{activeType ? activeType.name : 'Каталог комплектуючих'}</h1>

      {/* Вкладки типів компонентів */}
      <div className="type-tabs">
        <button className={`type-tab ${!type ? 'active' : ''}`} onClick={() => changeType(undefined)}>
          <span className="tt-icon">🧱</span> Усі
          <span className="tt-count">{types?.reduce((s, t) => s + t.count, 0) ?? ''}</span>
        </button>
        {types?.map((t) => (
          <button key={t.key} className={`type-tab ${type === t.key ? 'active' : ''}`} onClick={() => changeType(t.key)}>
            <span className="tt-icon">{t.icon}</span> {t.name}
            <span className="tt-count">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="catalog-topbar">
        <div className="search-box">
          <span className="search-ico">🔍</span>
          <input
            placeholder="Пошук: RTX 4070, Ryzen, 850 Вт, Corsair..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && <button className="search-clear" onClick={() => setSearch('')} aria-label="Очистити">✕</button>}
        </div>
        <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="catalog-layout">
        <aside className="filters">
          {categories && categories.length > 0 && (
            <div className="filter-group">
              <h4>Серія</h4>
              <select value={category ?? ''} onChange={(e) => setCategory(e.target.value || undefined)}>
                <option value="">Усі серії</option>
                {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div className="filter-group">
            <h4>Ціна, грн</h4>
            <div className="price-row">
              <input type="number" min={0} placeholder="від" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
              <span>—</span>
              <input type="number" min={0} placeholder="до" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </div>
          </div>

          {/* Динамічні фільтри характеристик — залежать від обраного типу */}
          {facets?.map((f) => (
            <div className="filter-group" key={f.key}>
              <h4>{f.label}{f.unit ? `, ${f.unit}` : ''}</h4>
              <div className="facet-list">
                {f.options.map((o) => (
                  <label key={o.value} className="facet-row">
                    <input
                      type="checkbox"
                      checked={(attrs[f.key] ?? []).includes(o.value)}
                      onChange={() => toggleAttr(f.key, o.value)}
                    />
                    <span>{o.value}</span>
                    <span className="facet-count">{o.count}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="filter-group">
            <label className="check-row">
              <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
              Лише в наявності
            </label>
          </div>

          {hasFilters && <button className="btn btn-ghost btn-sm reset-btn" onClick={resetAll}>Скинути фільтри</button>}
        </aside>

        <div className="catalog-results">
          <div className="results-head">
            <span className="muted">
              {data ? `Знайдено: ${data.total}` : ' '}
              {isFetching && data && ' · оновлення...'}
            </span>
            <div className="active-chips">
              {debSearch && <span className="achip" onClick={() => setSearch('')}>«{debSearch}» ✕</span>}
              {category && <span className="achip" onClick={() => setCategory(undefined)}>{catName(category)} ✕</span>}
              {(debMin || debMax) && (
                <span className="achip" onClick={() => { setMinPrice(''); setMaxPrice(''); }}>
                  {debMin || '0'}–{debMax || '∞'} грн ✕
                </span>
              )}
              {inStock && <span className="achip" onClick={() => setInStock(false)}>В наявності ✕</span>}
              {attrPairs.flatMap(([key, values]) =>
                values.map((v) => (
                  <span key={`${key}-${v}`} className="achip" onClick={() => toggleAttr(key, v)}>
                    {facetLabel(key)}: {v}{facetUnit(key) ? ` ${facetUnit(key)}` : ''} ✕
                  </span>
                )),
              )}
            </div>
          </div>

          {isLoading && <p className="muted">Завантаження...</p>}
          {isError && <p className="error">Не вдалося завантажити товари.</p>}
          {data && data.items.length === 0 && (
            <div className="empty-state">
              <p className="muted">За вашим запитом нічого не знайдено.</p>
              {hasFilters && <button className="btn btn-primary" onClick={resetAll}>Скинути фільтри</button>}
            </div>
          )}

          <div className="grid">
            {data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>

          {data && data.pages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>← Назад</button>
              <span>Сторінка {data.page} з {data.pages}</span>
              <button className="btn btn-ghost" disabled={data.page >= data.pages} onClick={() => setPage((p) => p + 1)}>Далі →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
