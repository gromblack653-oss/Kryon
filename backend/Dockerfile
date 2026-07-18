# Бекенд ShopCore. Контекст збірки — КОРІНЬ репозиторію (pnpm-воркспейс).
# docker compose будує з context: . та dockerfile: backend/Dockerfile

# ---- build ----
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
# Спершу лише маніфести — щоб pnpm бачив увесь граф воркспейсу й кешував install.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY admin/package.json admin/
COPY crm/package.json crm/
COPY packages/theme/package.json packages/theme/
COPY packages/shared/package.json packages/shared/
# Ставимо залежності лише бекенду (фронти сюди не тягнемо).
RUN pnpm install --filter shopcore-backend... --frozen-lockfile
COPY backend ./backend
RUN pnpm --filter shopcore-backend build

# ---- runtime ----
FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /repo
ENV NODE_ENV=production
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY admin/package.json admin/
COPY crm/package.json crm/
COPY packages/theme/package.json packages/theme/
COPY packages/shared/package.json packages/shared/
# Лише прод-залежності (node-pg-migrate у dependencies — потрібен для міграцій).
RUN pnpm install --filter shopcore-backend... --prod --frozen-lockfile
COPY --from=build /repo/backend/dist ./backend/dist
# Кириличний шрифт для PDF-накладних і сідовані фото товарів.
COPY backend/src/assets ./backend/src/assets
COPY backend/uploads ./backend/uploads
WORKDIR /repo/backend
EXPOSE 4000
# Міграції ідемпотентні — безпечно при кожному старті; далі — сервер.
CMD ["sh", "-c", "pnpm migrate:prod && node dist/server.js"]
