const ocrSpaceApi = require('ocr-space-api-wrapper');
const winston = require('winston');
const fs = require('fs').promises;

// Configuração do logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/ocr.log' }),
    new winston.transports.Console()
  ]
});

/**
 * Serviço OCR usando OCR Space API
 */
class OCRService {
  constructor() {
    // API Key do OCR Space (gratuita)
    this.apiKey = process.env.OCR_SPACE_API_KEY || 'helloworld'; // API key gratuita
    this.baseUrl = 'https://api.ocr.space/parse/image';
  }

  /**
   * Extrair texto de PDF usando OCR Space
   */
  async extractTextFromPDF(filePath) {
    try {
      logger.info('Iniciando OCR do PDF:', { filePath });

      // Verificar se o arquivo existe
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      if (!fileExists) {
        throw new Error('Arquivo PDF não encontrado');
      }

      // Configurações do OCR
      const options = {
        apikey: this.apiKey,
        language: 'por', // Português
        isOverlayRequired: false,
        detectOrientation: true,
        isTable: true, // Melhor para extratos com tabelas
        OCREngine: 2, // Engine 2 é melhor para documentos
        scale: true,
        isSearchablePdfHideTextLayer: true
      };

      logger.info('Enviando PDF para OCR Space...', { options });

      // Fazer OCR do PDF
      const result = await ocrSpaceApi.ocrSpace(filePath, options);

      if (!result || !result.ParsedResults) {
        throw new Error('Falha no processamento OCR');
      }

      // Extrair texto de todas as páginas
      let fullText = '';
      let totalPages = 0;

      result.ParsedResults.forEach((page, index) => {
        if (page.ParsedText) {
          fullText += page.ParsedText + '\n\n';
          totalPages++;
          logger.info(`Página ${index + 1} processada:`, { 
            textLength: page.ParsedText.length,
            confidence: page.TextOverlay?.HasOverlay || 'N/A'
          });
        }
      });

      logger.info('OCR concluído:', {
        totalPages,
        totalTextLength: fullText.length,
        isSearchablePdf: result.IsErroredOnProcessing === false
      });

      return {
        text: fullText.trim(),
        pages: totalPages,
        confidence: this.calculateConfidence(result),
        method: 'ocr_space',
        metadata: {
          processingTime: result.ProcessingTimeInMilliseconds,
          ocrEngine: options.OCREngine,
          language: options.language
        }
      };

    } catch (error) {
      logger.error('Erro no OCR Space:', error);
      throw new Error(`Erro no OCR: ${error.message}`);
    }
  }

  /**
   * Calcular confiança do OCR baseado nos resultados
   */
  calculateConfidence(result) {
    if (!result.ParsedResults) return 0;

    let totalConfidence = 0;
    let pageCount = 0;

    result.ParsedResults.forEach(page => {
      if (page.ParsedText && page.ParsedText.length > 0) {
        // Calcular confiança baseada na presença de texto estruturado
        let confidence = 0.5; // Base

        // Aumentar confiança se encontrar padrões típicos de extrato INSS
        if (page.ParsedText.includes('INSS') || page.ParsedText.includes('Previdência')) confidence += 0.2;
        if (page.ParsedText.includes('CPF') || page.ParsedText.includes('NIT')) confidence += 0.1;
        if (/\d{2}\/\d{2}\/\d{4}/.test(page.ParsedText)) confidence += 0.2; // Datas

        totalConfidence += Math.min(confidence, 1.0);
        pageCount++;
      }
    });

    return pageCount > 0 ? totalConfidence / pageCount : 0;
  }

  /**
   * Verificar se OCR Space está disponível
   */
  async isAvailable() {
    try {
      // Teste simples com uma imagem pequena
      const testOptions = {
        apikey: this.apiKey,
        url: 'https://via.placeholder.com/150x50/000000/FFFFFF?text=TEST'
      };

      const result = await ocrSpaceApi.ocrSpace(testOptions.url, testOptions);
      return result && !result.IsErroredOnProcessing;
    } catch (error) {
      logger.warn('OCR Space não disponível:', error.message);
      return false;
    }
  }

  /**
   * Processar PDF com fallback
   */
  async processWithFallback(filePath, traditionalExtractor) {
    try {
      // Tentar OCR primeiro
      logger.info('Tentando OCR Space primeiro...');
      const ocrResult = await this.extractTextFromPDF(filePath);
      
      // Verificar qualidade do resultado
      if (ocrResult.confidence > 0.3 && ocrResult.text.length > 100) {
        logger.info('OCR Space bem-sucedido, usando resultado OCR');
        return ocrResult;
      } else {
        logger.warn('Qualidade do OCR baixa, tentando método tradicional...');
        throw new Error('Qualidade OCR insuficiente');
      }
    } catch (error) {
      logger.warn('OCR Space falhou, usando método tradicional:', error.message);
      
      // Fallback para método tradicional
      try {
        const traditionalResult = await traditionalExtractor(filePath);
        return {
          text: traditionalResult,
          pages: 1,
          confidence: 0.7,
          method: 'traditional_fallback',
          metadata: {
            ocrFailed: true,
            ocrError: error.message
          }
        };
      } catch (fallbackError) {
        logger.error('Ambos os métodos falharam:', fallbackError);
        throw new Error(`OCR e método tradicional falharam: ${fallbackError.message}`);
      }
    }
  }
}

module.exports = new OCRService();
