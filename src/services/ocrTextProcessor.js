const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');
const dayjs = require('dayjs');

// Configuração do logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/ocr-text-processor.log' }),
    new winston.transports.Console()
  ]
});

/**
 * Processador de texto OCR usando as regex do teste2.py
 */
class OCRTextProcessor {
  constructor() {
    this.tempDir = path.join(__dirname, '../../txt');
    this.ensureTempDir();
  }

  /**
   * Garantir que o diretório temporário existe
   */
  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.warn('Erro ao criar diretório temporário:', error.message);
    }
  }

  /**
   * Salvar texto OCR em arquivo temporário e processar
   */
  async processOCRText(ocrText, uploadId) {
    try {
      logger.info('Processando texto OCR:', { uploadId, textLength: ocrText.length });

      // Criar arquivo para análise
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const tempFileName = `ocr_upload_${uploadId}_${timestamp}.txt`;
      const tempFilePath = path.join(this.tempDir, tempFileName);

      // Criar cabeçalho informativo
      const header = `=== TEXTO EXTRAÍDO VIA OCR SPACE ===
Upload ID: ${uploadId}
Data/Hora: ${new Date().toLocaleString('pt-BR')}
Tamanho do texto: ${ocrText.length} caracteres
API Key: ${process.env.OCR_SPACE_API_KEY}
========================================

`;

      // Salvar texto com cabeçalho no arquivo
      const fullContent = header + ocrText;
      await fs.writeFile(tempFilePath, fullContent, 'utf-8');
      logger.info('Texto OCR salvo para análise:', { 
        tempFilePath, 
        totalSize: fullContent.length,
        originalSize: ocrText.length 
      });

      // Processar arquivo com regex do teste2.py
      const periodos = await this.extrairPeriodosINSS(tempFilePath);

      // MANTER arquivo para análise (não remover)
      logger.info('Arquivo TXT mantido para análise:', { 
        tempFilePath,
        uploadId,
        periodosEncontrados: periodos.length 
      });

      return periodos;

    } catch (error) {
      logger.error('Erro no processamento OCR:', error);
      throw new Error(`Erro no processamento OCR: ${error.message}`);
    }
  }

  /**
   * Extrair períodos INSS usando algoritmo otimizado
   */
  async extrairPeriodosINSS(tempFilePath) {
    try {
      console.log('🔍 [DEBUG] Iniciando leitura do arquivo TXT:', tempFilePath);
      
      // Ler arquivo temporário
      let text = await fs.readFile(tempFilePath, 'utf-8');
      console.log('📄 [DEBUG] Arquivo lido com sucesso:', {
        tamanhoTotal: text.length,
        primeiras100Chars: text.substring(0, 100)
      });
      
      // Usar algoritmo otimizado
      const periodosOtimizados = await this.extrairPeriodosOCR(text);
      
      // Converter para formato esperado pelo sistema
      const periodos = periodosOtimizados.map(p => ({
        company: p.empregador,
        role: p.tipo,
        start_date: this.parseDate(p.inicio),
        end_date: this.parseDate(p.fim),
        raw_text: `${p.empregador} - ${p.tipo} (${p.inicio} a ${p.fim})`,
        normalized: {
          company_normalized: this.normalizeCompanyName(p.empregador),
          role_normalized: p.tipo.trim(),
          start_date_parsed: this.parseDate(p.inicio),
          end_date_parsed: this.parseDate(p.fim),
          duration_days: this.calculateDuration(p.inicio, p.fim),
          source_format: 'ocr_algoritmo_otimizado',
          tipo_documento: p.tipo,
          data_inicio_original: p.inicio,
          data_fim_original: p.fim
        }
      }));

      console.log('🏁 [DEBUG] EXTRAÇÃO CONCLUÍDA COM ALGORITMO OTIMIZADO!', {
        periodosEncontrados: periodos.length,
        arquivoOriginal: tempFilePath
      });
      
      // Resumo dos períodos
      if (periodos.length > 0) {
        console.log('📊 [DEBUG] RESUMO DOS PERÍODOS OTIMIZADOS:');
        periodos.forEach((periodo, index) => {
          console.log(`   ${index + 1}. ${periodo.company} (${periodo.normalized.data_inicio_original} - ${periodo.normalized.data_fim_original}) - ${periodo.role}`);
        });
      } else {
        console.log('⚠️ [DEBUG] NENHUM PERÍODO VÁLIDO ENCONTRADO!');
      }
      
      logger.info('Extração de períodos concluída com algoritmo otimizado:', { 
        totalPeriodos: periodos.length,
        algoritmo: 'otimizado_corte_texto + regex_melhorada + tipos_validos + filtro_temporal + remove_duplicados'
      });
      return periodos;

    } catch (error) {
      logger.error('Erro na extração de períodos:', error);
      throw error;
    }
  }

  /**
   * Algoritmo otimizado para extrair períodos do OCR
   */
  async extrairPeriodosOCR(text) {
    console.log('🚀 [OTIMIZADO] Iniciando algoritmo otimizado...');
    
    // 1️⃣ Pega só o bloco "PERIODOS DOS DOCUMENTOS" (não o último)
    console.log('✂️ [OTIMIZADO] Buscando seção "PERIODOS DOS DOCUMENTOS"...');
    const periodosIndex = text.indexOf("PERIODOS\tDOS\tDOCUMENTOS") || text.indexOf("PERIODOS DOS DOCUMENTOS");
    const relevantText = periodosIndex !== -1 ? text.slice(periodosIndex) : text;
    const lines = relevantText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    
    console.log('📊 [OTIMIZADO] Texto processado:', {
      textoOriginal: text.length,
      textoRelevante: relevantText.length,
      linhas: lines.length,
      cortado: periodosIndex !== -1 ? `${periodosIndex} caracteres removidos` : 'nenhum corte'
    });

    // 2️⃣ Regex ULTRA-ABRANGENTE para capturar TODOS os períodos válidos
    const regexPeriodo = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4}).*?([A-Z][A-Z0-9\s\.\-\/]{3,})/g;
    const periodos = [];

    console.log('🔍 [OTIMIZADO] Processando linhas com regex melhorada...');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match;

      while ((match = regexPeriodo.exec(line)) !== null) {
        const inicio = match[1];
        const fim = match[2];
        let empregador = match[3].replace(/\s{2,}/g, " ").trim();

        // 🔧 CORREÇÃO: Verificar se nome da empresa continua na próxima linha
        if (i + 1 < lines.length) {
          const proximaLinha = lines[i + 1].trim();
          
          // Se a próxima linha parece ser continuação do nome (não tem números, não é tipo)
          if (proximaLinha.length > 0 && 
              !proximaLinha.match(/^\d/) && 
              !proximaLinha.includes('Tipo de documento') &&
              !proximaLinha.includes('00 ') &&
              proximaLinha.length < 50 &&
              /^[A-Z\s\.\-&]+$/.test(proximaLinha)) {
            
            empregador += ' ' + proximaLinha;
            console.log('📝 [OTIMIZADO] Nome da empresa continuado:', empregador);
          }
        }

        console.log(`🎉 [OTIMIZADO] MATCH encontrado na linha ${i + 1}:`, {
          inicio, fim, empregador
        });

        // 3️⃣ Busca tipo de documento nas próximas 5 linhas (melhorada)
        const lookahead = lines.slice(i, i + 5).join(" ");
        let tipoMatch = lookahead.match(/Tipo de documento:\s*([A-Z]+)/i);
        
        // Buscar variações do tipo
        if (!tipoMatch) {
          tipoMatch = lookahead.match(/[Tt]ipo de documento:\s*([A-Z]+)/i) ||
                     lookahead.match(/ipo de documento:\s*([A-Z]+)/i) ||
                     lookahead.match(/tipo de documento:\s*([A-Z]+)/i);
        }
        
        let tipo = tipoMatch ? tipoMatch[1].trim().toUpperCase() : null;

        console.log('🔎 [OTIMIZADO] Tipo de documento:', tipo);

        const tiposValidos = ["CTPS", "ATVESP", "AIVESP", "CTI", "CTP", "CTP."];
        if (tipo && !tiposValidos.includes(tipo)) {
          console.log('❌ [OTIMIZADO] Tipo inválido rejeitado:', tipo);
          continue;
        }
        
        // Aceitar períodos SEM tipo também (muitos períodos válidos não têm tipo explícito)
        if (!tipo) {
          console.log('⚠️ [OTIMIZADO] Período sem tipo - assumindo CTPS:', empregador);
          tipo = 'CTPS';
        }

        // 4️⃣ Filtros específicos - APENAS rejeitar seguro desemprego
        const empregadorLimpo = empregador.toUpperCase().trim();
        
        // Rejeitar apenas seguro desemprego
        if (empregadorLimpo.includes('SEG. DESEMP') || 
            empregadorLimpo.includes('SEGDESEMP') ||
            empregadorLimpo.includes('FORMAL REQ') ||
            tipo === 'SEGDESEMP') {
          console.log('❌ [OTIMIZADO] Seguro desemprego rejeitado:', empregador);
          continue;
        }

        // 5️⃣ Filtro temporal mais flexível (aceitar períodos desde 1980)
        const anoInicio = dayjs(inicio, "DD/MM/YYYY").year();
        if (anoInicio < 1980 || anoInicio > 2030) {
          console.log('❌ [OTIMIZADO] Período com ano inválido rejeitado:', anoInicio);
          continue;
        }

        // 6️⃣ Validar datas básicas
        const dataInicio = dayjs(inicio, "DD/MM/YYYY");
        const dataFim = dayjs(fim, "DD/MM/YYYY");
        
        if (!dataInicio.isValid() || !dataFim.isValid()) {
          console.log('❌ [OTIMIZADO] Datas inválidas rejeitadas:', { inicio, fim });
          continue;
        }
        
        if (dataFim.isBefore(dataInicio)) {
          console.log('❌ [OTIMIZADO] Data fim antes do início rejeitada:', { inicio, fim });
          continue;
        }

        console.log('✅ [OTIMIZADO] Período válido aceito:', { inicio, fim, empregador, tipo });
        periodos.push({ inicio, fim, empregador, tipo });
      }
    }

    // 5️⃣ Remove duplicados / sobrepostos da mesma empresa
    console.log('🔄 [OTIMIZADO] Removendo duplicados e sobrepostos...');
    const filtrados = [];
    for (const p of periodos) {
      const existe = filtrados.some(x =>
        x.empregador.toLowerCase() === p.empregador.toLowerCase() &&
        (x.inicio === p.inicio || x.fim === p.fim)
      );
      if (!existe) {
        filtrados.push(p);
        console.log('✅ [OTIMIZADO] Período único adicionado:', p.empregador);
      } else {
        console.log('❌ [OTIMIZADO] Período duplicado removido:', p.empregador);
      }
    }

    console.log('🏆 [OTIMIZADO] Algoritmo concluído:', {
      periodosOriginais: periodos.length,
      periodosFiltrados: filtrados.length,
      removidos: periodos.length - filtrados.length
    });

    return filtrados;
  }

  /**
   * Limpar e padronizar nome do empregador (baseado no teste2.py)
   */
  limparEmpregador(nome) {
    if (!nome) return "";

    let nomeClean = nome.trim().toUpperCase();
    
    // Remover caracteres especiais no final
    nomeClean = nomeClean.replace(/[^\w\s\.\-&]+$/, '');
    
    // Remover números e códigos no final (ex: "EMPRESA 123", "EMPRESA LTD A")
    nomeClean = nomeClean.replace(/\s+[A-Z]\s*$/, ''); // Remove letras soltas no final
    nomeClean = nomeClean.replace(/\s+\d+\s*$/, ''); // Remove números no final
    
    // Correções padrão
    nomeClean = nomeClean.replace(/LIDA/g, 'LTDA');
    nomeClean = nomeClean.replace(/LID A/g, 'LTDA');
    nomeClean = nomeClean.replace(/S A/g, 'S.A.');
    nomeClean = nomeClean.replace(/S\/A/g, 'S.A.');
    nomeClean = nomeClean.replace(/SA /g, 'S.A. ');
    nomeClean = nomeClean.replace(/S A\./g, 'S.A.');
    nomeClean = nomeClean.replace(/\s{2,}/g, ' ').trim();

    // Correções específicas conhecidas
    const correcoes = {
      'ECE BEBIDAS': 'ECE BEBIDAS LTDA',
      'AMBEV BRASIL': 'AMBEV BRASIL BEBIDAS S.A.',
      'STEMAC': 'STEMAC SA GRUPOS GERADORES',
      'ELETROFORJA': 'ELETROFORJA INDUSTRIA MECANICA LTDA',
      'SINTY SIL INDUSTRIA DO VESTUARIO': 'SINTY SIL INDUSTRIA DO VESTUARIO LTD',
      'LUG-COMERCIO E REPRESENTACOES LIMITA': 'LUG-COMERCIO E REPRESENTACOES LIMITADA'
    };

    // Aplicar correções
    for (const [original, corrigido] of Object.entries(correcoes)) {
      if (nomeClean.includes(original)) {
        nomeClean = corrigido;
        break;
      }
    }

    return nomeClean.trim();
  }

  /**
   * Normalizar nome da empresa
   */
  normalizeCompanyName(company) {
    if (!company) return '';
    
    return company
      .toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .replace(/\b(LTDA|S\/A|SA|ME|EPP|EIRELI)\b/g, '')
      .trim();
  }

  /**
   * Parse de data DD/MM/AAAA
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    const parsed = dayjs(dateStr, 'DD/MM/YYYY', true);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
  }

  /**
   * Calcular duração em dias
   */
  calculateDuration(startDate, endDate) {
    const start = dayjs(startDate, 'DD/MM/YYYY');
    const end = dayjs(endDate, 'DD/MM/YYYY');
    
    if (start.isValid() && end.isValid()) {
      return end.diff(start, 'day');
    }
    
    return null;
  }

  /**
   * Limpar arquivo temporário
   */
  async cleanupTempFile(filePath) {
    try {
      await fs.unlink(filePath);
      logger.info('Arquivo temporário removido:', { filePath });
    } catch (error) {
      logger.warn('Erro ao remover arquivo temporário:', error.message);
    }
  }

  /**
   * Função principal para extrair períodos (interface esperada pelo sistema)
   */
  async extractPeriods(ocrText, uploadId) {
    try {
      console.log('🎯 [EXTRACT] Iniciando extração de períodos com filtros ultra-rigorosos');
      console.log('📊 [EXTRACT] Texto recebido:', ocrText.length, 'caracteres');
      
      // Usar a função processOCRText que já tem todos os filtros implementados
      const periods = await this.processOCRText(ocrText, uploadId);
      
      console.log('✅ [EXTRACT] Extração concluída:', periods.length, 'períodos válidos');
      
      return periods;
      
    } catch (error) {
      console.error('❌ [EXTRACT] Erro na extração:', error.message);
      logger.error('Erro na função extractPeriods:', error);
      throw error;
    }
  }

  /**
   * Limpar todos os arquivos temporários antigos
   */
  async cleanupOldTempFiles() {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas

      for (const file of files) {
        if (file.startsWith('ocr_') && file.endsWith('.txt')) {
          const filePath = path.join(this.tempDir, file);
          const stats = await fs.stat(filePath);
          
          if (now - stats.mtime.getTime() > maxAge) {
            await fs.unlink(filePath);
            logger.info('Arquivo temporário antigo removido:', { file });
          }
        }
      }
    } catch (error) {
      logger.warn('Erro na limpeza de arquivos temporários:', error.message);
    }
  }
}

module.exports = new OCRTextProcessor();
