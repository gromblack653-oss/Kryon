import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api/endpoints';
import { formatPrice } from '../lib/format';
import { ProductImage } from '../components/ProductImage';

export function CartPage() {
  const queryClient = useQueryClient();
  const { data: cart, isLoading } = useQuery({ queryKey: ['cart'], queryFn: cartApi.get });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cart'] });

  const setQty = useMutation({
    mutationFn: ({ id, qty }: { id: string; qty: number }) => cartApi.setQty(id, qty),
    onSuccess: invalidate,
  });
  const removeItem = useMutation({
    mutationFn: (id: string) => cartApi.removeItem(id),
    onSuccess: invalidate,
  });

  if (isLoading) return <p className="muted">Завантаження...</p>;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="empty-state">
        <h1 className="page-title">Кошик</h1>
        <p className="muted">Ваш кошик порожній.</p>
        <Link to="/" className="btn btn-primary">
          До каталогу
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">Кошик</h1>
      <div className="cart-list">
        {cart.items.map((item) => (
          <div key={item.id} className="cart-row card">
            <div className="cart-thumb">
              <ProductImage product={item} compact />
            </div>
            <div className="cart-info">
              <Link to={`/products/${item.product_id}`} className="cart-title">
                {item.title}
              </Link>
              <span className="muted">{formatPrice(item.price_cents)} / шт.</span>
            </div>
            <div className="qty">
              <button
                disabled={item.quantity <= 1}
                onClick={() => setQty.mutate({ id: item.product_id, qty: item.quantity - 1 })}
              >
                −
              </button>
              <span>{item.quantity}</span>
              <button
                disabled={item.quantity >= item.stock}
                onClick={() => setQty.mutate({ id: item.product_id, qty: item.quantity + 1 })}
              >
                +
              </button>
            </div>
            <div className="cart-line-total">{formatPrice(item.line_total_cents)}</div>
            <button className="btn btn-ghost" onClick={() => removeItem.mutate(item.product_id)}>
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="cart-summary card">
        <span>Разом:</span>
        <strong>{formatPrice(cart.total_cents)}</strong>
        <Link to="/checkout" className="btn btn-primary btn-lg">
          Оформити замовлення
        </Link>
      </div>
    </div>
  );
}
