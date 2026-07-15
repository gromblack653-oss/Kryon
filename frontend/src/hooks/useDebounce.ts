import { useEffect, useState } from 'react';

/** Повертає значення із затримкою — для живого пошуку без зайвих запитів. */
export function useDebounce<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
