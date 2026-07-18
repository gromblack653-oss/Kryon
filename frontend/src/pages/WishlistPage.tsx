import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/endpoints';
import { useWishlist } from '../hooks/useWishlist';
import { ProductImage } from '../components/ProductImage';
import { formatPrice } from '@shopcore/shared';

export function WishlistPage() {
  const wishlist = useWishlist();
  const queryClient = useQueryClient();

  const addToCart = useMutation({
    mutationFn: (productId: string) => cartApi.addItem(productId, 1),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  if (wishlist.items.length === 0) {
    return (
      <div className="empty-state">
        <h1 className="page-title">Обране</h1>
        <p className="muted">Тут порожньо. Натисніть ♡ на картці товару, щоб зберегти його.</p>
        <Link to="/" className="btn btn-primary">
          До каталогу
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Обране · {wishlist.items.length}</h1>

      <div className="cart-list">
        {wishlist.items.map((item) => (
          <div key={item.id} className="cart-row card">
            <div className="cart-thumb">
              <ProductImage product={item} compact />
            </div>
            <div className="cart-info">
              <Link to={`/products/${item.id}`} className="cart-title">
                {item.title}
              </Link>
              <span className="muted" style={{ fontSize: '0.82rem' }}>
                {item.category_name}
              </span>
            </div>
            <div className="cart-line-total">{formatPrice(item.price_cents)}</div>
            <button
              className="btn btn-primary btn-sm"
              disabled={item.stock === 0 || addToCart.isPending}
              onClick={() => addToCart.mutate(item.id)}
            >
              {item.stock > 0 ? 'У кошик' : 'Немає'}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              title="Прибрати"
              onClick={() => wishlist.toggle(item.id)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
