# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY frontend/ ./
# Empty default: same-origin /api via Ingress in Kubernetes. Override for local/docker-compose (see docker-compose.yml).
ARG VITE_API_BASE_URL=
ARG VITE_ENABLE_ADMIN_VIEW=false
ARG VITE_ADMIN_USER_ID=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_ENABLE_ADMIN_VIEW=${VITE_ENABLE_ADMIN_VIEW}
ENV VITE_ADMIN_USER_ID=${VITE_ADMIN_USER_ID}
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
