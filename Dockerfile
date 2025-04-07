FROM node:18-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# ---- Run stage ----
FROM node:18-slim

WORKDIR /app

COPY --from=builder /app /app

EXPOSE 5000

CMD ["npm", "run", "dev"]