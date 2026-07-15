import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: Number(process.env.PORT ?? 4000),
  // Кілька дозволених origin через кому (клієнт + адмінка).
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173,http://localhost:5174,http://localhost:5175')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  databaseUrl: required('DATABASE_URL', 'postgres://shopcore:shopcore@localhost:5432/shopcore'),
  redisUrl: required('REDIS_URL', 'redis://localhost:6379'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessTtl: Number(process.env.JWT_ACCESS_TTL ?? 900),
    refreshTtl: Number(process.env.JWT_REFRESH_TTL ?? 1209600),
  },

  upload: {
    dir: process.env.UPLOAD_DIR ?? 'uploads',
    maxMb: Number(process.env.MAX_UPLOAD_MB ?? 5),
  },

  // Нова Пошта: без ключа працюємо на локальному довіднику (див. np.client.ts).
  novaPoshta: {
    apiKey: process.env.NP_API_KEY ?? '',
    senderCityRef: process.env.NP_SENDER_CITY_REF ?? '',
  },

  // Телефонія. mock — вбудований емулятор АТС; для реальної (Asterisk, Binotel,
  // Zadarma) міняється лише провайдер — вебхук той самий.
  telephony: {
    provider: process.env.TELEPHONY_PROVIDER ?? 'mock',
    webhookSecret: required('TELEPHONY_WEBHOOK_SECRET', 'dev-telephony-secret'),
    // Через скільки секунд емулятор «піднімає слухавку» (лише для mock).
    mockAnswerAfterMs: Number(process.env.TELEPHONY_MOCK_ANSWER_MS ?? 2500),
  },

  // Платіжний шлюз. У демо — вбудований мок, що підписує вебхуки тим самим
  // секретом (справжній PSP підставляється заміною провайдера).
  payments: {
    provider: process.env.PAYMENT_PROVIDER ?? 'mock',
    webhookSecret: required('PAYMENT_WEBHOOK_SECRET', 'dev-webhook-secret'),
    // Куди шлюз повертає покупця після оплати.
    returnUrl: process.env.PAYMENT_RETURN_URL ?? 'http://localhost:5173/orders',
  },
} as const;
