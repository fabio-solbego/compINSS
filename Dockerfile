# 🚀 DOCKERFILE ENTERPRISE - INSS COMPARADOR
# Multi-stage build para otimização de produção

# ========================================
# Stage 1: Build Dependencies
# ========================================
FROM node:18-alpine AS dependencies

LABEL maintainer="Software House Enterprise"
LABEL version="2.0.0"
LABEL description="INSS Comparador - Sistema Enterprise de Análise de Diferenças"

# Instalar dependências do sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY yarn.lock* ./

# Instalar dependências com cache otimizado
RUN npm ci --only=production && npm cache clean --force

# ========================================
# Stage 2: Build Application
# ========================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar dependências do stage anterior
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Build da aplicação (se houver processo de build)
RUN npm run build 2>/dev/null || echo "No build script found"

# ========================================
# Stage 3: Production Runtime
# ========================================
FROM node:18-alpine AS runtime

# Instalar dependências de runtime mínimas
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S inss -u 1001

# Definir diretório de trabalho
WORKDIR /app

# Copiar aplicação construída
COPY --from=builder --chown=inss:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=inss:nodejs /app/src ./src
COPY --from=builder --chown=inss:nodejs /app/public ./public
COPY --from=builder --chown=inss:nodejs /app/config ./config
COPY --from=builder --chown=inss:nodejs /app/package*.json ./
COPY --from=builder --chown=inss:nodejs /app/server.js ./

# Criar diretórios necessários
RUN mkdir -p uploads logs temp && \
    chown -R inss:nodejs uploads logs temp

# Configurar variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3021
ENV LOG_LEVEL=info

# Expor porta
EXPOSE 3021

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3021/health || exit 1

# Usar usuário não-root
USER inss

# Usar dumb-init para gerenciamento de processos
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicialização
CMD ["node", "server.js"]
