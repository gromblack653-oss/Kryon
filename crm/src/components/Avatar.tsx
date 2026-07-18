import { avatarColor, initials } from '@shopcore/shared';

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span
      className="avatar"
      style={{
        width: size,
        height: size,
        background: avatarColor(name),
        fontSize: size * 0.4,
      }}
    >
      {initials(name)}
    </span>
  );
}
