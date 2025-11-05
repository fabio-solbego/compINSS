/**
 * 🔒 MIDDLEWARE DE AUTENTICAÇÃO ENTERPRISE
 * Implementação completa de JWT com refresh tokens e rate limiting
 */

const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

// Configurações de segurança
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Rate Limiting Enterprise
 */
const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.log(`🚨 [SECURITY] Rate limit exceeded: ${req.ip} - ${req.originalUrl}`);
      res.status(429).json({
        success: false,
        message: 'Muitas tentativas. Tente novamente em alguns minutos.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Rate limits específicos
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutos
  5, // 5 tentativas
  'Muitas tentativas de login. Tente novamente em 15 minutos.'
);

const apiRateLimit = createRateLimit(
  1 * 60 * 1000, // 1 minuto
  100, // 100 requests
  'Muitas requisições. Limite de 100 por minuto.'
);

const uploadRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutos
  10, // 10 uploads
  'Muitos uploads. Limite de 10 a cada 5 minutos.'
);

/**
 * Helmet Security Headers
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'", 
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"], // Permitir event handlers inline
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Validadores de Input
 */
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Senha deve ter pelo menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Senha deve conter: maiúscula, minúscula, número e símbolo')
];

const registerValidation = [
  ...loginValidation,
  body('name')
    .isLength({ min: 2, max: 50 })
    .trim()
    .escape()
    .withMessage('Nome deve ter entre 2 e 50 caracteres'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Confirmação de senha não confere');
      }
      return true;
    })
];

/**
 * Geração de Tokens JWT
 */
function generateTokens(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role || 'user',
    permissions: user.permissions || []
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'inss-comparador',
    audience: 'inss-users'
  });

  const refreshToken = jwt.sign(
    { id: user.id, tokenVersion: user.tokenVersion || 0 },
    JWT_REFRESH_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'inss-comparador',
      audience: 'inss-users'
    }
  );

  return { accessToken, refreshToken };
}

/**
 * Middleware de Autenticação
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token de acesso requerido',
      code: 'NO_TOKEN'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log(`🚨 [SECURITY] Token inválido: ${req.ip} - ${err.message}`);
      
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expirado',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      return res.status(403).json({
        success: false,
        message: 'Token inválido',
        code: 'INVALID_TOKEN'
      });
    }

    // Log de acesso autorizado
    console.log(`✅ [SECURITY] Acesso autorizado: ${user.email} - ${req.originalUrl}`);
    
    req.user = user;
    next();
  });
}

/**
 * Middleware de Autorização por Role
 */
function authorizeRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    if (!roles.includes(req.user.role)) {
      console.log(`🚨 [SECURITY] Acesso negado: ${req.user.email} tentou acessar ${req.originalUrl} com role ${req.user.role}`);
      
      return res.status(403).json({
        success: false,
        message: 'Permissão insuficiente',
        required_roles: roles,
        user_role: req.user.role
      });
    }

    next();
  };
}

/**
 * Middleware de Validação de Entrada
 */
function validateInput(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    console.log(`⚠️ [SECURITY] Validação falhou: ${req.ip} - ${JSON.stringify(errors.array())}`);
    
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errors.array()
    });
  }
  
  next();
}

/**
 * Sanitização de Arquivos Upload
 */
function sanitizeFileUpload(req, res, next) {
  if (!req.file && !req.files) {
    return next();
  }

  const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  const files = req.files || [req.file];
  
  for (const file of files) {
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de arquivo não permitido',
        allowed_types: ['PDF', 'Excel (.xlsx)']
      });
    }

    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: 'Arquivo muito grande',
        max_size: '10MB'
      });
    }
  }

  next();
}

/**
 * Audit Log
 */
function auditLog(action) {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Log da ação após resposta
      const logData = {
        timestamp: new Date().toISOString(),
        action,
        user: req.user?.email || 'anonymous',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        success: res.statusCode < 400
      };
      
      console.log(`📋 [AUDIT] ${JSON.stringify(logData)}`);
      
      originalSend.call(this, data);
    };
    
    next();
  };
}

module.exports = {
  // Rate Limiting
  authRateLimit,
  apiRateLimit,
  uploadRateLimit,
  
  // Security Headers
  securityHeaders,
  
  // Validation
  loginValidation,
  registerValidation,
  validateInput,
  
  // Authentication & Authorization
  generateTokens,
  authenticateToken,
  authorizeRole,
  
  // File Security
  sanitizeFileUpload,
  
  // Audit
  auditLog
};
