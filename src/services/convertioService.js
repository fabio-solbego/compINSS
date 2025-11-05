const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
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
 * Serviço para conversão PDF→Imagem usando API Convertio
 * Implementado pela Software House Enterprise
 */
class ConvertioService {
  constructor() {
    this.apiKey = 'cbc20d69-4efe-460c-b840-f4bcce7100b1';
    this.baseUrl = 'https://api.convertio.co/convert';
  }

  /**
   * Converter PDF para PNG usando API Convertio
   * @param {string} pdfPath - Caminho para o arquivo PDF
   * @param {number} uploadId - ID do upload
   * @returns {Promise<string>} - Caminho da imagem baixada
   */
  async convertPDFToImage(pdfPath, uploadId) {
    try {
      console.log('🔄 [CONVERTIO] Iniciando conversão PDF→PNG em uma etapa:', pdfPath);
      
      const formData = new FormData();
      const fileBuffer = await fs.readFile(pdfPath);
      const fileName = path.basename(pdfPath);
      
      // Fazer upload e conversão em uma única requisição
      formData.append('apikey', this.apiKey);
      formData.append('input', 'upload');
      formData.append('inputformat', 'pdf');
      formData.append('outputformat', 'png');
      formData.append('options[pdf_page]', '1');
      formData.append('options[png_compression]', '0');
      formData.append('options[density]', '300');
      formData.append('file', fileBuffer, {
        filename: fileName,
        contentType: 'application/pdf'
      });
      
      console.log('📤 [CONVERTIO] Enviando para conversão...');
      
      const response = await axios.post(this.baseUrl, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 120000 // 2 minutos
      });
      
      console.log('📋 [CONVERTIO] Resposta:', response.data);
      
      if (response.data.status !== 'ok') {
        throw new Error(`Conversão falhou: ${JSON.stringify(response.data)}`);
      }
      
      const conversionId = response.data.data.id;
      console.log('🔄 [CONVERTIO] ID da conversão:', conversionId);
      
      // Aguardar conclusão
      const finalResult = await this.waitForConversion(conversionId);
      console.log('✅ [CONVERTIO] Conversão concluída');
      
      // Baixar imagem
      const imagePath = await this.downloadImage(finalResult.output.url, uploadId);
      console.log('💾 [CONVERTIO] Imagem baixada:', imagePath);
      
      return imagePath;
      
    } catch (error) {
      console.error('❌ [CONVERTIO] Erro na conversão:', error.message);
      if (error.response) {
        console.error('📋 [CONVERTIO] Resposta de erro:', error.response.data);
      }
      logger.error('Erro no Convertio:', error);
      throw error;
    }
  }

  /**
   * Upload do arquivo PDF para Convertio
   */
  async uploadFile(pdfPath) {
    try {
      console.log('📤 [CONVERTIO] Iniciando upload do arquivo...');
      
      const formData = new FormData();
      const fileBuffer = await fs.readFile(pdfPath);
      const fileName = path.basename(pdfPath);
      
      formData.append('apikey', this.apiKey);
      formData.append('input', 'upload');
      formData.append('inputformat', 'pdf');
      formData.append('outputformat', 'png');
      formData.append('file', fileBuffer, {
        filename: fileName,
        contentType: 'application/pdf'
      });
      
      console.log('📋 [CONVERTIO] Dados do upload:', {
        apikey: this.apiKey.substring(0, 8) + '...',
        filename: fileName,
        fileSize: fileBuffer.length
      });
      
      const response = await axios.post(this.baseUrl, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 60000
      });
      
      console.log('📋 [CONVERTIO] Resposta do upload:', response.data);
      
      if (response.data.status !== 'ok') {
        throw new Error(`Upload falhou: ${JSON.stringify(response.data)}`);
      }
      
      return response.data.data;
      
    } catch (error) {
      console.error('❌ [CONVERTIO] Erro no upload:', error.message);
      if (error.response) {
        console.error('📋 [CONVERTIO] Resposta de erro:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Iniciar conversão PDF→PNG
   */
  async startConversion(fileId, inputFormat, outputFormat) {
    try {
      const response = await axios.post(this.baseUrl, {
        apikey: this.apiKey,
        input: 'raw',
        file: fileId,
        inputformat: inputFormat,
        outputformat: outputFormat,
        options: {
          pdf_page: 1,           // Apenas primeira página
          png_compression: 0,    // Sem compressão para melhor qualidade OCR
          density: 300          // DPI alta para OCR
        }
      }, {
        timeout: 30000
      });
      
      if (response.data.status !== 'ok') {
        throw new Error(`Conversão falhou: ${response.data.error}`);
      }
      
      return response.data.data;
      
    } catch (error) {
      console.error('❌ [CONVERTIO] Erro na conversão:', error.message);
      throw error;
    }
  }

  /**
   * Aguardar conclusão da conversão
   */
  async waitForConversion(conversionId, maxAttempts = 30) {
    try {
      console.log('⏳ [CONVERTIO] Aguardando conversão...');
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const response = await axios.get(`${this.baseUrl}/${conversionId}/status`, {
          params: { apikey: this.apiKey },
          timeout: 10000
        });
        
        const status = response.data.data.step;
        console.log(`🔍 [CONVERTIO] Status (${attempt}/${maxAttempts}):`, status);
        
        if (status === 'finish') {
          return response.data.data;
        }
        
        if (status === 'error') {
          throw new Error(`Conversão falhou: ${response.data.data.error}`);
        }
        
        // Aguardar 2 segundos antes da próxima verificação
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      throw new Error('Timeout: Conversão demorou mais que esperado');
      
    } catch (error) {
      console.error('❌ [CONVERTIO] Erro ao aguardar conversão:', error.message);
      throw error;
    }
  }

  /**
   * Baixar imagem convertida
   */
  async downloadImage(imageUrl, uploadId) {
    try {
      console.log('📥 [CONVERTIO] Baixando imagem:', imageUrl);
      
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 60000
      });
      
      // Criar diretório temp se não existir
      const tempDir = path.join(process.cwd(), 'temp');
      try {
        await fs.mkdir(tempDir, { recursive: true });
      } catch (err) {
        // Diretório já existe
      }
      
      // Salvar imagem
      const imagePath = path.join(tempDir, `convertio_${uploadId}.png`);
      await fs.writeFile(imagePath, response.data);
      
      console.log('✅ [CONVERTIO] Imagem salva:', imagePath);
      return imagePath;
      
    } catch (error) {
      console.error('❌ [CONVERTIO] Erro ao baixar imagem:', error.message);
      throw error;
    }
  }

  /**
   * Limpar arquivos temporários
   */
  async cleanup(imagePath) {
    try {
      if (imagePath && await fs.access(imagePath).then(() => true).catch(() => false)) {
        await fs.unlink(imagePath);
        console.log('🗑️ [CONVERTIO] Arquivo temporário removido:', imagePath);
      }
    } catch (error) {
      console.warn('⚠️ [CONVERTIO] Erro ao limpar arquivo:', error.message);
    }
  }
}

module.exports = new ConvertioService();
