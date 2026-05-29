# VIHAT MiniApp Builder API — production image
FROM node:20-alpine

WORKDIR /app

# Install deps first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund || npm install --omit=dev --no-audit --no-fund

# Copy source
COPY server.js ./
COPY public ./public
# Seed data — copied to /app/data-seed; on first boot the server promotes it
# into /app/data if that dir is empty (so a Railway/Render volume can persist
# writes from the Studio after the seed is loaded).
COPY data ./data-seed
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "server.js"]
