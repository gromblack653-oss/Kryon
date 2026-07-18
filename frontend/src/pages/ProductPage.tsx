import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, cartApi } from '../api/endpoints';
import { formatPrice } from '@shopcore/shared';
import { useAuthStore } from '../store/authStore';
import { useWishlist } from '../hooks/useWishlist';
import { ProductImage } from '../components/ProductImage';
import { assetUrl } from '@shopcore/shared';
import { Stars } from '../components/Stars';
import { Reviews } from '../components/Reviews';

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const wishlist = useWishlist();
  const [activeImage, setActiveImage] = useState(0);

  const {
    data: product,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.get(id!),
    enabled: !!id,
  });

  const addToCart = useMutation({
    mutationFn: () => cartApi.addItem(id!, 1),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      navigate('/cart');
    },
  });

  if (isLoading) return <p className="muted">Завантаження...</p>;
  if (isError || !product) return <p className="error">Товар не знайдено.</p>;

  const images = product.images ?? [];
  const mainUrl = images[activeImage]?.url;

  return (
    <div className="product-detail">
      <Link to="/" className="back-link">
        ← До каталогу
      </Link>
      <div className="detail-grid">
        <div className="gallery">
          <div className="detail-image">
            {mainUrl ? (
              <img src={assetUrl(mainUrl)} alt={product.title} />
            ) : (
              <ProductImage product={product} />
            )}
          </div>
          {images.length > 1 && (
            <div className="thumbs">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  className={`thumb ${i === activeImage ? 'active' : ''}`}
                  onClick={() => setActiveImage(i)}
                  aria-label={`Фото ${i + 1}`}
                >
                  <img src={assetUrl(img.url)} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="detail-info">
          {product.category_name && <span className="chip">{product.category_name}</span>}
          <h1>{product.title}</h1>
          {!!product.rating_count && product.rating_count > 0 && (
            <a href="#reviews" className="detail-rating">
              <Stars value={product.rating_avg ?? 0} size="md" />
              <span className="rating-num">{product.rating_avg?.toFixed(1)}</span>
              <span className="muted">· {product.rating_count} відгуків</span>
            </a>
          )}
          <div className="detail-price">{formatPrice(product.price_cents)}</div>
          <p className="detail-desc">{product.description || 'Опис відсутній.'}</p>

          {product.attributes && product.attributes.length > 0 && (
            <div className="specs">
              <h3>Характеристики</h3>
              {product.attributes.map((a) => (
                <div className="spec-row" key={a.key}>
                  <span className="k">{a.label}</span>
                  <span className="v">
                    {a.value}
                    {a.unit ? ` ${a.unit}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className={product.stock > 0 ? 'stock in' : 'stock out'}>
            {product.stock > 0 ? `В наявності: ${product.stock} шт.` : 'Немає в наявності'}
          </p>

          {user?.role === 'customer' ? (
            <div className="buy-row">
              <button
                className="btn btn-primary btn-lg"
                disabled={product.stock === 0 || addToCart.isPending}
                onClick={() => addToCart.mutate()}
              >
                Додати в кошик
              </button>
              <button
                className={`btn btn-ghost btn-lg wish-btn ${wishlist.has(product.id) ? 'active' : ''}`}
                disabled={wishlist.isPending}
                onClick={() => wishlist.toggle(product.id)}
              >
                {wishlist.has(product.id) ? '♥ В обраному' : '♡ В обране'}
              </button>
            </div>
          ) : !user ? (
            <Link to="/login" className="btn btn-primary btn-lg">
              Увійдіть, щоб купити
            </Link>
          ) : null}
        </div>
      </div>

      <div id="reviews">
        <Reviews productId={product.id} />
      </div>
    </div>
  );
}
