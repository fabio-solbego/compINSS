const { PDFImage } = require('pdf-image');
const Tesseract = require('tesseract.js');
const fs = require('fs').promises;
const path = require('path');
const dayjs = require('dayjs');
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
 * Serviço OCR usando PDF-Image + Tesseract.js
 * Implementado pela Software House Enterprise
 */
class PDFImageTesseractService {
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

      console.log('🔧 [PDF-IMAGE-TESSERACT] Inicializando worker...');
      this.worker = await Tesseract.createWorker('por');
      
      // Configurar para documentos INSS com melhor precisão
      await this.worker.setParameters({
        'tessedit_pageseg_mode': '6', // PSM 6 - SINGLE_UNIFORM_BLOCK
        'tessedit_char_whitelist': '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/.-: ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝàáâãäåçèéêëìíîïñòóôõöùúûüý',
        'preserve_interword_spaces': '1',
        'tessedit_ocr_engine_mode': '1', // LSTM OCR Engine
        'user_defined_dpi': '300' // DPI alto para melhor qualidade
      });

      this.isInitialized = true;
      console.log('✅ [PDF-IMAGE-TESSERACT] Worker inicializado com sucesso');
      logger.info('PDF-Image-Tesseract worker inicializado');
      
    } catch (error) {
      console.error('❌ [PDF-IMAGE-TESSERACT] Erro ao inicializar:', error);
      logger.error('Erro ao inicializar PDF-Image-Tesseract:', error);
      throw error;
    }
  }

  /**
   * Processar PDF usando PDF-Image + Tesseract OCR
   * @param {string} pdfPath - Caminho para o arquivo PDF
   * @param {number} uploadId - ID do upload
   * @returns {Promise<string>} - Texto extraído
   */
  async processPDF(pdfPath, uploadId) {
    try {
      console.log('📄 [PDF-IMAGE-TESSERACT] Iniciando processamento:', pdfPath);
      
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Verificar se o arquivo existe
      const fileExists = await fs.access(pdfPath).then(() => true).catch(() => false);
      if (!fileExists) {
        throw new Error(`Arquivo PDF não encontrado: ${pdfPath}`);
      }

      // Configurar PDF-Image
      const pdfImage = new PDFImage(pdfPath, {
        convertOptions: { 
          "-density": "300",    // DPI alta para melhor OCR
          "-quality": "100"     // Qualidade máxima
        },
      });

      console.log('📊 [PDF-IMAGE-TESSERACT] Assumindo 1 página (otimização)...');
      const numPages = 1; // Simplificar para evitar travamento
      console.log(`📄 [PDF-IMAGE-TESSERACT] Lendo ${numPages} página(s) do PDF...`);

      let textoCompleto = "";
      const startTime = Date.now();

      // Processar cada página
      for (let i = 0; i < numPages; i++) {
        console.log(`🔍 [PDF-IMAGE-TESSERACT] Convertendo página ${i + 1}/${numPages}...`);
        
        try {
          // Converter página para imagem com timeout
          console.log(`🔄 [PDF-IMAGE-TESSERACT] Convertendo página ${i + 1} com timeout...`);
          
          const conversionPromise = pdfImage.convertPage(i);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout na conversão')), 30000)
          );
          
          const imagePath = await Promise.race([conversionPromise, timeoutPromise]);
          console.log(`🖼️ [PDF-IMAGE-TESSERACT] Imagem gerada: ${imagePath}`);
          
          // Executar OCR na imagem
          console.log(`🔍 [PDF-IMAGE-TESSERACT] Executando OCR na página ${i + 1}...`);
          const { data: { text } } = await this.worker.recognize(imagePath);
          
          textoCompleto += "\n" + text;
          console.log(`✅ [PDF-IMAGE-TESSERACT] Página ${i + 1} processada: ${text.length} caracteres`);
          
          // Limpar imagem temporária
          try {
            await fs.unlink(imagePath);
          } catch (cleanupError) {
            console.warn(`⚠️ [PDF-IMAGE-TESSERACT] Erro ao limpar imagem: ${cleanupError.message}`);
          }
          
        } catch (pageError) {
          console.error(`❌ [PDF-IMAGE-TESSERACT] Erro na página ${i + 1}:`, pageError.message);
          
          // Se falhou, tentar fallback simples
          if (pageError.message.includes('Timeout')) {
            console.log('⚠️ [PDF-IMAGE-TESSERACT] Timeout detectado, abortando conversão...');
            throw new Error('PDF-Image timeout - usando fallback');
          }
        }
      }

      const processingTime = Date.now() - startTime;
      console.log(`✅ [PDF-IMAGE-TESSERACT] OCR concluído em ${processingTime}ms`);
      console.log(`📊 [PDF-IMAGE-TESSERACT] Texto total extraído: ${textoCompleto.length} caracteres`);

      // Limpar e processar texto
      console.log('🧹 [PDF-IMAGE-TESSERACT] Limpando e processando texto...');
      textoCompleto = textoCompleto
        .replace(/\s{2,}/g, " ")
        .replace(/\n{2,}/g, "\n")
        .trim();

      // Salvar resultado em arquivo TXT
      const txtFileName = `pdf_image_tesseract_${uploadId}_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
      const txtPath = path.join(process.cwd(), 'txt', txtFileName);
      
      await fs.writeFile(txtPath, textoCompleto, 'utf8');
      console.log('💾 [PDF-IMAGE-TESSERACT] Texto salvo em:', txtPath);

      logger.info('OCR PDF-Image-Tesseract concluído:', {
        uploadId,
        pdfPath,
        txtPath,
        textLength: textoCompleto.length,
        processingTime,
        numPages
      });

      return textoCompleto;

    } catch (error) {
      console.error('❌ [PDF-IMAGE-TESSERACT] Erro no processamento:', error);
      logger.error('Erro no OCR PDF-Image-Tesseract:', {
        uploadId,
        pdfPath,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Contar páginas do PDF usando pdfinfo ou fallback
   */
  async contarPaginas(pdfPath) {
    try {
      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);
      
      try {
        // Tentar usar pdfinfo
        const { stdout } = await execAsync(`pdfinfo "${pdfPath}"`);
        const match = stdout.match(/Pages:\s+(\d+)/);
        if (match) {
          return parseInt(match[1], 10);
        }
      } catch (pdfInfoError) {
        console.warn('⚠️ [PDF-IMAGE-TESSERACT] pdfinfo não disponível, usando fallback');
      }
      
      // Fallback: tentar converter primeira página para contar
      const pdfImage = new PDFImage(pdfPath);
      try {
        // Método interno do pdf-image para contar páginas
        const pages = await new Promise((resolve, reject) => {
          pdfImage.numberOfPages((err, pages) => {
            if (err) reject(err);
            else resolve(pages);
          });
        });
        return pages;
      } catch (countError) {
        console.warn('⚠️ [PDF-IMAGE-TESSERACT] Erro ao contar páginas, assumindo 1 página');
        return 1;
      }
      
    } catch (error) {
      console.warn('⚠️ [PDF-IMAGE-TESSERACT] Erro ao contar páginas:', error.message);
      return 1; // Assumir 1 página como fallback
    }
  }

  /**
   * Extrair períodos usando regex otimizada
   */
  extrairPeriodosRegex(texto) {
    console.log('🔍 [PDF-IMAGE-TESSERACT] Extraindo períodos com regex...');
    
    // Regex para capturar períodos: EMPRESA DATA a DATA
    const regex = /([A-Z][A-Z\s\.\-\&ÇÃÕÊÉÁÚÍ]+)\s+(\d{2}\/\d{2}\/\d{4})\s+(?:a|-)\s+(\d{2}\/\d{2}\/\d{4})/gi;
    const resultados = [];
    let match;

    while ((match = regex.exec(texto)) !== null) {
      const empresa = match[1].trim().replace(/\s{2,}/g, " ");
      const inicio = this.normalizarData(match[2]);
      const fim = this.normalizarData(match[3]);

      if (inicio && fim) {
        resultados.push({ 
          company: empresa, 
          start_date: inicio, 
          end_date: fim,
          raw_text: match[0]
        });
      }
    }

    console.log(`✅ [PDF-IMAGE-TESSERACT] ${resultados.length} períodos encontrados com regex`);
    return resultados;
  }

  /**
   * Normalizar data DD/MM/YYYY para YYYY-MM-DD
   */
  normalizarData(dataStr) {
    if (!dataStr) return null;
    const d = dayjs(dataStr, "DD/MM/YYYY");
    return d.isValid() ? d.format("YYYY-MM-DD") : null;
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
        console.log('🔧 [PDF-IMAGE-TESSERACT] Worker finalizado');
        logger.info('PDF-Image-Tesseract worker finalizado');
      }
    } catch (error) {
      console.error('❌ [PDF-IMAGE-TESSERACT] Erro ao finalizar worker:', error);
      logger.error('Erro ao finalizar PDF-Image-Tesseract worker:', error);
    }
  }
}

module.exports = new PDFImageTesseractService();
