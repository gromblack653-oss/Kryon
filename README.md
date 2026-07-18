# ShopCore — Fullstack E-commerce Platform

Повноцінний production-ready інтернет-магазин, побудований на сучасному стеку.
Проєкт демонструє навички **middle fullstack developer**: проєктування REST API,
робота з реляційною БД, автентифікація, real-time, кешування, контейнеризація та тестування.

## 🧱 Стек технологій

### Backend
- **Node.js + Express + TypeScript** — REST API
- **PostgreSQL** — основна база даних (raw SQL міграції на `node-pg-migrate`)
- **Redis** — кешування каталогу + зберігання refresh-токенів
- **JWT** — автентифікація (access + refresh, ролі `admin` / `customer`)
- **Zod** — валідація вхідних даних
- **Socket.IO** — real-time оновлення статусів замовлень і залишків на складі
- **Multer** — завантаження зображень товарів
- **Swagger (OpenAPI)** — авто-документація API на `/api/docs`
- **Jest + Supertest** — інтеграційні тести

### Frontend (клієнтський магазин)
- **React + TypeScript + Vite** (порт **5173**)
- **React Router** — маршрутизація
- **Zustand** — глобальний стан (кошик, auth)
- **TanStack Query (React Query)** — серверний стан, кеш, інвалідація
- **Axios** — HTTP-клієнт з інтерсепторами (авто-refresh токенів)

### Admin (окремий застосунок керування)
- Окремий **React + TypeScript + Vite** застосунок на порту **5174**
- Логін лише для ролі `admin`, власний ключ сесії в localStorage
- **Дашборд** (дохід, залишки, замовлення за статусами, топ продажів), керування **товарами** (CRUD + фото), **замовленнями** (зміна статусів, real-time) та **категоріями**

### CRM (окремий застосунок для працівників)
- Окремий **React + TypeScript + Vite** застосунок на порту **5175** з преміальним дизайном
- Доступ для ролей `admin` та `agent` (оператор)
- **Спільна база даних** з магазином і адмінкою: ті самі клієнти й замовлення
- **Інтеграція телефонії (MicroSIP)** — click-to-call через `sip:`-протокол + журналювання дзвінків
- **Клієнти** (профіль, спільна історія замовлень, дзвінки, таймлайн активностей), **Дзвінки** (журнал + швидкий набір), **Дашборд**, **Налаштування** протоколу набору

### DevOps
- **Docker + Docker Compose** — вся інфраструктура однією командою

## 📂 Структура

```
superproject/
├── backend/            # Express REST API
│   ├── src/
│   │   ├── config/     # env, конфіг
│   │   ├── db/         # пул з'єднань, міграції, сідери
│   │   ├── middleware/ # auth, error, validate, upload
│   │   ├── modules/    # auth, users, products, categories, cart, orders
│   │   ├── realtime/   # Socket.IO
│   │   ├── utils/      # helpers, errors, logger
│   │   ├── app.ts      # Express app
│   │   └── server.ts   # HTTP + WS bootstrap
│   └── tests/
├── frontend/           # React SPA — клієнтський магазин (5173)
│   └── src/
│       ├── api/        # axios + запити
│       ├── components/ # UI
│       ├── pages/      # сторінки
│       ├── store/      # Zustand
│       └── types/
├── admin/              # React SPA — панель керування (5174)
│   └── src/
│       ├── api/        # axios + запити
│       ├── components/ # Layout, ProtectedRoute, ProductImage
│       ├── pages/      # Dashboard, Products, Orders, Categories
│       └── store/      # Zustand (окрема admin-сесія)
├── crm/                # React SPA — CRM для працівників (5175)
│   └── src/
│       ├── api/        # axios + запити
│       ├── components/ # Layout, CallButton, CallModal, Avatar
│       ├── lib/        # sip.ts (MicroSIP click-to-call)
│       ├── pages/      # Dashboard, Customers, CustomerDetail, Calls, Settings
│       └── store/      # Zustand (сесія + налаштування SIP)
├── docker-compose.yml
└── README.md
```

## 🚀 Швидкий старт (Docker)

```bash
# 1. Скопіювати env-файли
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Підняти всю інфраструктуру
docker compose up --build

# 3. Застосувати міграції + сідери (в окремому терміналі)
docker compose exec backend npm run migrate up
docker compose exec backend npm run seed
```

- Frontend (магазин): http://localhost:5173
- Admin (панель керування): http://localhost:5174
- CRM (для працівників): http://localhost:5175
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/api/docs

## 🛠 Локальний запуск (pnpm-монорепо)

Проєкт — це **pnpm workspace**: фронтенд і бекенд стартують однією командою з кореня.
Потрібні локальні PostgreSQL і Redis (найпростіше — підняти лише їх через Docker).

```bash
# 0. Інфраструктура (лише БД + кеш)
docker compose up -d postgres redis

# 1. Залежності всього монорепо однією командою
pnpm install

# 2. env-файли
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp admin/.env.example admin/.env
cp crm/.env.example crm/.env

# 3. Міграції + сідер
pnpm migrate
pnpm seed

# 4. Запуск фронтенду + бекенду разом
pnpm dev
```

- Магазин: http://localhost:5173 · Адмінка: http://localhost:5174 · CRM: http://localhost:5175
- API: http://localhost:4000 · Swagger: http://localhost:4000/api/docs

### Корисні скрипти (з кореня)

| Команда              | Що робить                                   |
|----------------------|---------------------------------------------|
| `pnpm dev`           | бекенд + магазин + адмінка паралельно        |
| `pnpm dev:backend`   | лише бекенд                                 |
| `pnpm dev:frontend`  | лише магазин (5173)                          |
| `pnpm dev:admin`     | лише адмінка (5174)                          |
| `pnpm dev:crm`       | лише CRM (5175)                              |
| `pnpm build`         | збірка обох пакетів                         |
| `pnpm test`          | тести бекенду (Jest)                        |
| `pnpm migrate`       | застосувати міграції                        |
| `pnpm seed`          | наповнити БД демо-даними                    |

## 👤 Тестові акаунти (після сідера)

| Роль     | Email                | Пароль      | Де використовувати        |
|----------|----------------------|-------------|---------------------------|
| Admin    | admin@shopcore.dev   | Admin123!   | магазин, адмінка, CRM     |
| Agent    | agent@shopcore.dev   | Agent123!   | CRM (оператор)            |
| Customer | user@shopcore.dev    | User123!    | магазин                   |

## 📖 Основні ендпоінти

| Метод | Шлях                       | Опис                          | Доступ    |
|-------|----------------------------|-------------------------------|-----------|
| POST  | `/api/auth/register`       | Реєстрація                    | публічний |
| POST  | `/api/auth/login`          | Вхід                          | публічний |
| POST  | `/api/auth/refresh`        | Оновлення токена              | публічний |
| GET   | `/api/products`            | Каталог (фільтри, пагінація)  | публічний |
| GET   | `/api/products/:id`        | Товар                         | публічний |
| POST  | `/api/products`            | Створити товар                | admin     |
| PATCH | `/api/products/:id`        | Оновити товар                 | admin     |
| POST  | `/api/products/:id/image`  | Завантажити зображення        | admin     |
| GET   | `/api/cart`                | Кошик користувача             | customer  |
| POST  | `/api/cart/items`          | Додати в кошик                | customer  |
| POST  | `/api/orders`              | Оформити замовлення           | customer  |
| PATCH | `/api/orders/:id/status`   | Змінити статус (real-time)    | admin     |
| GET   | `/api/orders/:id/invoice`  | Накладна у PDF                | admin/agent/власник |
| GET   | `/api/admin/orders/export` | Вивантаження замовлень у CSV  | admin     |
| GET   | `/api/crm/orders/:id/items`| Товари замовлення (для CRM)   | admin/agent |

Детальна специфікація — у Swagger `/api/docs`.

## 🧪 Тести

```bash
cd backend
npm test
```

## 📝 Архітектурні рішення

- **Модульна структура** (`modules/*`): кожен домен містить `controller` → `service` → `repository`, що спрощує тестування та масштабування.
- **Транзакції** для оформлення замовлення: списання залишків + створення замовлення атомарно.
- **Кешування** каталогу в Redis з інвалідацією при зміні товарів.
- **Refresh-токени** зберігаються в Redis (можливість відкликати сесію).
- **Real-time**: при зміні статусу замовлення адміністратором клієнт отримує подію через WebSocket.
# Kryon
