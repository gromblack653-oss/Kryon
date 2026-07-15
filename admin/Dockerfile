# admin ShopCore (Vite-SPA). Контекст збірки — КОРІНЬ репозиторію (pnpm-воркспейс,
# потрібен спільний \@shopcore/theme). docker compose: context: . dockerfile: admin/Dockerfile

# ---- build ----
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
COPY admin/package.json admin/
COPY crm/package.json crm/
COPY packages/theme/package.json packages/theme/
RUN pnpm install --filter shopcore-admin... --frozen-lockfile
COPY packages/theme ./packages/theme
COPY admin ./admin
RUN pnpm --filter shopcore-admin build

# ---- serve через nginx ----
FROM nginx:alpine
COPY admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/admin/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
