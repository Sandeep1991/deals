# Build stage
FROM node:20-alpine AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

COPY frontend/ ./
COPY data/ads.txt ./src/data/ads.txt

RUN npm run build

# Serve stage
FROM nginx:alpine

RUN apk add --no-cache gettext

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
