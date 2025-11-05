/**
 * 🔍 ROTAS DE COMPARAÇÃO ENTERPRISE
 * Rotas para o sistema de comparação de períodos de emprego
 */

const express = require('express');
const comparisonController = require('../controllers/comparisonController');

const router = express.Router();

// Middleware para log de todas as requisições
router.use((req, res, next) => {
  console.log(`🌐 [COMPARISON] ${req.method} ${req.path} - Body:`, req.body);
  next();
});

// Usar todas as rotas do controller
router.use('/', comparisonController);

module.exports = router;
