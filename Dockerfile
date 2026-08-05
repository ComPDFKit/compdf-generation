ARG NODE_IMAGE=node:22-bookworm-slim

# Build the Vite application into static files served by Express.
FROM ${NODE_IMAGE} AS frontend-build
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# Compile the Express API independently so TypeScript output stays isolated.
FROM ${NODE_IMAGE} AS server-build
WORKDIR /build/server
COPY server/package*.json ./
RUN npm ci
COPY server ./
RUN npm run build

# Install only runtime dependencies for the final production image.
FROM ${NODE_IMAGE} AS server-dependencies
WORKDIR /build/server
COPY server/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Serve the compiled API and frontend from one non-root Node.js container.
FROM ${NODE_IMAGE} AS production
WORKDIR /app
ENV NODE_ENV=production PORT=8090
COPY --from=server-dependencies /build/server/node_modules ./node_modules
COPY --from=server-build /build/server/dist ./dist
COPY --from=frontend-build /build/frontend/dist ./public
COPY server/package.json ./package.json
USER node
EXPOSE 8090
# The template search endpoint is available without a ComPDF generation request.
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:8090/api/templates/search').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
