# ─────────────────────────────────────────
# Stage 1 — Build (Node 18 Alpine)
# ─────────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# Copy manifest first to cache npm install layer
COPY package*.json ./
RUN npm ci --prefer-offline

# Copy source & build
COPY . .
RUN npm run build


# ─────────────────────────────────────────
# Stage 2 — Serve (Nginx Alpine)
# ─────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove default nginx page
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
