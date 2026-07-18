# Деплой Kryon

Архітектура хостингу:

```
┌─────────────── Vercel ───────────────┐        ┌──────────── Render ────────────┐
│  Магазин   kryon-shop.vercel.app   │  HTTPS │  kryon-api  (Node + Socket) │
│  Адмінка   kryon-admin.vercel.app  │ ─────► │  PostgreSQL                    │
│  CRM       kryon-crm.vercel.app    │        │  Redis                         │
└───────────────────────────────────────┘        └────────────────────────────────┘
```

- **Фронтенди** (три Vite-SPA) → Vercel (статика).
- **Бекенд + PostgreSQL + Redis** → Render (довгоживучий Node-сервер: Socket.IO, диск, PDF).

Фронтенди ходять на API через `VITE_API_URL`, тому працюють крос-доменно. Refresh-токен
зберігається в localStorage (не крос-сайт cookie), тож CORS-обмежень з cookie немає.

---

## Варіант A — локальний прод (без акаунтів, для швидкої перевірки)

Весь стек у прод-режимі через Docker на localhost. Фронти обслуговує nginx і сам проксить
`/api`, `/uploads`, `/socket.io` на бекенд — тому крос-домену немає, `VITE_API_URL` не потрібен.

```bash
docker compose --profile full up -d --build     # збірка + запуск усіх 6 сервісів
docker compose exec backend pnpm seed:prod       # наповнити демо-даними (один раз)
```

| Сервіс   | URL                      |
|----------|--------------------------|
| Магазин  | http://localhost:5173    |
| Адмінка  | http://localhost:5174    |
| CRM      | http://localhost:5175    |
| API/docs | http://localhost:4000/api/docs |

Зупинити: `docker compose --profile full down` (додайте `-v`, щоб стерти й дані БД).
Міграції проганяються автоматично при старті бекенда.

---

## Варіант B — хмара (Render + Vercel)

## 0. Репозиторій на GitHub

```bash
# репозиторій уже ініціалізований і має перший коміт
git remote add origin https://github.com/<ваш-нік>/shopcore.git
git push -u origin main
```

---

## 1. Бекенд на Render (Blueprint)

1. Render Dashboard → **New → Blueprint** → підключіть репозиторій.
2. Render прочитає [`render.yaml`](render.yaml) і створить три ресурси:
   `kryon-api` (web), `kryon-db` (Postgres), `kryon-redis` (Redis).
3. Перед «Apply» заповніть два env, позначені `sync: false` у сервісі `kryon-api`:
   - `CORS_ORIGIN` — поки лишіть тимчасово `*` (уточнимо після кроку 2), або одразу впишіть
     майбутні домени Vercel через кому.
   - `PAYMENT_RETURN_URL` — майбутній URL магазину (напр. `https://kryon-shop.vercel.app/orders`).
4. **Apply** — Render збере бекенд і при старті прожене міграції (`migrate:prod`).
5. Коли `kryon-api` стане `Live`, скопіюйте його URL (напр. `https://kryon-api.onrender.com`).

### Наповнити демо-даними (один раз)

Render Dashboard → `kryon-api` → **Shell**:

```bash
pnpm --filter shopcore-backend seed:prod
```

> Сідер **скидає** каталог і демо-дані — запускайте лише коли треба «чистий» стан.
> Health-check: `GET https://kryon-api.onrender.com/health` → `{"status":"ok"}`.

---

## 2. Фронтенди на Vercel (три проєкти)

Кожен фронтенд — окремий Vercel-проєкт з **тим самим репозиторієм**, різняться лише
**Root Directory** та назвою. Vercel сам підхопить pnpm-воркспейс і збере спільний
`@shopcore/theme`.

Для кожного з трьох (`frontend`, `admin`, `crm`):

1. Vercel → **Add New → Project** → імпорт репозиторію.
2. **Root Directory** → відповідно `frontend` / `admin` / `crm`.
3. Framework Preset визначиться як **Vite** автоматично (є `vercel.json`).
4. **Environment Variables** → додайте:

   | Name           | Value                                 |
   |----------------|---------------------------------------|
   | `VITE_API_URL` | `https://kryon-api.onrender.com`   |

   > `VITE_*` інлайняться під час збірки — після зміни треба **Redeploy**.
5. **Deploy**. Отримаєте три URL, напр.:
   - `https://kryon-shop.vercel.app`
   - `https://kryon-admin.vercel.app`
   - `https://kryon-crm.vercel.app`

---

## 3. Замкнути CORS (після кроку 2)

Render → `kryon-api` → **Environment** → впишіть реальні домени:

```
CORS_ORIGIN=https://kryon-shop.vercel.app,https://kryon-admin.vercel.app,https://kryon-crm.vercel.app
PAYMENT_RETURN_URL=https://kryon-shop.vercel.app/orders
```

Збережіть — Render перезапустить сервіс. Готово.

---

## Перевірка

| Демо-доступ | Логін | Пароль |
|-------------|-------|--------|
| Покупець    | `olena@kryon.ua`  | `User123!`  |
| Адміністратор | `admin@kryon.ua` | `Admin123!` |
| Оператор CRM | `agent@kryon.ua` | `Agent123!` |

Наскрізний сценарій: магазин → кошик → оформлення (Нова Пошта, картка) → сторінка шлюзу →
оплата → замовлення `оплачено`. В адмінці — статус замовлення й дохід, у CRM — дзвінок.

---

## Нюанси безкоштовних тарифів

- **Render free** присипляє сервіс після ~15 хв без запитів — перший запит після сну
  «прокидається» ~30 с. Для демо норм; health-пінг раз на 10 хв тримає його живим.
- **Render free Postgres** діє 90 днів, далі потрібен платний план або нова БД.
- **Real-time** (Socket.IO) працює повноцінно, бо бекенд — довгоживучий процес.
  Якби бекенд був на serverless (напр. Vercel-функції), real-time довелося б замінити на
  polling — саме тому бекенд винесено на Render.

## Реальні інтеграції (опційно)

У демо працюють вбудовані емулятори; для «живого» режиму додайте env на Render:

- **Нова Пошта**: `NP_API_KEY` — тоді довідник міст/відділень береться з реального API.
- **Оплата / телефонія**: `PAYMENT_WEBHOOK_SECRET`, `TELEPHONY_WEBHOOK_SECRET` уже
  згенеровані Render; підставте реальний PSP / АТС, змінивши провайдера — контракт вебхуків
  (HMAC-SHA256) уже сумісний.
