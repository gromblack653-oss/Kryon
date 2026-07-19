# Kryon — Fullstack E-commerce Platform

> Магазин комплектуючих для ПК: вітрина, адмін-панель і CRM для операторів на спільній базі.
> Демонструє повний цикл **middle fullstack**-розробки: REST API, реляційна БД, автентифікація,
> real-time, кешування, платежі, доставка, контейнеризація, тести й CI.

[![CI](https://github.com/gromblack653-oss/Kryon/actions/workflows/ci.yml/badge.svg)](https://github.com/gromblack653-oss/Kryon/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/Node-22-339933?logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?logo=postgresql&logoColor=white)
![Tests](https://img.shields.io/badge/tests-35%20passing-34d399)

---

## ✨ Можливості

**Магазин (5173)** — каталог із фасетними фільтрами за характеристиками (EAV-модель),
пошук, порівняння товарів, галерея, обране, відгуки з «підтвердженою покупкою»,
кошик, **збірка ПК з перевіркою сумісності**, оформлення з **Новою Поштою** та **онлайн-оплатою**.

**Адмінка (5174)** — дашборд (дохід за 7 днів, залишки, замовлення за статусами, топ продажів),
CRUD товарів із фото, керування замовленнями (real-time статуси, ТТН), CSV-експорт.

**CRM (5175)** — спільна з магазином база: клієнти, історія замовлень, черга на обдзвін,
**телефонія** (click-to-call MicroSIP + життєвий цикл дзвінка через події АТС), таймлайн,
PDF-накладні.

### Ключові механізми

- **Платіжний шлюз** — сесія оплати → підписаний вебхук (**HMAC-SHA256**), ідемпотентна обробка,
  звірка суми. Накладений платіж = оплата при отриманні (окрема логіка стейт-машини).
- **Нова Пошта** — реальний API за ключем, інакше локальний довідник міст/відділень; кеш у Redis.
- **Телефонія** — дзвінок живе на сервері; результат і тривалість проставляють події АТС
  (підписаний вебхук), оператор вводить лише нотатку.
- **PC Builder** — движок сумісності (сокет, тип пам'яті, габарити, потужність БЖ) як чиста
  функція з повним тестовим покриттям.
- **Real-time** — Socket.IO: статуси замовлень і дзвінків оновлюються без перезавантаження.

---

## 🧱 Стек

| Шар | Технології |
|-----|-----------|
| **Backend** | Node.js · Express · TypeScript · PostgreSQL (`node-pg-migrate`) · Redis · JWT (access/refresh) · Zod · Socket.IO · Multer · pdfkit · Swagger · Jest + Supertest |
| **Frontend** ×3 | React 18 · TypeScript · Vite · React Router · Zustand (persist) · TanStack Query · Axios (auto-refresh) |
| **Дизайн** | Спільна дизайн-система (neo-dark gaming-tech), єдині токени й логотип |
| **DevOps** | Docker + Compose · pnpm workspace · GitHub Actions CI · ESLint 9 + Prettier |

---

## 📂 Монорепо (pnpm workspace)

```
kryon/
├── packages/
│   ├── theme/          # @shopcore/theme — токени, примітиви, логотип
│   └── shared/         # @shopcore/shared — format, assetUrl, api-клієнт, auth-store
├── backend/            # Express REST API (+ tests, scripts/ — dev-інструментарій)
├── frontend/           # React SPA — магазин (5173)
├── admin/              # React SPA — адмінка (5174)
├── crm/                # React SPA — CRM (5175)
├── docker-compose.yml  # postgres+redis (default) / весь стек (--profile full)
├── render.yaml         # Blueprint бекенду для Render
└── DEPLOY.md           # інструкція деплою (Render + Vercel / локальний прод)
```

Три фронтенди не дублюють код: спільні токени/логотип живуть у `@shopcore/theme`,
а утиліти, api-клієнт і auth-store — у `@shopcore/shared`.

---

## 🚀 Швидкий старт

### Варіант 1 — dev (pnpm)

```bash
docker compose up -d postgres redis     # лише БД + кеш
pnpm install
cp backend/.env.example backend/.env
pnpm migrate && pnpm seed
pnpm dev                                 # бекенд + 3 фронтенди разом
```

### Варіант 2 — повний прод-стек у Docker

```bash
docker compose --profile full up -d --build
docker compose exec backend pnpm seed:prod
```

| | URL |
|---|---|
| Магазин | http://localhost:5173 |
| Адмінка | http://localhost:5174 |
| CRM | http://localhost:5175 |
| API · Swagger | http://localhost:4000/api/docs |

Деплой у хмару (Render + Vercel) — див. [DEPLOY.md](DEPLOY.md).

---

## 👤 Демо-акаунти (після сідера)

| Роль | Email | Пароль | Де |
|------|-------|--------|-----|
| Admin | `admin@kryon.ua` | `Admin123!` | магазин · адмінка · CRM |
| Agent | `agent@kryon.ua` | `Agent123!` | CRM |
| Customer | `olena@kryon.ua` | `User123!` | магазин |

---

## 📖 Вибрані ендпоінти

| Метод | Шлях | Опис | Доступ |
|-------|------|------|--------|
| POST | `/api/auth/login` · `/refresh` | вхід / оновлення токена | публічний |
| GET | `/api/products` | каталог (фасети, пошук, пагінація) | публічний |
| GET | `/api/builder/parts` · POST `/check` | збірка ПК + перевірка сумісності | публічний |
| POST | `/api/orders` | оформлення (доставка + оплата) | customer |
| POST | `/api/payments/orders/:id/session` | платіжна сесія | customer |
| POST | `/api/payments/webhook` | вебхук шлюзу (HMAC) | шлюз |
| GET | `/api/delivery/cities` · `/warehouses` | Нова Пошта | публічний |
| POST | `/api/telephony/calls` · `/webhook` | дзвінок + події АТС | agent / АТС |
| GET | `/api/orders/:id/invoice` | PDF-накладна | admin/agent/власник |
| GET | `/api/admin/orders/export` | CSV-експорт | admin |

Повна специфікація — Swagger на `/api/docs`.

---

## 🧪 Якість

```bash
pnpm lint          # ESLint 9 (flat) на весь монорепо
pnpm format:check  # Prettier
pnpm --filter shopcore-backend test   # Jest (35 тестів)
pnpm -r build      # збірка всіх пакетів
```

Ці ж кроки ганяє **GitHub Actions** на кожен push/PR.

Покриття тестами сфокусоване на бізнес-логіці, де ціна помилки найвища: движок
сумісності PC Builder, вебхуки платежів і телефонії (підпис, ідемпотентність, звірка суми).

---

## 📝 Архітектурні рішення

- **Модульний бекенд** (`modules/*`): кожен домен — `routes` → `service` → `repository`.
- **EAV-модель характеристик** — один каталог тримає GPU, CPU, RAM, БЖ, плати, корпуси
  з різними наборами атрибутів і власними фасетними фільтрами.
- **Транзакції** для оформлення (атомарне списання залишків + створення замовлення).
- **Кеш каталогу** в Redis з інвалідацією; **refresh-токени** в Redis (відкликання сесій).
- **Вебхуки** (платежі, телефонія) — підпис HMAC-SHA256 від сирого тіла, ідемпотентність
  через унікальний `external_id`; заміна на реальний PSP/АТС = зміна провайдера.
- **Гнучкість інтеграцій** — Нова Пошта й платежі/телефонія працюють на вбудованих
  емуляторах без ключів, а з ключами перемикаються на реальні сервіси.
# Kryon
