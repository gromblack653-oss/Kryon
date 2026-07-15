import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '../api/endpoints';
import { formatPrice } from '../lib/format';
import { apiError } from '../api/client';

/**
 * Емулятор платіжної форми шлюзу.
 * У продакшені сюди редіректить справжній PSP; результат у будь-якому разі
 * приїжджає на бекенд підписаним вебхуком, а не з цієї сторінки.
 */
export function PaymentPage() {
  const { externalId = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState('');

  const { data: payment, isLoading } = useQuery({
    queryKey: ['payment', externalId],
    queryFn: () => paymentsApi.get(externalId),
  });

  const complete = useMutation({
    mutationFn: (outcome: 'paid' | 'failed') => paymentsApi.complete(externalId, outcome),
    onSuccess: async () => {
      // Стан замовлення міг змінитись вебхуком — перечитуємо.
      await qc.invalidateQueries({ queryKey: ['orders'] });
      const fresh = await paymentsApi.get(externalId);
      if (fresh.status === 'paid') navigate(`/orders/${fresh.orderId}`);
      else {
        setError('Оплату відхилено. Спробуйте інший спосіб оплати.');
        qc.invalidateQueries({ queryKey: ['payment', externalId] });
      }
    },
    onError: (err) => setError(apiError(err)),
  });

  if (isLoading) return <p className="muted">Завантаження...</p>;
  if (!payment) return <p className="error">Платіж не знайдено.</p>;

  if (payment.status === 'paid') {
    return (
      <div className="pay-page">
        <div className="pay-card">
          <div className="pay-badge ok">✓</div>
          <h2>Оплачено</h2>
          <p className="muted">Замовлення на {formatPrice(payment.amountCents)} успішно оплачене.</p>
          <Link className="btn btn-primary btn-lg full" to={`/orders/${payment.orderId}`}>
            До замовлення
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pay-page">
      <div className="pay-card">
        <div className="pay-brand">
          <span className="pay-logo">SecurePay</span>
          <span className="muted small">демо-шлюз</span>
        </div>

        <div className="pay-amount">
          <span className="muted">До сплати</span>
          <strong>{formatPrice(payment.amountCents)}</strong>
        </div>

        {/* Поля картки — вітрина: реальні дані шлюзу не покидають його форму. */}
        <label>
          Номер картки
          <input className="input" defaultValue="4242 4242 4242 4242" readOnly />
        </label>
        <div className="field-row">
          <label>
            Термін дії
            <input className="input" defaultValue="12/28" readOnly />
          </label>
          <label>
            CVV
            <input className="input" defaultValue="•••" readOnly />
          </label>
        </div>

        {error && <p className="error">{error}</p>}

        <button
          className="btn btn-primary btn-lg full"
          disabled={complete.isPending}
          onClick={() => complete.mutate('paid')}
        >
          {complete.isPending ? 'Обробка...' : `Сплатити ${formatPrice(payment.amountCents)}`}
        </button>
        <button
          className="btn btn-ghost full"
          disabled={complete.isPending}
          onClick={() => complete.mutate('failed')}
        >
          Скасувати оплату
        </button>

        <p className="muted small pay-note">
          Результат повертається на сервер підписаним вебхуком (HMAC-SHA256) — так само, як у
          справжнього платіжного провайдера.
        </p>
      </div>
    </div>
  );
}
