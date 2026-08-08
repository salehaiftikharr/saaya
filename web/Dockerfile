# Saaya web app. pnpm build, standalone Next.js runtime.
FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Rewrites are evaluated at build time, so the API origin is a build arg.
ARG SAAYA_API_URL=http://server:8000
ENV NEXT_TELEMETRY_DISABLED=1 SAAYA_API_URL=$SAAYA_API_URL
RUN pnpm build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
