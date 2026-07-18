import { useState } from 'react';
import { useSettingsStore, DialProtocol } from '../store/settingsStore';
import { buildCallUri, initiateCall } from '../lib/sip';

const PROTOCOLS: Array<{ value: DialProtocol; label: string; hint: string }> = [
  { value: 'sip', label: 'sip:', hint: 'MicroSIP та більшість SIP-софтфонів' },
  { value: 'tel', label: 'tel:', hint: 'Системний обробник телефонії / мобільний' },
  { value: 'callto', label: 'callto:', hint: 'Skype та сумісні застосунки' },
];

export function SettingsPage() {
  const { protocol, setProtocol } = useSettingsStore();
  const [test, setTest] = useState('+380671234567');

  return (
    <div>
      <div className="page-head">
        <div>
          <h1 className="page-title">Налаштування</h1>
          <p className="page-sub">Інтеграція телефонії (click-to-call)</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-title">☎ Протокол дзвінка</div>
          <p className="muted" style={{ marginBottom: '1rem' }}>
            Який застосунок відкривати при натисканні «Подзвонити». MicroSIP реєструє протокол{' '}
            <code>sip:</code>.
          </p>
          <div className="stack" style={{ gap: '0.6rem' }}>
            {PROTOCOLS.map((p) => (
              <label
                key={p.value}
                className="contact-row"
                style={{
                  cursor: 'pointer',
                  outline: protocol === p.value ? '2px solid var(--primary)' : 'none',
                }}
              >
                <input
                  type="radio"
                  name="protocol"
                  style={{ width: 'auto' }}
                  checked={protocol === p.value}
                  onChange={() => setProtocol(p.value)}
                />
                <div>
                  <strong className="mono">{p.label}</strong>
                  <div className="muted" style={{ fontSize: '0.8rem' }}>
                    {p.hint}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">🧪 Тестовий дзвінок</div>
          <label>
            Номер
            <input value={test} onChange={(e) => setTest(e.target.value)} />
          </label>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            Буде відкрито: <code className="mono">{buildCallUri(test, protocol)}</code>
          </p>
          <button className="btn btn-call" onClick={() => initiateCall(test, protocol)}>
            <span className="call-icon">📞</span> Перевірити виклик
          </button>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--bg)', borderRadius: 12 }}>
            <strong>Як під'єднати MicroSIP</strong>
            <ol
              className="muted"
              style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', fontSize: '0.85rem', lineHeight: 1.7 }}
            >
              <li>Встановіть та налаштуйте акаунт у MicroSIP.</li>
              <li>
                У MicroSIP → Settings увімкніть реєстрацію протоколу <code>sip:</code>.
              </li>
              <li>
                Тут залишіть протокол <code>sip:</code> — і кнопки «Подзвонити» відкриватимуть MicroSIP із
                набраним номером.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
