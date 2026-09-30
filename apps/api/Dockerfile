FROM node:24-bookworm-slim AS build
WORKDIR /workspace
RUN npm install --global pnpm@11.27.0
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @mission-control/api... --workspace-concurrency=1 exec tsc -p tsconfig.build.json
RUN pnpm --filter @mission-control/campaign-operation-lighthouse generate:runtime
RUN pnpm --filter @mission-control/api deploy --prod --legacy /package/api

FROM node:24-bookworm-slim AS runtime
ARG VCS_REF
LABEL org.opencontainers.image.revision=$VCS_REF
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 WORKSHOP_RUNTIME=hosted
WORKDIR /app
COPY --from=build --chown=node:node /package/api/ ./
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
