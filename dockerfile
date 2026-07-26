# ---- Build stage: KV server ----
FROM gcc:13-bookworm AS build-kv

WORKDIR /src
COPY redis-cpp/avl.cpp redis-cpp/avl.h redis-cpp/common.h redis-cpp/hashtable.cpp redis-cpp/hashtable.h redis-cpp/heap.cpp redis-cpp/heap.h redis-cpp/list.h redis-cpp/server.cpp redis-cpp/thread_pool.cpp redis-cpp/thread_pool.h redis-cpp/zset.cpp redis-cpp/zset.h ./
RUN g++ -std=gnu++17 -O2 server.cpp avl.cpp hashtable.cpp heap.cpp thread_pool.cpp zset.cpp -o kv-server -lpthread

# ---- Build stage: Next.js dashboard ----
FROM node:20-bookworm AS build-web

WORKDIR /app
COPY kvdash/package.json kvdash/package-lock.json ./
RUN npm install
COPY kvdash/ .
RUN npm run build

# ---- Runtime: both processes, one container ----
FROM node:20-bookworm-slim AS runtime

WORKDIR /ap

ENV NODE_ENV=production
ENV PORT=3000
ENV KV_HOST=127.0.0.1
ENV KV_PORT=1234

COPY --from=build-kv /src/kv-server /usr/local/bin/kv-server
COPY --from=build-web /app/.next/standalone ./
COPY --from=build-web /app/public ./public
COPY --from=build-web /app/.next/static ./.next/static
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3000

CMD ["./start.sh"]