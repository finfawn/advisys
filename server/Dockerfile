# Use a small, supported Node.js base image
FROM node:20-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install production dependencies first (faster, cached)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Cloud Run will inject PORT; Express reads process.env.PORT
CMD ["node", "server.js"]