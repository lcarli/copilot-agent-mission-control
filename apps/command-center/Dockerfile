FROM node:24-bookworm-slim AS build
WORKDIR /workspace
RUN npm install --global pnpm@11.27.0
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @mission-control/command-center^... --workspace-concurrency=1 exec tsc -p tsconfig.build.json
RUN pnpm --filter @mission-control/command-center build

FROM node:24-bookworm-slim AS runtime
ARG VCS_REF
LABEL org.opencontainers.image.revision=$VCS_REF
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=build --chown=node:node /workspace/apps/command-center/package.json ./
COPY --from=build --chown=node:node /workspace/apps/command-center/dist/ ./dist/
COPY --from=build --chown=node:node /workspace/apps/command-center/server-dist/ ./server-dist/
USER node
EXPOSE 8080
CMD ["node", "server-dist/index.js"]
