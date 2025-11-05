const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const winston = require('winston');
const Comparacao = require('../models/Comparacao');
const Upload = require('../models/Upload');
const Log = require('../models/Log');
const { performComparison } = require('../services/comparisonService');
const { generateReport } = require('../services/reportService');

const router = express.Router();

// Configuração do logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/comparison.log' }),
    new winston.transports.Console()
  ]
});

// POST /api/comparacao/comparar - Iniciar comparação
router.post('/comparar', async (req, res) => {
  try {
    console.log('🌐 [COMPARISON] POST /comparar - ROTA CHAMADA!');
    console.log('📋 [COMPARISON] Body recebido:', req.body);
    
    const { excelUploadId, pdfUploadId } = req.body;

    // Validar parâmetros
    if (!excelUploadId || !pdfUploadId) {
      return res.status(400).json({
        success: false,
        message: 'IDs dos uploads (Excel e PDF) são obrigatórios'
      });
    }

    // Verificar se os uploads existem
    const excelUpload = await Upload.findById(excelUploadId);
    const pdfUpload = await Upload.findById(pdfUploadId);

    if (!excelUpload) {
      return res.status(404).json({
        success: false,
        message: 'Upload do Excel não encontrado'
      });
    }

    if (!pdfUpload) {
      return res.status(404).json({
        success: false,
        message: 'Upload do PDF não encontrado'
      });
    }

    // Verificar tipos dos arquivos
    if (excelUpload.type !== 'excel') {
      return res.status(400).json({
        success: false,
        message: 'O primeiro arquivo deve ser do tipo Excel'
      });
    }

    if (pdfUpload.type !== 'pdf') {
      return res.status(400).json({
        success: false,
        message: 'O segundo arquivo deve ser do tipo PDF'
      });
    }

    // Criar registro de comparação na tabela comparacao
    console.log('💾 [COMPARISON] Criando registro na tabela comparacao...');
    const comparisonId = await Comparacao.create({
      upload_excel_id: excelUploadId,
      upload_pdf_id: pdfUploadId,
      status: 'pending'
    });
    
    console.log('✅ [COMPARISON] Comparação criada:', { comparisonId, excelUploadId, pdfUploadId });

    logger.info('Comparação iniciada:', {
      comparisonId,
      excelUploadId,
      pdfUploadId
    });

    // Log inicial
    // await Log.info('Comparação iniciada', {
    //   excel_file: excelUpload.original_name,
    //   pdf_file: pdfUpload.original_name
    // }, comparisonId);

    // Executar comparação em background
    performComparison(comparisonId, excelUpload, pdfUpload)
      .then(async (result) => {
        logger.info('Comparação concluída:', { comparisonId, result });
        // await Log.info('Comparação concluída com sucesso', result, comparisonId);
      })
      .catch(async (error) => {
        logger.error('Erro na comparação:', { comparisonId, error: error.message });
        // await Log.error('Erro na comparação', { error: error.message }, comparisonId);
        
        // Atualizar status para erro
        const comparison = await Comparacao.findById(comparisonId);
        if (comparison) {
          await comparison.updateStatus('error', error.message);
        }
      });

    res.json({
      success: true,
      message: 'Comparação iniciada com sucesso',
      data: {
        comparisonId,
        status: 'pending'
      }
    });

  } catch (error) {
    logger.error('Erro ao iniciar comparação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// DELETE /api/comparacao/clear-history - Limpar histórico de comparações
router.delete('/clear-history', async (req, res) => {
  try {
    console.log('🗑️ [COMPARISON] Iniciando limpeza do histórico...');
    
    const { executeQuery } = require('../../config/database');
    
    // Contar comparações antes da limpeza
    const [countResult] = await executeQuery('SELECT COUNT(*) as total FROM comparacao');
    const totalBefore = countResult.total;
    
    console.log(`📊 [COMPARISON] Total de comparações a serem removidas: ${totalBefore}`);
    
    // Limpar tabela de comparações (CASCADE irá limpar logs relacionados automaticamente)
    await executeQuery('DELETE FROM comparacao');
    
    // Reset do AUTO_INCREMENT para começar do 1 novamente
    await executeQuery('ALTER TABLE comparacao AUTO_INCREMENT = 1');
    
    console.log('✅ [COMPARISON] Histórico limpo com sucesso');
    
    res.json({
      success: true,
      message: 'Histórico de comparações limpo com sucesso',
      data: {
        removed_comparisons: totalBefore,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ [COMPARISON] Erro ao limpar histórico:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao limpar histórico de comparações',
      error: error.message
    });
  }
});

// GET /api/comparacao/all - Listar TODAS as comparações
router.get('/all', async (req, res) => {
  try {
    console.log('📊 [COMPARISON] GET /all - Listando todas as comparações...');
    
    const { executeQuery } = require('../../config/database');
    const comparisons = await executeQuery(`
      SELECT c.id, c.upload_pdf_id, c.upload_excel_id, c.status, c.resultado, c.error_message, c.created_at,
             up.original_name as pdf_name,
             ue.original_name as excel_name
      FROM comparacao c
      JOIN uploads up ON c.upload_pdf_id = up.id
      JOIN uploads ue ON c.upload_excel_id = ue.id
      ORDER BY c.created_at DESC
    `);
    
    console.log(`📊 [COMPARISON] ${comparisons.length} comparações encontradas`);
    
    res.json({
      success: true,
      data: comparisons,
      total: comparisons.length
    });
    
  } catch (error) {
    logger.error('Erro ao listar comparações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/comparacao/check-uploads - Verificar status dos uploads
router.get('/check-uploads', async (req, res) => {
  try {
    console.log('🔍 [COMPARISON] Verificando status dos uploads...');
    
    const { executeQuery } = require('../../config/database');
    
    // Buscar uploads mais recentes
    const uploads = await executeQuery(`
      SELECT u.id, u.type, u.original_name, u.created_at,
             COUNT(ep.id) as periods_count
      FROM uploads u
      LEFT JOIN employment_periods ep ON u.id = ep.upload_id
      GROUP BY u.id, u.type, u.original_name, u.created_at
      ORDER BY u.created_at DESC
      LIMIT 10
    `);
    
    const pdfUploads = uploads.filter(u => u.type === 'pdf' && u.periods_count > 0);
    const excelUploads = uploads.filter(u => u.type === 'excel' && u.periods_count > 0);
    
    const readyForComparison = pdfUploads.length > 0 && excelUploads.length > 0;
    
    console.log(`📊 [COMPARISON] PDFs com dados: ${pdfUploads.length}, Excels com dados: ${excelUploads.length}`);
    console.log(`🎯 [COMPARISON] Pronto para comparação: ${readyForComparison}`);
    
    res.json({
      success: true,
      ready_for_comparison: readyForComparison,
      pdf_uploads: pdfUploads.length,
      excel_uploads: excelUploads.length,
      latest_pdf: pdfUploads[0] || null,
      latest_excel: excelUploads[0] || null
    });
    
  } catch (error) {
    console.error('❌ [COMPARISON] Erro ao verificar uploads:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar status dos uploads',
      error: error.message
    });
  }
});

// GET /api/comparacao/:uploadId/status - Consultar status da comparação
router.get('/:uploadId/status', async (req, res) => {
  try {
    console.log('🌐 [COMPARISON] GET /:uploadId/status - Body:', req.body);
    const { uploadId } = req.params;
    
    console.log('🔍 [COMPARISON] Buscando status da comparação:', uploadId);
    
    // Verificar se é ID de comparação ou upload
    const { executeQuery } = require('../../config/database');
    let comparisons;
    
    // Primeiro tentar buscar por ID de comparação diretamente
    comparisons = await executeQuery(`
      SELECT id, upload_pdf_id, upload_excel_id, status, resultado, error_message, created_at
      FROM comparacao 
      WHERE id = ?
    `, [uploadId]);
    
    // Se não encontrou, buscar por upload ID
    if (comparisons.length === 0) {
      console.log('🔄 [COMPARISON] Buscando por upload ID:', uploadId);
      comparisons = await executeQuery(`
        SELECT id, upload_pdf_id, upload_excel_id, status, resultado, error_message, created_at
        FROM comparacao 
        WHERE upload_pdf_id = ? OR upload_excel_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `, [uploadId, uploadId]);
    }
    
    if (!comparisons || comparisons.length === 0) {
      console.log('⚠️ [COMPARISON] Nenhuma comparação encontrada para upload:', uploadId);
      return res.json({
        status: 'pending',
        message: 'Nenhuma comparação encontrada. Faça upload de arquivos PDF e Excel.'
      });
    }
    
    const comparison = comparisons[0];
    console.log('📊 [COMPARISON] Comparação encontrada:', { 
      id: comparison.id, 
      status: comparison.status,
      uploadPdf: comparison.upload_pdf_id,
      uploadExcel: comparison.upload_excel_id
    });
    
    // Retornar status e resultado se disponível
    const response = {
      status: comparison.status,
      message: comparison.status === 'done' ? 'Comparação concluída' : 
               comparison.status === 'error' ? comparison.error_message : 
               'Aguardando conclusão da análise...'
    };
    
    if (comparison.status === 'done' && comparison.resultado) {
      try {
        response.resultado = JSON.parse(comparison.resultado);
        console.log('✅ [COMPARISON] Resultado parseado com sucesso');
      } catch (error) {
        console.error('❌ [COMPARISON] Erro ao parsear resultado:', error);
        response.status = 'error';
        response.message = 'Erro ao processar resultado';
      }
    }
    
    res.json(response);
    
  } catch (error) {
    logger.error('Erro ao consultar status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/comparacao/:id/download - Download do relatório
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'json' } = req.query;
    
    const comparison = await Comparison.findById(id);

    if (!comparison) {
      return res.status(404).json({
        success: false,
        message: 'Comparação não encontrada'
      });
    }

    if (comparison.status !== 'done') {
      return res.status(400).json({
        success: false,
        message: 'Comparação ainda não foi concluída'
      });
    }

    // Gerar relatório no formato solicitado
    const reportData = await generateReport(comparison, format);
    
    if (format === 'json') {
      res.json({
        success: true,
        data: reportData
      });
    } else {
      // Para outros formatos (CSV, Excel), retornar arquivo
      const filename = `relatorio_comparacao_${id}.${format}`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
      } else if (format === 'excel') {
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      }
      
      res.send(reportData);
    }

  } catch (error) {
    logger.error('Erro ao gerar relatório:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/comparacao/:id/logs - Consultar logs da comparação (DESABILITADO)
router.get('/:id/logs', async (req, res) => {
  // Sistema de logs temporariamente desabilitado
  res.json({
    success: true,
    data: [],
    message: 'Sistema de logs temporariamente desabilitado'
  });
});

// GET /api/comparacao/auto-start - Iniciar comparação automaticamente
router.get('/auto-start', async (req, res) => {
  try {
    console.log('🚀 [COMPARISON] AUTO-START - Verificando se há uploads para comparar...');
    
    // Buscar uploads mais recentes
    const { executeQuery } = require('../../config/database');
    const uploads = await executeQuery(`
      SELECT id, type, original_name, created_at
      FROM uploads 
      ORDER BY id DESC 
      LIMIT 6
    `);
    
    console.log('🔍 [COMPARISON] Uploads encontrados:', uploads.length);
    
    if (uploads.length === 0) {
      console.log('⚠️ [COMPARISON] Nenhum upload encontrado');
      return res.json({
        success: false,
        message: 'Nenhum upload encontrado. Faça upload de arquivos PDF e Excel primeiro.'
      });
    }
    
    const pdfUpload = uploads.find(u => u.type === 'pdf');
    const excelUpload = uploads.find(u => u.type === 'excel');
    
    if (!pdfUpload || !excelUpload) {
      console.log('⚠️ [COMPARISON] Uploads incompletos:', {
        pdf: !!pdfUpload,
        excel: !!excelUpload,
        total: uploads.length
      });
      return res.json({
        success: false,
        message: 'É necessário ter pelo menos um arquivo PDF e um Excel para comparar.'
      });
    }
    
    // Verificar se os uploads têm períodos extraídos
    const [pdfPeriods] = await executeQuery(`
      SELECT COUNT(*) as count FROM employment_periods WHERE upload_id = ?
    `, [pdfUpload.id]);
    
    const [excelPeriods] = await executeQuery(`
      SELECT COUNT(*) as count FROM employment_periods WHERE upload_id = ?
    `, [excelUpload.id]);
    
    if (pdfPeriods.count === 0 || excelPeriods.count === 0) {
      console.log('⚠️ [COMPARISON] Uploads sem períodos extraídos:', {
        pdfPeriods: pdfPeriods.count,
        excelPeriods: excelPeriods.count
      });
      return res.json({
        success: false,
        message: 'Os arquivos ainda estão sendo processados. Aguarde a extração dos períodos.'
      });
    }
    
    console.log('📊 [COMPARISON] Uploads encontrados:', {
      pdf: { id: pdfUpload.id, name: pdfUpload.original_name },
      excel: { id: excelUpload.id, name: excelUpload.original_name }
    });
    
    // Verificar se já existe comparação
    const existing = await executeQuery(`
      SELECT id FROM comparacao 
      WHERE upload_pdf_id = ? AND upload_excel_id = ?
    `, [pdfUpload.id, excelUpload.id]);
    
    if (existing.length > 0) {
      console.log('⚠️ [COMPARISON] Comparação já existe:', existing[0].id);
      return res.json({
        success: true,
        message: 'Comparação já existe',
        data: { comparisonId: existing[0].id, status: 'exists' }
      });
    }
    
    // Criar comparação
    const comparisonId = await Comparacao.create({
      upload_excel_id: excelUpload.id,
      upload_pdf_id: pdfUpload.id,
      status: 'pending'
    });
    
    console.log('✅ [COMPARISON] Comparação AUTO criada:', { comparisonId });
    
    // Executar comparação
    performComparison(comparisonId, excelUpload, pdfUpload)
      .then(async (result) => {
        console.log('✅ [COMPARISON] AUTO comparação concluída:', { comparisonId });
      })
      .catch(async (error) => {
        console.error('❌ [COMPARISON] AUTO erro:', { comparisonId, error: error.message });
      });
    
    res.json({
      success: true,
      message: 'Comparação automática iniciada',
      data: { comparisonId, status: 'pending' }
    });
    
  } catch (error) {
    console.error('❌ [COMPARISON] Erro no auto-start:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/comparacao - Listar comparações
router.get('/', async (req, res) => {
  try {
    console.log('🌐 [COMPARISON] GET / - Body:', req.body);
    const { status, limit = 50 } = req.query;
    
    let comparisons;
    if (status) {
      comparisons = await Comparacao.findByStatus(status);
    } else {
      comparisons = await Comparacao.findAll(parseInt(limit));
    }

    res.json({
      success: true,
      data: comparisons.slice(0, parseInt(limit))
    });

  } catch (error) {
    logger.error('Erro ao listar comparações:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// GET /api/comparacao/:id - Buscar comparação específica
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const comparison = await Comparacao.findById(id);

    if (!comparison) {
      return res.status(404).json({
        success: false,
        message: 'Comparação não encontrada'
      });
    }

    res.json({
      success: true,
      data: comparison
    });

  } catch (error) {
    logger.error('Erro ao buscar comparação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// DELETE /api/comparacao/:id - Deletar comparação
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const comparison = await Comparacao.findById(id);

    if (!comparison) {
      return res.status(404).json({
        success: false,
        message: 'Comparação não encontrada'
      });
    }

    // Deletar arquivo de relatório se existir
    if (comparison.detailed_report_path) {
      try {
        await fs.unlink(comparison.detailed_report_path);
        logger.info('Arquivo de relatório deletado:', comparison.detailed_report_path);
      } catch (error) {
        logger.warn('Erro ao deletar arquivo de relatório:', error.message);
      }
    }

    // Deletar logs relacionados
    await Log.deleteByComparisonId(id);

    // Deletar comparação
    const deleted = await Comparacao.delete(id);
    
    if (deleted) {
      logger.info('Comparação deletada:', { id });
      res.json({
        success: true,
        message: 'Comparação deletada com sucesso'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erro ao deletar comparação'
      });
    }

  } catch (error) {
    logger.error('Erro ao deletar comparação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
});

// DELETE /api/comparacao/:id - Deletar comparação específica
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ [COMPARISON] Deletando comparação ${id}...`);
    
    const { executeQuery } = require('../../config/database');
    
    // Verificar se a comparação existe
    const [comparison] = await executeQuery('SELECT id FROM comparacao WHERE id = ?', [id]);
    
    if (!comparison) {
      return res.status(404).json({
        success: false,
        message: 'Comparação não encontrada'
      });
    }
    
    // Deletar a comparação (CASCADE irá deletar logs relacionados)
    await executeQuery('DELETE FROM comparacao WHERE id = ?', [id]);
    
    console.log(`✅ [COMPARISON] Comparação ${id} deletada com sucesso`);
    
    res.json({
      success: true,
      message: `Comparação ${id} deletada com sucesso`,
      data: {
        deleted_id: parseInt(id),
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error(`❌ [COMPARISON] Erro ao deletar comparação ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: 'Erro ao deletar comparação',
      error: error.message
    });
  }
});

// GET /api/comparacao/:id/details - Detalhes de uma comparação específica
router.get('/:id/details', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [COMPARISON] GET /${id}/details - Buscando detalhes...`);
    
    const { executeQuery } = require('../../config/database');
    const comparisons = await executeQuery(`
      SELECT c.*, up.original_name as pdf_name, ue.original_name as excel_name
      FROM comparacao c
      JOIN uploads up ON c.upload_pdf_id = up.id
      JOIN uploads ue ON c.upload_excel_id = ue.id
      WHERE c.id = ?
    `, [id]);
    
    if (comparisons.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comparação não encontrada'
      });
    }
    
    const comparison = comparisons[0];
    
    // Parse do resultado se disponível
    if (comparison.resultado) {
      try {
        comparison.resultado = JSON.parse(comparison.resultado);
      } catch (error) {
        console.error('Erro ao parsear resultado:', error);
      }
    }
    
    res.json({
      success: true,
      data: comparison
    });
    
  } catch (error) {
    logger.error('Erro ao buscar detalhes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
