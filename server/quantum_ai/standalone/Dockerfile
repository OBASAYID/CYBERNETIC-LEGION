FROM node:20-slim AS base

RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-venv \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    ffmpeg \
    ghostscript \
    pkg-config \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir numpy scipy scikit-learn networkx matplotlib pandas mmh3 nltk flask

WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --include=dev

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=deps /app/node_modules/.package-lock.json /tmp/.package-lock.json
RUN npm install tsx typescript && npm cache clean --force

COPY . .
COPY --from=build /app/dist ./dist

RUN rm -rf .git .replit replit.nix .upm .cache

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000 5001 5002

HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:5000/__health || exit 1

CMD ["bash", "-c", "python3 server/quantum_ai/quantum_bridge.py & python3 server/comms/ml_service.py & exec npx tsx server/index.ts"]
