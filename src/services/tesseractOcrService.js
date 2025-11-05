const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');
const pdfImageTesseractService = require('./pdfImageTesseractService');
const winston = require('winston');

// Configuração do logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * Serviço de OCR usando Tesseract.js com layout detection
 * Implementado pela Software House Enterprise
 */
class TesseractOcrService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
  }

  /**
   * Inicializar worker do Tesseract
   */
  async initialize() {
    try {
      if (this.isInitialized) return;

      console.log('🔧 [TESSERACT] Inicializando worker...');
      this.worker = await Tesseract.createWorker('por');
      
      // Configurar PSM (Page Segmentation Mode) para documentos INSS
      // PSM 6: Uniform block of text (melhor para documentos estruturados)
      // PSM 11: Sparse text (melhor para textos esparsos)
      await this.worker.setParameters({
        'tessedit_pageseg_mode': '6', // PSM 6 - SINGLE_UNIFORM_BLOCK
        'tessedit_char_whitelist': '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/.-: ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäåçèéêëìíîïñòóôõöùúûüý',
        'preserve_interword_spaces': '1'
      });

      this.isInitialized = true;
      console.log('✅ [TESSERACT] Worker inicializado com sucesso');
      logger.info('Tesseract worker inicializado');
      
    } catch (error) {
      console.error('❌ [TESSERACT] Erro ao inicializar:', error);
      logger.error('Erro ao inicializar Tesseract:', error);
      throw error;
    }
  }

  /**
   * Converter PDF para imagem
   * @param {string} pdfPath - Caminho para o arquivo PDF
   * @param {number} uploadId - ID do upload
   * @returns {Promise<string>} - Caminho da imagem gerada
   */
  async convertPDFToImage(pdfPath, uploadId) {
    try {
      console.log('🔄 [TESSERACT] Usando PDF-Image + Tesseract direto:', pdfPath);
      
      // Usar PDF-Image + Tesseract diretamente
      const extractedText = await pdfImageTesseractService.processPDF(pdfPath, uploadId);
      
      console.log('✅ [TESSERACT] Texto extraído via PDF-Image:', extractedText.length, 'caracteres');
      return extractedText; // Retornar texto ao invés de caminho da imagem
      
    } catch (error) {
      console.error('❌ [TESSERACT] Erro no PDF-Image:', error);
      console.error('📋 [TESSERACT] Detalhes do erro:', error.message);
      throw error;
    }
  }

  /**
   * Processar PDF usando Tesseract OCR
   * @param {string} pdfPath - Caminho para o arquivo PDF
   * @param {number} uploadId - ID do upload
   * @returns {Promise<string>} - Texto extraído
   */
  async processPDF(pdfPath, uploadId) {
    try {
      console.log('📄 [TESSERACT] Iniciando processamento de PDF:', pdfPath);
      
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Verificar se o arquivo existe
      const fileExists = await fs.access(pdfPath).then(() => true).catch(() => false);
      if (!fileExists) {
        throw new Error(`Arquivo PDF não encontrado: ${pdfPath}`);
      }

      // Usar PDF-Image + Tesseract diretamente (já retorna o texto processado)
      const text = await this.convertPDFToImage(pdfPath, uploadId);

      logger.info('OCR Tesseract + PDF-Image concluído:', {
        uploadId,
        pdfPath,
        textLength: text.length
      });

      return text;

    } catch (error) {
      console.error('❌ [TESSERACT] Erro no processamento:', error);
      logger.error('Erro no OCR Tesseract:', {
        uploadId,
        pdfPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Processar com PSM alternativo (PSM 11 - Sparse text)
   * @param {string} pdfPath - Caminho para o arquivo PDF
   * @param {number} uploadId - ID do upload
   * @returns {Promise<string>} - Texto extraído
   */
  async processPDFSparseText(pdfPath, uploadId) {
    try {
      console.log('📄 [TESSERACT] Processando com PSM 11 (Sparse Text):', pdfPath);
      
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Converter PDF para imagem primeiro
      const imagePath = await this.convertPDFToImage(pdfPath, uploadId);

      // Configurar PSM 11 para texto esparso
      await this.worker.setParameters({
        'tessedit_pageseg_mode': '11' // PSM 11 - SPARSE_TEXT
      });

      const { data: { text } } = await this.worker.recognize(imagePath);
      
      // Voltar para PSM 6
      await this.worker.setParameters({
        'tessedit_pageseg_mode': '6' // PSM 6 - SINGLE_UNIFORM_BLOCK
      });

      console.log(`📊 [TESSERACT PSM11] Texto extraído: ${text.length} caracteres`);
      return text;

    } catch (error) {
      console.error('❌ [TESSERACT PSM11] Erro:', error);
      throw error;
    }
  }

  /**
   * Finalizar worker
   */
  async terminate() {
    try {
      if (this.worker) {
        await this.worker.terminate();
        this.worker = null;
        this.isInitialized = false;
        console.log('🔧 [TESSERACT] Worker finalizado');
        logger.info('Tesseract worker finalizado');
      }
    } catch (error) {
      console.error('❌ [TESSERACT] Erro ao finalizar worker:', error);
      logger.error('Erro ao finalizar Tesseract worker:', error);
    }
  }

  /**
   * Processar com múltiplos PSMs e escolher o melhor resultado
   * @param {string} pdfPath - Caminho para o arquivo PDF
   * @param {number} uploadId - ID do upload
   * @returns {Promise<string>} - Melhor texto extraído
   */
  async processPDFMultiPSM(pdfPath, uploadId) {
    try {
      console.log('🔄 [TESSERACT] Processando com múltiplos PSMs...');
      
      // Tentar PSM 6 primeiro
      const textPSM6 = await this.processPDF(pdfPath, uploadId);
      
      // Tentar PSM 11 como alternativa
      const textPSM11 = await this.processPDFSparseText(pdfPath, uploadId);
      
      // Escolher o resultado com mais conteúdo útil
      const score6 = this.scoreText(textPSM6);
      const score11 = this.scoreText(textPSM11);
      
      console.log('📊 [TESSERACT] Scores - PSM6:', score6, 'PSM11:', score11);
      
      const bestText = score6 >= score11 ? textPSM6 : textPSM11;
      const bestPSM = score6 >= score11 ? 'PSM6' : 'PSM11';
      
      console.log(`✅ [TESSERACT] Melhor resultado: ${bestPSM}`);
      
      return bestText;
      
    } catch (error) {
      console.error('❌ [TESSERACT] Erro no processamento multi-PSM:', error);
      throw error;
    }
  }

  /**
   * Calcular score de qualidade do texto extraído
   * @param {string} text - Texto para avaliar
   * @returns {number} - Score de qualidade
   */
  scoreText(text) {
    if (!text) return 0;
    
    let score = 0;
    
    // Pontos por padrões INSS encontrados
    const patterns = [
      /\d{2}\/\d{2}\/\d{4}/g, // Datas
      /\d{2}\s+\d{4}/g, // Códigos de período
      /CTPS|CTP|CTI/g, // Tipos de documento
      /INDUSTRIA|COMERCIO|LTDA|S\.A\./gi, // Padrões de empresa
      /EMPREGADOR/gi // Cabeçalhos
    ];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        score += matches.length;
      }
    });
    
    // Penalizar texto muito curto
    if (text.length < 100) {
      score *= 0.5;
    }
    
    return score;
  }
}

module.exports = new TesseractOcrService();
