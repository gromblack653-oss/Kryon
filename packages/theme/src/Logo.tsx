/**
 * Логотип Kryon.
 *
 * Знак — ізометричний куб, вписаний у гексагон: читається одночасно як
 * коробка (комерція) і як чип/ядро (техніка). Три грані дають об'єм, неоновий
 * градієнт ціан→фіолет тримає єдність із рештою інтерфейсу.
 *
 * Один знак на всі три застосунки — відрізняє їх лише теґ (Admin / CRM).
 */

export type LogoVariant = 'shop' | 'admin' | 'crm';

interface Props {
  variant?: LogoVariant;
  /** Розмір знака в пікселях (текст масштабується від нього). */
  size?: number;
  /** Лише знак, без назви — для згорнутих панелей і favicon. */
  markOnly?: boolean;
}

const TAG: Record<LogoVariant, string | null> = {
  shop: null,
  admin: 'Admin',
  crm: 'CRM',
};

/** Знак: гексагон + три грані куба. Координати в системі 32×32. */
export function LogoMark({ size = 28 }: { size?: number }) {
  // Унікальний id градієнта — щоб кілька логотипів на сторінці не конфліктували.
  const gid = 'sc-grad';
  return (
    <svg
      className="sc-logo-mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Kryon"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>

      {/* Верхня грань — найсвітліша */}
      <path d="M16 3 L27.3 9.5 L16 16 L4.7 9.5 Z" fill={`url(#${gid})`} opacity="0.95" />
      {/* Ліва грань — у тіні */}
      <path d="M4.7 9.5 L16 16 L16 29 L4.7 22.5 Z" fill={`url(#${gid})`} opacity="0.45" />
      {/* Права грань — середній тон */}
      <path d="M27.3 9.5 L27.3 22.5 L16 29 L16 16 Z" fill={`url(#${gid})`} opacity="0.7" />
      {/* Контур гексагона — «неонове» ребро */}
      <path
        d="M16 3 L27.3 9.5 L27.3 22.5 L16 29 L4.7 22.5 L4.7 9.5 Z"
        stroke={`url(#${gid})`}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Повний логотип: знак + назва (+ теґ застосунку). */
export function Logo({ variant = 'shop', size = 28, markOnly }: Props) {
  const tag = TAG[variant];
  if (markOnly) return <LogoMark size={size} />;

  return (
    <span className="sc-logo" style={{ fontSize: size * 0.62 }}>
      <LogoMark size={size} />
      <span className="sc-logo-text">
        Kry<span className="sc-logo-accent">on</span>
      </span>
      {tag && <span className="sc-logo-tag">{tag}</span>}
    </span>
  );
}
