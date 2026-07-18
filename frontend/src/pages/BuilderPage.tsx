import { useMemo, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { builderApi, cartApi } from '../api/endpoints';
import { formatPrice } from '@shopcore/shared';
import { assetUrl } from '@shopcore/shared';
import { useAuthStore } from '../store/authStore';
import type { BuildPart, PartType } from '../types';

/** Знахідний відмінок для кнопки «Обрати …». */
const ACC: Record<PartType, string> = {
  cpu: 'процесор',
  mobo: 'материнську плату',
  ram: "оперативну пам'ять",
  gpu: 'відеокарту',
  psu: 'блок живлення',
  case: 'корпус',
};

/** Характеристики, які показуємо в рядку слота — по одній «головній» на тип. */
const KEY_SPEC: Record<PartType, (a: Record<string, string>) => string> = {
  cpu: (a) => `${a.socket} · ${a.cores} ядер · ${a.tdp} Вт`,
  mobo: (a) => `${a.socket} · ${a.chipset} · ${a.form_factor} · ${a.mem_type}`,
  ram: (a) => `${a.capacity_gb} ГБ · ${a.mem_type}-${a.speed_mhz}`,
  gpu: (a) => `${a.vram_gb} ГБ ${a.memory_type} · ${a.tdp} Вт · ${a.length_mm} мм`,
  psu: (a) => `${a.wattage} Вт · ${a.certificate} · ${a.form_factor}`,
  case: (a) => `${a.form_factor} · до ${a.max_gpu_len} мм`,
};

export function BuilderPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [openSlot, setOpenSlot] = useState<PartType | null>(null);

  // Збірка живе в URL — посиланням можна поділитися й повернутись до неї.
  const [searchParams, setSearchParams] = useSearchParams();
  const picked = useMemo(() => {
    const sel: Partial<Record<PartType, string>> = {};
    for (const t of ['cpu', 'mobo', 'ram', 'gpu', 'psu', 'case'] as PartType[]) {
      const id = searchParams.get(t);
      if (id) sel[t] = id;
    }
    return sel;
  }, [searchParams]);

  const setSlot = useCallback(
    (slot: PartType, id: string | null) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set(slot, id);
          else next.delete(slot);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const { data, isLoading } = useQuery({ queryKey: ['builder-parts'], queryFn: builderApi.parts });

  // Перевірку робить бекенд — той самий движок, що й у тестах.
  const { data: report } = useQuery({
    queryKey: ['builder-check', picked],
    queryFn: () => builderApi.check(picked),
    enabled: Object.keys(picked).length > 0,
  });

  const addAll = useMutation({
    mutationFn: async () => {
      for (const id of Object.values(picked)) {
        if (id) await cartApi.addItem(id, 1);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cart'] });
      navigate('/cart');
    },
  });

  const partById = useMemo(() => {
    const m = new Map<string, BuildPart>();
    for (const list of Object.values(data?.parts ?? {})) for (const p of list) m.set(p.id, p);
    return m;
  }, [data]);

  // Слоти з помилками/попередженнями підсвічуємо.
  const slotLevel = useMemo(() => {
    const m: Partial<Record<PartType, 'error' | 'warning'>> = {};
    for (const issue of report?.issues ?? []) {
      for (const t of issue.parts) {
        if (m[t] !== 'error') m[t] = issue.level;
      }
    }
    return m;
  }, [report]);

  if (isLoading || !data) return <p className="muted">Завантаження комплектуючих...</p>;

  const chosenCount = Object.values(picked).filter(Boolean).length;
  const requiredMissing = data.slots.filter((s) => s.required && !picked[s.type]);
  const canBuy = chosenCount > 0 && !requiredMissing.length && !report?.hasErrors;

  // Заповнення шкали живлення: скільки з потужності БЖ з'їдає збірка.
  const psuPart = picked.psu ? partById.get(picked.psu) : undefined;
  const psuWatts = psuPart ? Number(psuPart.attrs.wattage) : 0;
  const watts = report?.estimatedWatts ?? 0;
  const loadPct = psuWatts ? Math.min(100, Math.round((watts / psuWatts) * 100)) : 0;

  return (
    <div className="builder">
      <div className="builder-head">
        <h1>Збірка ПК</h1>
        <p className="muted">
          Оберіть комплектуючі — ми перевіримо сумісність за сокетом, типом пам'яті, габаритами корпуса та
          потужністю блока живлення.
        </p>
      </div>

      <div className="builder-grid">
        <div className="slots">
          {data.slots.map((slot) => {
            const part = picked[slot.type] ? partById.get(picked[slot.type]!) : undefined;
            const level = slotLevel[slot.type];
            return (
              <div key={slot.type} className={`slot ${level ? `slot-${level}` : ''} ${part ? 'filled' : ''}`}>
                <div className="slot-label">
                  {slot.label}
                  {slot.required && <span className="req">обов'язково</span>}
                </div>

                {part ? (
                  <div className="slot-part">
                    <img className="slot-img" src={assetUrl(part.image_url) ?? undefined} alt="" />
                    <div className="slot-info">
                      <div className="slot-title">{part.title}</div>
                      <div className="slot-spec">{KEY_SPEC[slot.type](part.attrs)}</div>
                    </div>
                    <div className="slot-price">{formatPrice(part.price_cents)}</div>
                    <div className="slot-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => setOpenSlot(slot.type)}>
                        Змінити
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSlot(slot.type, null)}>
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <button className="slot-empty" onClick={() => setOpenSlot(slot.type)}>
                    + Обрати {ACC[slot.type]}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <aside className="build-summary">
          <h3>Підсумок</h3>

          <div className="power">
            <div className="power-row">
              <span className="muted">Споживання</span>
              <strong>{watts} Вт</strong>
            </div>
            <div className="power-row">
              <span className="muted">Рекомендований БЖ</span>
              <strong>{report?.recommendedPsuWatts ?? 0} Вт</strong>
            </div>
            {psuWatts > 0 && (
              <>
                <div className="power-bar">
                  <div
                    className={`power-fill ${loadPct > 90 ? 'over' : loadPct > 75 ? 'warn' : ''}`}
                    style={{ width: `${loadPct}%` }}
                  />
                </div>
                <div className="power-hint muted">
                  Навантаження на блок {psuWatts} Вт — {loadPct}%
                </div>
              </>
            )}
          </div>

          {report && report.issues.length > 0 && (
            <ul className="issues">
              {report.issues.map((i, idx) => (
                <li key={idx} className={`issue ${i.level}`}>
                  <span className="issue-icon">{i.level === 'error' ? '✕' : '!'}</span>
                  {i.message}
                </li>
              ))}
            </ul>
          )}

          {report && !report.issues.length && chosenCount > 1 && (
            <p className="issue ok">
              <span className="issue-icon">✓</span> Комплектуючі сумісні між собою.
            </p>
          )}

          <div className="build-total">
            <span>Разом</span>
            <strong>{formatPrice(report?.totalCents ?? 0)}</strong>
          </div>

          {requiredMissing.length > 0 && (
            <p className="muted small">
              Ще потрібно: {requiredMissing.map((s) => s.label.toLowerCase()).join(', ')}.
            </p>
          )}

          {user?.role === 'customer' ? (
            <button
              className="btn btn-primary btn-lg full"
              disabled={!canBuy || addAll.isPending}
              onClick={() => addAll.mutate()}
            >
              {addAll.isPending ? 'Додаємо...' : 'Додати збірку в кошик'}
            </button>
          ) : (
            <p className="muted small">Увійдіть як покупець, щоб додати збірку в кошик.</p>
          )}
        </aside>
      </div>

      {openSlot && (
        <PartPicker
          slot={openSlot}
          label={data.slots.find((s) => s.type === openSlot)!.label}
          parts={data.parts[openSlot] ?? []}
          onPick={(id) => {
            setSlot(openSlot, id);
            setOpenSlot(null);
          }}
          onClose={() => setOpenSlot(null)}
        />
      )}
    </div>
  );
}

interface PickerProps {
  slot: PartType;
  label: string;
  parts: BuildPart[];
  onPick: (id: string) => void;
  onClose: () => void;
}

/** Модалка вибору комплектуючої з пошуком. */
function PartPicker({ slot, label, parts, onPick, onClose }: PickerProps) {
  const [q, setQ] = useState('');
  const filtered = parts.filter((p) => p.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{label}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        <input
          className="input"
          autoFocus
          placeholder="Пошук..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="picker-list">
          {filtered.map((p) => (
            <button key={p.id} className="picker-row" onClick={() => onPick(p.id)}>
              <img className="slot-img" src={assetUrl(p.image_url) ?? undefined} alt="" />
              <div className="slot-info">
                <div className="slot-title">{p.title}</div>
                <div className="slot-spec">{KEY_SPEC[slot](p.attrs)}</div>
              </div>
              <div className="slot-price">{formatPrice(p.price_cents)}</div>
            </button>
          ))}
          {!filtered.length && <p className="muted">Нічого не знайдено.</p>}
        </div>
      </div>
    </div>
  );
}
