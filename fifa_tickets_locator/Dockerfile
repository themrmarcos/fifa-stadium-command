# Stage 1: Build dependencies
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Production image
FROM node:18-alpine

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./
COPY public/ ./public/
COPY data/ ./data/

ENV PORT=8000
ENV NODE_ENV=production

EXPOSE 8000

CMD ["node", "server.js"]
