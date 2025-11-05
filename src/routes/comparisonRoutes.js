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
router.post('/', async (req, res) => {
  try {
    const { pdfUploadId, excelUploadId } = req.body;

    if (!pdfUploadId || !excelUploadId) {
      return res.status(400).json({
        success: false,
        message: 'IDs de upload do PDF e Excel são obrigatórios'
      });
    }

    console.log('🔄 [COMPARISON] Iniciando comparação:', { pdfUploadId, excelUploadId });

    // Simular criação de comparação
    const comparisonId = Date.now();

    res.json({
      success: true,
      message: 'Comparação iniciada com sucesso',
      data: {
        comparisonId: comparisonId,
        status: 'processing'
      }
    });

  } catch (error) {
    console.error('❌ [COMPARISON] Erro na comparação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao iniciar comparação',
      error: error.message
    });
  }
});

// POST /api/comparison/comparar - Rota específica para comparação
router.post('/comparar', async (req, res) => {
  try {
    console.log('🎯 [COMPARISON] Rota /comparar chamada!');
    console.log('📋 [COMPARISON] Body recebido:', req.body);
    
    const { pdfUploadId, excelUploadId } = req.body;

    console.log('🔄 [COMPARISON] Comparando uploads:', { pdfUploadId, excelUploadId });

    if (!pdfUploadId || !excelUploadId) {
      return res.status(400).json({
        success: false,
        message: 'IDs de upload do PDF e Excel são obrigatórios'
      });
    }

    // Buscar períodos dos dois uploads
    const EmploymentPeriod = require('../models/EmploymentPeriod');
    
    const pdfPeriods = await EmploymentPeriod.findByUploadId(pdfUploadId);
    const excelPeriods = await EmploymentPeriod.findByUploadId(excelUploadId);

    console.log('📊 [COMPARISON] Períodos encontrados:', { 
      pdf: pdfPeriods.length, 
      excel: excelPeriods.length 
    });

    // Simular comparação básica
    const comparisonId = Date.now();
    const comparison = {
      comparisonId: comparisonId,
      id: comparisonId,
      pdfCount: pdfPeriods.length,
      excelCount: excelPeriods.length,
      matches: Math.min(pdfPeriods.length, excelPeriods.length),
      differences: Math.abs(pdfPeriods.length - excelPeriods.length),
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    console.log('✅ [COMPARISON] Comparação concluída:', comparison);

    res.json({
      success: true,
      message: 'Comparação realizada com sucesso',
      data: comparison
    });

  } catch (error) {
    console.error('❌ [COMPARISON] Erro na comparação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao realizar comparação',
      error: error.message
    });
  }
});

// GET /api/comparison/:id/status - Status da comparação
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 [COMPARISON] Buscando status da comparação:', id);

    // Simular status da comparação
    res.json({
      success: true,
      data: {
        id: id,
        status: 'completed',
        result: {
          matches: 0,
          differences: 0,
          summary: 'Comparação simulada'
        }
      }
    });

  } catch (error) {
    console.error('❌ [COMPARISON] Erro ao buscar status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar status da comparação',
      error: error.message
    });
  }
});

module.exports = router;
