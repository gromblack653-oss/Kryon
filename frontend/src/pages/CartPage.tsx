import { Link } from 'react-router-dom';
import { formatPrice } from '@shopcore/shared';
import { useCartStore, cartSubtotal } from '../store/cartStore';
import { ProductImage } from '../components/ProductImage';

export function CartPage() {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);

  if (items.length === 0) {
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

  const total = cartSubtotal(items);

  return (
    <div>
      <h1 className="page-title">Кошик</h1>
      <div className="cart-list">
        {items.map(({ product, quantity }) => (
          <div key={product.id} className="cart-row card">
            <div className="cart-thumb">
              <ProductImage product={product} compact />
            </div>
            <div className="cart-info">
              <Link to={`/products/${product.id}`} className="cart-title">
                {product.title}
              </Link>
              <span className="muted">{formatPrice(product.price_cents)} / шт.</span>
            </div>
            <div className="qty">
              <button disabled={quantity <= 1} onClick={() => setQty(product.id, quantity - 1)}>
                −
              </button>
              <span>{quantity}</span>
              <button
                disabled={quantity >= product.stock}
                onClick={() => setQty(product.id, quantity + 1)}
              >
                +
              </button>
            </div>
            <div className="cart-line-total">{formatPrice(product.price_cents * quantity)}</div>
            <button className="btn btn-ghost" onClick={() => remove(product.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="cart-summary card">
        <span>Разом:</span>
        <strong>{formatPrice(total)}</strong>
        <Link to="/checkout" className="btn btn-primary btn-lg">
          Оформити замовлення
        </Link>
      </div>
    </div>
  );
}
