/**
 * 🏢 SERVIDOR PRINCIPAL ENTERPRISE - INSS COMPARADOR 2.0
 * Sistema completo de comparação de períodos de emprego com análise detalhada
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const winston = require('winston');

// Importar middlewares de segurança
const { 
  securityHeaders, 
  apiRateLimit, 
  uploadRateLimit,
  auditLog 
} = require('./src/middleware/auth');

// Importar rotas
const uploadRoutes = require('./src/routes/uploadRoutes');
const comparisonRoutes = require('./src/routes/comparisonRoutes_new');
const exportRoutes = require('./src/routes/exportRoutes');
const tesseractRoutes = require('./src/routes/tesseractRoutes');

// Configuração do logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'inss-comparador' },
  transports: [
    new winston.transports.File({ 
      filename: './logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: './logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Criar aplicação Express
const app = express();
const PORT = process.env.PORT || 4000;

// ========================================
// 🔒 MIDDLEWARES DE SEGURANÇA
// ========================================

// Headers de segurança
app.use(securityHeaders);

// CORS configurado
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3021'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting global
app.use('/api', apiRateLimit);
app.use('/api/upload', uploadRateLimit);

// Parsing de JSON e URL encoded
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Audit logging para todas as requisições
app.use(auditLog('api_access'));

// ========================================
// 🌐 ROTAS DA API
// ========================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0-enterprise',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/upload', uploadRoutes);
app.use('/api/comparacao', comparisonRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/tesseract', tesseractRoutes);

// Rota principal - servir index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========================================
// 🚨 TRATAMENTO DE ERROS
// ========================================

// Middleware de tratamento de erros 404
app.use((req, res, next) => {
  logger.warn(`404 - Rota não encontrada: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Middleware global de tratamento de erros
app.use((error, req, res, next) => {
  logger.error('Erro não tratado:', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Não vazar informações sensíveis em produção
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Erro interno do servidor',
    ...(isDevelopment && { stack: error.stack }),
    timestamp: new Date().toISOString()
  });
});

// ========================================
// 🚀 INICIALIZAÇÃO DO SERVIDOR
// ========================================

// Tratamento de sinais de sistema
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido, encerrando servidor graciosamente...');
  server.close(() => {
    logger.info('Servidor encerrado com sucesso');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido, encerrando servidor graciosamente...');
  server.close(() => {
    logger.info('Servidor encerrado com sucesso');
    process.exit(0);
  });
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  logger.error('Exceção não capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promise rejeitada não tratada:', { reason, promise });
  process.exit(1);
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  logger.info(`🚀 Servidor INSS Comparador Enterprise iniciado!`);
  logger.info(`📊 Porta: ${PORT}`);
  logger.info(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 URL: http://localhost:${PORT}`);
  logger.info(`💾 Banco: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
  logger.info(`📋 Logs: ./logs/`);
  
  // Log de inicialização bem-sucedida
  console.log('\n🎉 ========================================');
  console.log('🏢 SOFTWARE HOUSE ENTERPRISE');
  console.log('📊 INSS COMPARADOR 2.0 - ENTERPRISE');
  console.log('========================================');
  console.log(`🌐 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 Acesse: http://localhost:${PORT}`);
  console.log('========================================\n');
});

// Configurar timeout do servidor
server.timeout = 300000; // 5 minutos

module.exports = app;
