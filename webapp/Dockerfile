FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Vite embeds these values in the static bundle at build time. Defaults target
# the same-origin routes used by the Kubernetes ingress.
ARG VITE_CATALOG_API_URL=/api/catalog
ARG VITE_ORDERS_API_URL=/api
ENV VITE_CATALOG_API_URL=${VITE_CATALOG_API_URL} \
    VITE_ORDERS_API_URL=${VITE_ORDERS_API_URL}

COPY . .
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
