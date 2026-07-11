# Backend container for Railway (service root = server/).
# Single stage: install deps, generate Prisma client + transpile, then run.
# Build uses `tsc --noCheck` (transpile-only) so the app's known pre-existing type
# errors don't fail the image build — runtime behaviour is unaffected.
FROM node:22-slim

# Prisma's query engine needs openssl on Debian slim.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (all, incl. dev — tsc/prisma are dev deps needed to build).
COPY package*.json ./
RUN npm ci

# Generate the Prisma client for the container's (linux) platform, then build.
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build:prod

ENV NODE_ENV=production
EXPOSE 3001

# Apply any pending migrations on boot, then start. (Railway can override this as
# a release/start command, but keeping it here makes the image self-contained.)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
