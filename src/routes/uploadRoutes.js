const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fileProcessingService = require('../services/fileProcessingService');
const Upload = require('../models/Upload');
const EmploymentPeriod = require('../models/EmploymentPeriod');
const router = express.Router();

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Erro ao criar diretório de upload:', error);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'), false);
    }
  }
});

// POST /api/uploads - Upload de arquivo
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo enviado'
      });
    }

    console.log('📤 [UPLOAD] Arquivo recebido:', req.file.originalname);

    // Determinar tipo do arquivo
    const ext = path.extname(req.file.originalname).toLowerCase();
    let fileType;
    
    if (ext === '.pdf') {
      fileType = 'pdf';
    } else if (ext === '.xlsx' || ext === '.xls') {
      fileType = 'excel';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Tipo de arquivo não suportado'
      });
    }

    // Criar registro de upload no banco primeiro
    const uploadData = {
      filename: req.file.filename,
      original_name: req.file.originalname,
      type: fileType,
      size_bytes: req.file.size,
      storage_path: req.file.path
    };

    console.log('💾 [UPLOAD] Criando registro de upload no banco...');
    console.log('📋 [UPLOAD] Dados do upload:', uploadData);
    
    let uploadId;
    try {
      uploadId = await Upload.create(uploadData);
      console.log('✅ [UPLOAD] Registro criado com ID:', uploadId);
      
      // Verificar se o upload foi realmente criado
      const uploadVerification = await Upload.findById(uploadId);
      if (!uploadVerification) {
        throw new Error('Upload não foi encontrado após criação');
      }
      console.log('✅ [UPLOAD] Upload verificado no banco:', uploadVerification.id);
      
      // Pequena pausa para garantir que o commit foi feito
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('❌ [UPLOAD] Erro ao criar upload:', error);
      throw new Error(`Erro ao criar registro de upload: ${error.message}`);
    }

    console.log('🔄 [UPLOAD] Processando arquivo:', { uploadId, fileType });
    console.log('📋 [UPLOAD] Upload ID que será usado:', uploadId, typeof uploadId);

    // Processar arquivo
    const periods = await fileProcessingService.processFile(uploadId, req.file.path, fileType);

    console.log('✅ [UPLOAD] Processamento concluído:', { uploadId, periods: periods.length });

    res.json({
      success: true,
      message: 'Arquivo processado com sucesso',
      data: {
        uploadId: uploadId,
        fileName: req.file.originalname,
        fileType: fileType,
        periods: periods.length
      }
    });

  } catch (error) {
    console.error('❌ [UPLOAD] Erro no upload:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no processamento do arquivo',
      error: error.message
    });
  }
});

// GET /api/uploads/:uploadId/periods - Buscar períodos de um upload
router.get('/:uploadId/periods', async (req, res) => {
  try {
    const { uploadId } = req.params;
    
    console.log('🔍 [UPLOAD] Buscando períodos para upload:', uploadId);

    // Buscar períodos no banco de dados
    const periods = await EmploymentPeriod.findByUploadId(uploadId);

    console.log('✅ [UPLOAD] Períodos encontrados:', periods.length);

    res.json({
      success: true,
      data: periods
    });

  } catch (error) {
    console.error('❌ [UPLOAD] Erro ao buscar períodos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar períodos',
      error: error.message
    });
  }
});

// GET /api/uploads - Listar uploads
router.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'Upload routes working',
    data: []
  });
});

module.exports = router;
