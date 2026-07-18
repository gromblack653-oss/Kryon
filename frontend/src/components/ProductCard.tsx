import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Product } from '../types';
import { formatPrice } from '@shopcore/shared';
import { cartApi } from '../api/endpoints';
import { useAuthStore } from '../store/authStore';
import { useCompareStore } from '../store/compareStore';
import { useWishlist } from '../hooks/useWishlist';
import { ProductImage } from './ProductImage';
import { Stars } from './Stars';

export function ProductCard({ product }: { product: Product }) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const inCompare = useCompareStore((s) => s.ids.includes(product.id));
  const toggleCompare = useCompareStore((s) => s.toggle);
  const compareFull = useCompareStore((s) => s.ids.length >= 4);
  const wishlist = useWishlist();

  const addToCart = useMutation({
    mutationFn: () => cartApi.addItem(product.id, 1),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  return (
    <div className="card product-card">
      <div className="card-tools">
        {wishlist.enabled && (
          <button
            className={`card-tool wish ${wishlist.has(product.id) ? 'active' : ''}`}
            title={wishlist.has(product.id) ? 'Прибрати з обраного' : 'Додати в обране'}
            onClick={() => wishlist.toggle(product.id)}
          >
            {wishlist.has(product.id) ? '♥' : '♡'}
          </button>
        )}
        <button
          className={`card-tool ${inCompare ? 'active' : ''}`}
          title={inCompare ? 'Прибрати з порівняння' : 'Додати до порівняння'}
          disabled={!inCompare && compareFull}
          onClick={() => toggleCompare(product.id)}
        >
          ⇄
        </button>
      </div>
      <Link to={`/products/${product.id}`} className="product-thumb">
        <ProductImage product={product} />
      </Link>
      <div className="product-body">
        {product.category_name && <span className="chip">{product.category_name}</span>}
        <Link to={`/products/${product.id}`} className="product-title">
          {product.title}
        </Link>
        {!!product.rating_count && product.rating_count > 0 && (
          <div className="card-rating">
            <Stars value={product.rating_avg ?? 0} />
            <span className="rating-num">{product.rating_avg?.toFixed(1)}</span>
            <span className="rating-cnt">({product.rating_count})</span>
          </div>
        )}
        {product.specs && product.specs.length > 0 && (
          <div className="spec-chips">
            {product.specs.map((s) => (
              <span key={s.key} className="spec-chip" title={s.label}>
                {s.value}
                {s.unit ? ` ${s.unit}` : ''}
              </span>
            ))}
          </div>
        )}
        <div className="product-price">{formatPrice(product.price_cents)}</div>
        <div className="product-actions">
          {product.stock > 0 ? (
            <span className="stock in">В наявності</span>
          ) : (
            <span className="stock out">Немає</span>
          )}
          {user?.role === 'customer' && (
            <button
              className="btn btn-primary btn-sm"
              disabled={product.stock === 0 || addToCart.isPending}
              onClick={() => addToCart.mutate()}
            >
              {addToCart.isPending ? '...' : 'У кошик'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
