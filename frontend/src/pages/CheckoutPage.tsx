import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi, ordersApi, deliveryApi, paymentsApi } from '../api/endpoints';
import { formatPrice } from '@shopcore/shared';
import { apiError } from '../api/client';
import { useDebounce } from '../hooks/useDebounce';
import type { DeliveryMethod, PaymentMethod } from '../types';

const DELIVERY: Array<{ value: DeliveryMethod; title: string; hint: string }> = [
  { value: 'np_warehouse', title: 'Нова Пошта — відділення', hint: 'Отримання у відділенні' },
  { value: 'np_courier', title: 'Нова Пошта — курʼєр', hint: 'Доставка за адресою' },
  { value: 'pickup', title: 'Самовивіз', hint: 'Забрати з нашого складу' },
];

const PAYMENT: Array<{ value: PaymentMethod; title: string; hint: string }> = [
  { value: 'card', title: 'Картка онлайн', hint: 'Оплата через платіжний шлюз' },
  { value: 'cod', title: 'Накладений платіж', hint: 'Оплата при отриманні' },
];

export function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [delivery, setDelivery] = useState<DeliveryMethod>('np_warehouse');
  const [payment, setPayment] = useState<PaymentMethod>('card');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [cityRef, setCityRef] = useState('');
  const [cityName, setCityName] = useState('');
  const [warehouseRef, setWarehouseRef] = useState('');
  const [error, setError] = useState('');

  const { data: cart } = useQuery({ queryKey: ['cart'], queryFn: cartApi.get });

  const debouncedCity = useDebounce(cityQuery, 300);
  const { data: cities } = useQuery({
    queryKey: ['np-cities', debouncedCity],
    queryFn: () => deliveryApi.cities(debouncedCity),
    enabled: delivery !== 'pickup',
  });

  const { data: warehouses } = useQuery({
    queryKey: ['np-warehouses', cityRef],
    queryFn: () => deliveryApi.warehouses(cityRef),
    enabled: Boolean(cityRef) && delivery === 'np_warehouse',
  });

  // Зміна міста скидає обране відділення — інакше лишиться чуже.
  useEffect(() => setWarehouseRef(''), [cityRef]);

  const checkout = useMutation({
    mutationFn: async () => {
      const warehouse = warehouses?.find((w) => w.ref === warehouseRef);
      const shippingAddress =
        delivery === 'np_warehouse'
          ? `${cityName}, ${warehouse?.name} (${warehouse?.address})`
          : delivery === 'np_courier'
            ? `${cityName}, ${address}`
            : 'Самовивіз зі складу';

      const order = await ordersApi.checkout({
        shippingAddress,
        deliveryMethod: delivery,
        paymentMethod: payment,
        recipientName: name || undefined,
        recipientPhone: phone || undefined,
        npCityRef: delivery === 'pickup' ? undefined : cityRef || undefined,
        npWarehouseRef: delivery === 'np_warehouse' ? warehouseRef || undefined : undefined,
      });

      // Картка — ведемо на сторінку платіжного шлюзу; накладений платіж оплати не потребує.
      if (payment === 'card') {
        const session = await paymentsApi.createSession(order.id);
        return { order, redirectUrl: session.redirectUrl };
      }
      return { order, redirectUrl: `/orders/${order.id}` };
    },
    onSuccess: ({ redirectUrl }) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate(redirectUrl);
    },
    onError: (err) => setError(apiError(err)),
  });

  const needsCity = delivery !== 'pickup';
  const ready =
    Boolean(cart?.items.length) &&
    name.length >= 3 &&
    /^\+?\d{10,13}$/.test(phone) &&
    (!needsCity || Boolean(cityRef)) &&
    (delivery !== 'np_warehouse' || Boolean(warehouseRef)) &&
    (delivery !== 'np_courier' || address.length >= 5);

  return (
    <div className="checkout">
      <h1 className="page-title">Оформлення замовлення</h1>
      <div className="checkout-grid">
        <form
          className="card checkout-form"
          onSubmit={(e) => {
            e.preventDefault();
            setError('');
            checkout.mutate();
          }}
        >
          <section>
            <h3>Отримувач</h3>
            <div className="field-row">
              <label>
                Прізвище та ім'я
                <input
                  className="input"
                  required
                  minLength={3}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Шевченко Тарас"
                />
              </label>
              <label>
                Телефон
                <input
                  className="input"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+380671234567"
                />
              </label>
            </div>
          </section>

          <section>
            <h3>Доставка</h3>
            <div className="opt-list">
              {DELIVERY.map((d) => (
                <label key={d.value} className={`opt ${delivery === d.value ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="delivery"
                    checked={delivery === d.value}
                    onChange={() => setDelivery(d.value)}
                  />
                  <span className="opt-title">{d.title}</span>
                  <span className="opt-hint">{d.hint}</span>
                </label>
              ))}
            </div>

            {needsCity && (
              <label>
                Місто
                <input
                  className="input"
                  value={cityQuery}
                  onChange={(e) => {
                    setCityQuery(e.target.value);
                    setCityRef('');
                  }}
                  placeholder="Почніть вводити назву..."
                />
                {/* Підказки показуємо, доки місто не обране. */}
                {!cityRef && cityQuery && cities?.items.length ? (
                  <ul className="suggest">
                    {cities.items.slice(0, 8).map((c) => (
                      <li key={c.ref}>
                        <button
                          type="button"
                          onClick={() => {
                            setCityRef(c.ref);
                            setCityName(c.name);
                            setCityQuery(c.name);
                          }}
                        >
                          {c.name}
                          <span className="muted"> · {c.area} обл.</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </label>
            )}

            {delivery === 'np_warehouse' && cityRef && (
              <label>
                Відділення
                <select
                  className="input"
                  value={warehouseRef}
                  onChange={(e) => setWarehouseRef(e.target.value)}
                  required
                >
                  <option value="">Оберіть відділення</option>
                  {warehouses?.map((w) => (
                    <option key={w.ref} value={w.ref}>
                      {w.name} — {w.address} (до {w.maxWeightKg} кг)
                    </option>
                  ))}
                </select>
              </label>
            )}

            {delivery === 'np_courier' && (
              <label>
                Адреса
                <input
                  className="input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="вул. Соборна, 12, кв. 5"
                />
              </label>
            )}
          </section>

          <section>
            <h3>Оплата</h3>
            <div className="opt-list">
              {PAYMENT.map((p) => (
                <label key={p.value} className={`opt ${payment === p.value ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === p.value}
                    onChange={() => setPayment(p.value)}
                  />
                  <span className="opt-title">{p.title}</span>
                  <span className="opt-hint">{p.hint}</span>
                </label>
              ))}
            </div>
          </section>

          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary btn-lg" disabled={!ready || checkout.isPending}>
            {checkout.isPending
              ? 'Оформлюємо...'
              : payment === 'card'
                ? 'Перейти до оплати'
                : 'Підтвердити замовлення'}
          </button>
        </form>

        <div className="card order-summary">
          <h3>Ваше замовлення</h3>
          {cart?.items.map((i) => (
            <div key={i.id} className="summary-row">
              <span>
                {i.title} × {i.quantity}
              </span>
              <span>{formatPrice(i.line_total_cents)}</span>
            </div>
          ))}
          <div className="summary-total">
            <span>Разом</span>
            <strong>{formatPrice(cart?.total_cents ?? 0)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
