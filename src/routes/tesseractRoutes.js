const express = require('express');
const multer = require('multer');
const path = require('path');
const tesseractOcrService = require('../services/tesseractOcrService');
const router = express.Router();

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'tesseract-test-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF são aceitos'));
    }
  }
});

// POST /api/tesseract/test - Testar OCR Tesseract
router.post('/test', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Arquivo PDF é obrigatório'
      });
    }

    console.log('🧪 [TESSERACT TEST] Iniciando teste:', req.file.filename);

    const uploadId = Date.now();
    
    // Testar com PSM 6
    console.log('📊 [TEST] Testando PSM 6 (Uniform Block)...');
    const textPSM6 = await tesseractOcrService.processPDF(req.file.path, uploadId);
    
    // Testar com PSM 11
    console.log('📊 [TEST] Testando PSM 11 (Sparse Text)...');
    const textPSM11 = await tesseractOcrService.processPDFSparseText(req.file.path, uploadId);
    
    // Testar com Multi-PSM
    console.log('📊 [TEST] Testando Multi-PSM...');
    const textMulti = await tesseractOcrService.processPDFMultiPSM(req.file.path, uploadId);

    const results = {
      psm6: {
        text: textPSM6,
        length: textPSM6.length,
        score: tesseractOcrService.scoreText(textPSM6)
      },
      psm11: {
        text: textPSM11,
        length: textPSM11.length,
        score: tesseractOcrService.scoreText(textPSM11)
      },
      multiPSM: {
        text: textMulti,
        length: textMulti.length,
        score: tesseractOcrService.scoreText(textMulti)
      }
    };

    console.log('✅ [TESSERACT TEST] Teste concluído');

    res.json({
      success: true,
      message: 'Teste Tesseract OCR concluído',
      data: {
        filename: req.file.filename,
        results: results,
        recommendation: results.psm6.score >= results.psm11.score ? 'PSM6' : 'PSM11'
      }
    });

  } catch (error) {
    console.error('❌ [TESSERACT TEST] Erro:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no teste Tesseract OCR',
      error: error.message
    });
  }
});

// GET /api/tesseract/status - Status do serviço Tesseract
router.get('/status', async (req, res) => {
  try {
    const status = {
      initialized: tesseractOcrService.isInitialized,
      version: 'tesseract.js',
      supportedLanguages: ['por', 'eng'],
      availablePSM: [
        { id: 6, name: 'SINGLE_UNIFORM_BLOCK', description: 'Uniform block of text' },
        { id: 11, name: 'SPARSE_TEXT', description: 'Sparse text' }
      ]
    };

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar status do Tesseract',
      error: error.message
    });
  }
});

module.exports = router;
