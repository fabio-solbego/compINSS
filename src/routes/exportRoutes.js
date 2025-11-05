const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const excelExportService = require('../services/excelExportService');

/**
 * POST /api/export/txt-to-excel
 * Converter arquivo TXT em planilha Excel
 */
router.post('/txt-to-excel', async (req, res) => {
  try {
    const { txtFileName, uploadId } = req.body;

    if (!txtFileName || !uploadId) {
      return res.status(400).json({
        success: false,
        message: 'Nome do arquivo TXT e Upload ID são obrigatórios'
      });
    }

    console.log('📊 [EXPORT] Solicitação de exportação:', { txtFileName, uploadId });

    // Caminho do arquivo TXT
    const txtFilePath = path.join(__dirname, '../../txt', txtFileName);

    // Verificar se arquivo existe
    try {
      await fs.access(txtFilePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Arquivo TXT não encontrado'
      });
    }

    // Processar TXT e criar planilha
    const resultado = await excelExportService.processarTxtCompleto(txtFilePath, uploadId);

    console.log('✅ [EXPORT] Planilha criada com sucesso:', resultado);

    res.json({
      success: true,
      message: 'Planilha criada com sucesso',
      data: {
        fileName: resultado.fileName,
        periodos: resultado.periodos,
        downloadUrl: `/api/export/download/${resultado.fileName}`
      }
    });

  } catch (error) {
    console.error('❌ [EXPORT] Erro na exportação:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar planilha',
      error: error.message
    });
  }
});

/**
 * GET /api/export/download/:fileName
 * Download da planilha Excel
 */
router.get('/download/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    const filePath = path.join(__dirname, '../../exports', fileName);

    console.log('📥 [DOWNLOAD] Solicitação de download:', fileName);

    // Verificar se arquivo existe
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Arquivo não encontrado'
      });
    }

    // Configurar headers para download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Enviar arquivo
    res.sendFile(filePath, (error) => {
      if (error) {
        console.error('❌ [DOWNLOAD] Erro no download:', error);
        res.status(500).json({
          success: false,
          message: 'Erro no download do arquivo'
        });
      } else {
        console.log('✅ [DOWNLOAD] Download concluído:', fileName);
      }
    });

  } catch (error) {
    console.error('❌ [DOWNLOAD] Erro no download:', error);
    res.status(500).json({
      success: false,
      message: 'Erro no download',
      error: error.message
    });
  }
});

/**
 * GET /api/export/list-txt
 * Listar arquivos TXT disponíveis
 */
router.get('/list-txt', async (req, res) => {
  try {
    const txtDir = path.join(__dirname, '../../txt');
    const files = await fs.readdir(txtDir);
    
    const txtFiles = files
      .filter(file => file.endsWith('.txt'))
      .map(file => {
        const match = file.match(/ocr_upload_(\d+)_(.+)\.txt/);
        return {
          fileName: file,
          uploadId: match ? match[1] : null,
          timestamp: match ? match[2] : null
        };
      })
      .sort((a, b) => b.timestamp?.localeCompare(a.timestamp) || 0);

    res.json({
      success: true,
      data: txtFiles
    });

  } catch (error) {
    console.error('❌ [EXPORT] Erro ao listar arquivos TXT:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar arquivos TXT',
      error: error.message
    });
  }
});

module.exports = router;
