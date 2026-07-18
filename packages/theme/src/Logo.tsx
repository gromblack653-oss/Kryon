export type LogoVariant = 'shop' | 'admin' | 'crm';

interface Props {
  variant?: LogoVariant;
  size?: number;
  markOnly?: boolean;
}

const TAG: Record<LogoVariant, string | null> = {
  shop: null,
  admin: 'Admin',
  crm: 'CRM',
};

export function LogoMark({ size = 28 }: { size?: number }) {
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

      {}
      <path d="M16 3 L27.3 9.5 L16 16 L4.7 9.5 Z" fill={`url(#${gid})`} opacity="0.95" />
      {}
      <path d="M4.7 9.5 L16 16 L16 29 L4.7 22.5 Z" fill={`url(#${gid})`} opacity="0.45" />
      {}
      <path d="M27.3 9.5 L27.3 22.5 L16 29 L16 16 Z" fill={`url(#${gid})`} opacity="0.7" />
      {}
      <path
        d="M16 3 L27.3 9.5 L27.3 22.5 L16 29 L4.7 22.5 L4.7 9.5 Z"
        stroke={`url(#${gid})`}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
