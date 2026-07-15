interface Props {
  value: number; // 0..5
  size?: 'sm' | 'md' | 'lg';
  /** Робить зірки клікабельними (режим вибору оцінки). */
  onChange?: (rating: number) => void;
}

/** Показ рейтингу зірками. З onChange — інтерактивний вибір оцінки. */
export function Stars({ value, size = 'sm', onChange }: Props) {
  const rounded = Math.round(value);
  const interactive = !!onChange;

  return (
    <span className={`stars ${size} ${interactive ? 'interactive' : ''}`}>
      {[1, 2, 3, 4, 5].map((i) =>
        interactive ? (
          <button
            key={i}
            type="button"
            className={`star ${i <= rounded ? 'on' : ''}`}
            onClick={() => onChange(i)}
            aria-label={`Оцінка ${i}`}
          >
            ★
          </button>
        ) : (
          <span key={i} className={`star ${i <= rounded ? 'on' : ''}`}>
            ★
          </span>
        ),
      )}
    </span>
  );
}
