const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const winston = require('winston');
const Upload = require('../models/Upload');
const EmploymentPeriod = require('../models/EmploymentPeriod');
const fileProcessingService = require('../services/fileProcessingService');

const router = express.Router();

// Configuração do logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/upload.log' }),
    new winston.transports.Console()
  ]
});

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${timestamp}_${sanitizedName}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
    'application/vnd.ms-excel': 'excel'
  };
  
  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Use apenas PDF ou Excel.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// POST /api/uploads - Upload de arquivo
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo foi enviado'
      });
    }

    logger.info('Arquivo recebido:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Determinar tipo do arquivo
    const fileType = req.file.mimetype === 'application/pdf' ? 'pdf' : 'excel';

    // 1️⃣ Cria registro do upload no banco PRIMEIRO
    console.log('📤 [UPLOAD] Criando registro do upload no banco...');
    const uploadId = await Upload.create({
      filename: req.file.filename,
      original_name: req.file.originalname,
      type: fileType,
      size_bytes: req.file.size,
      storage_path: req.file.path
    });

    console.log('✅ [UPLOAD] Upload registrado no banco:', { uploadId, fileType });
    logger.info('Upload salvo no banco:', { uploadId, fileType });

    // 2️⃣ Processar arquivo com upload_id já criado
    console.log('🔄 [UPLOAD] Iniciando processamento com upload_id:', uploadId);
    fileProcessingService.processFile(uploadId, req.file.path, fileType)
      .then(() => {
        console.log('✅ [UPLOAD] Processamento concluído:', { uploadId });
        logger.info('Processamento do arquivo concluído:', { uploadId });
      })
      .catch(error => {
        console.error('❌ [UPLOAD] Erro no processamento:', { uploadId, error: error.message });
        logger.error('Erro no processamento do arquivo:', {
          uploadId,
          error: error.message
        });
      });

    res.json({
      success: true,
      message: 'Arquivo enviado com sucesso',
      data: {
        uploadId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        type: fileType,
        size: req.file.size
      }
    });

  } catch (error) {
    logger.error('Erro no upload:', error);
    
    // Limpar arquivo se houver erro
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('Erro ao deletar arquivo:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/uploads - Listar uploads
router.get('/', async (req, res) => {
  try {
    const { type, limit = 50 } = req.query;
    
    let uploads;
    if (type) {
      uploads = await Upload.findByType(type);
    } else {
      uploads = await Upload.findAll(parseInt(limit));
    }

    res.json({
      success: true,
      data: uploads
    });

  } catch (error) {
    logger.error('Erro ao listar uploads:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/uploads/:id - Buscar upload específico
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const upload = await Upload.findById(id);

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload não encontrado'
      });
    }

    res.json({
      success: true,
      data: upload
    });

  } catch (error) {
    logger.error('Erro ao buscar upload:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// DELETE /api/uploads/:id - Deletar upload
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const upload = await Upload.findById(id);

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload não encontrado'
      });
    }

    // Deletar arquivo físico
    try {
      await fs.unlink(upload.storage_path);
      logger.info('Arquivo físico deletado:', upload.storage_path);
    } catch (error) {
      logger.warn('Erro ao deletar arquivo físico:', error.message);
    }

    // Deletar do banco
    const deleted = await Upload.delete(id);
    
    if (deleted) {
      logger.info('Upload deletado:', { id, filename: upload.filename });
      res.json({
        success: true,
        message: 'Upload deletado com sucesso'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar upload'
      });
    }

  } catch (error) {
    logger.error('Erro ao deletar upload:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/uploads/:id/periods - Buscar períodos extraídos
router.get('/:id/periods', async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.info('Buscando períodos do upload:', { uploadId: id });
    
    // Verificar se o upload existe
    const upload = await Upload.findById(id);
    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Upload não encontrado'
      });
    }
    
    // Buscar períodos extraídos
    const periods = await EmploymentPeriod.findByUploadId(id);
    
    logger.info('Períodos encontrados:', { uploadId: id, count: periods.length });
    
    res.json({
      success: true,
      data: periods,
      upload: {
        id: upload.id,
        filename: upload.original_name,
        type: upload.file_type,
        processed_at: upload.processed_at
      }
    });
    
  } catch (error) {
    logger.error('Erro ao buscar períodos do upload:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// Middleware de tratamento de erros do multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Arquivo muito grande. Tamanho máximo: 50MB'
      });
    }
  }
  
  if (error.message.includes('Tipo de arquivo não suportado')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  logger.error('Erro no middleware de upload:', error);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor'
  });
});

module.exports = router;
