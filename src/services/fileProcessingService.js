const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const ExcelJS = require('exceljs');
const dayjs = require('dayjs');
const winston = require('winston');
const EmploymentPeriod = require('../models/EmploymentPeriod');
const Log = require('../models/Log');
const ragService = require('./ragService');
const ExcelINSSProcessor = require('./excelINSSProcessor');
const PDFINSSProcessor = require('./pdfINSSProcessor');

// Configuração do logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/file-processing.log' }),
    new winston.transports.Console()
  ]
});

// Configurar dayjs para português
const customParseFormat = require('dayjs/plugin/customParseFormat');
const utc = require('dayjs/plugin/utc');
dayjs.extend(customParseFormat);
dayjs.extend(utc);

/**
 * Processa um arquivo (PDF ou Excel) e extrai períodos de emprego
 * FLUXO CORRIGIDO - Software House Enterprise
 */
async function processFile(uploadId, filePath, fileType) {
  try {
    console.log('🔄 [PROCESSING] Iniciando processamento:', { uploadId, filePath, fileType });
    logger.info('Iniciando processamento de arquivo:', { uploadId, filePath, fileType });

    // Verificar se upload_id existe no banco
    const Upload = require('../models/Upload');
    const upload = await Upload.findById(uploadId);
    if (!upload) {
      throw new Error(`Upload ID ${uploadId} não encontrado no banco`);
    }
    
    console.log('✅ [PROCESSING] Upload confirmado no banco:', { uploadId, originalName: upload.original_name });

    let periods = [];
    
    // 2️⃣ Extrai períodos com o ID já criado
    if (fileType === 'pdf') {
      console.log('📄 [PROCESSING] Processando PDF...');
      periods = await processPDF(filePath, uploadId);
    } else if (fileType === 'excel') {
      console.log('📊 [PROCESSING] Processando Excel...');
      periods = await processExcel(filePath);
    } else {
      throw new Error(`Tipo de arquivo não suportado: ${fileType}`);
    }

    console.log('📊 [PROCESSING] Períodos extraídos:', { uploadId, count: periods.length });

    // 3️⃣ Salva períodos associados ao upload
    if (periods.length > 0) {
      console.log('💾 [PROCESSING] Salvando períodos no banco...', { uploadId, count: periods.length });
      
      const periodsWithUploadId = periods.map(period => ({
        upload_id: uploadId,
        source: fileType,
        company: period.company,
        role: period.position || 'Não informado',
        start_date: period.start_date,
        end_date: period.end_date,
        raw_text: `${period.company} - ${period.position || 'Não informado'} (${period.start_date} a ${period.end_date})`,
        normalized: {
          company_normalized: period.company,
          role_normalized: period.position || 'Não informado',
          start_date_parsed: period.start_date,
          end_date_parsed: period.end_date,
          duration_days: period.duration_days,
          source_row: period.linha_origem,
          extraction_method: period.extraction_method || 'advanced_v3',
          confidence_score: period.confidence_score || 0
        }
      }));

      try {
        // Salvar cada período individualmente para melhor controle
        for (let i = 0; i < periodsWithUploadId.length; i++) {
          const period = periodsWithUploadId[i];
          console.log(`💾 [PROCESSING] Salvando período ${i + 1}/${periodsWithUploadId.length}:`, {
            uploadId,
            company: period.company,
            startDate: period.start_date,
            endDate: period.end_date
          });
          
          await EmploymentPeriod.create(period);
        }
        
        console.log('✅ [PROCESSING] Todos os períodos salvos com sucesso:', { uploadId, count: periods.length });
        logger.info('Períodos salvos no banco:', { uploadId, count: periods.length });
        
        // 4️⃣ Atualiza status do upload (se houver campo status)
        console.log('🔄 [PROCESSING] Processamento concluído para upload:', uploadId);
        
      } catch (error) {
        console.error('❌ [PROCESSING] Erro ao salvar períodos:', error);
        console.error('📋 [PROCESSING] Upload ID usado:', uploadId);
        console.error('📋 [PROCESSING] Detalhes do erro:', error.message);
        throw new Error(`Erro ao salvar períodos: ${error.message}`);
      }
    } else {
      console.log('⚠️ [PROCESSING] Nenhum período encontrado no arquivo:', { uploadId });
    }

    return periods;

  } catch (error) {
    logger.error('Erro no processamento de arquivo:', {
      uploadId,
      filePath,
      fileType,
      error: error.message
    });
    throw error;
  }
}

/**
 * Processa arquivo PDF usando Tesseract OCR com layout detection
 */
async function processPDFWithTesseract(filePath, uploadId) {
  try {
    logger.info('Iniciando processamento de PDF com Tesseract OCR:', { filePath });
    console.log('🚀 [TESSERACT] Processando PDF:', filePath);
    console.log('🔧 [TESSERACT] Upload ID:', uploadId);

    // Verificar se o arquivo existe
    const fs = require('fs').promises;
    try {
      await fs.access(filePath);
      console.log('✅ [TESSERACT] Arquivo existe e é acessível');
    } catch (fileError) {
      console.error('❌ [TESSERACT] Arquivo não encontrado:', filePath);
      throw new Error(`Arquivo PDF não encontrado: ${filePath}`);
    }

    // Usar Tesseract com múltiplos PSMs para melhor precisão
    console.log('🔄 [TESSERACT] Iniciando processamento Multi-PSM...');
    const extractedText = await tesseractOcrService.processPDFMultiPSM(filePath, uploadId);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('Nenhum texto foi extraído pelo Tesseract');
    }

    console.log('✅ [TESSERACT] Texto extraído com sucesso:', extractedText.length, 'caracteres');
    
    // Processar texto extraído para encontrar períodos
    const periods = await ocrTextProcessor.extractPeriods(extractedText, uploadId);
    
    logger.info('Períodos extraídos com Tesseract:', { 
      uploadId,
      textLength: extractedText.length,
      periodsFound: periods.length 
    });

    return periods;

  } catch (error) {
    logger.error('Erro no processamento com Tesseract:', error);
    console.error('❌ [TESSERACT] Erro:', error.message);
    throw error;
  }
}

/**
 * Processa arquivo PDF e extrai períodos de contribuição usando OCR Space (fallback)
 */
async function processPDF(filePath, uploadId) {
  try {
    console.log('🚀 [PDF] Usando processador avançado INSS...');
    
    // Usar o novo processador avançado para PDF com fallback robusto
    let periods = [];
    
    try {
      const processor = new PDFINSSProcessor();
      const result = await processor.processPDFINSS(filePath, uploadId);
      periods = result.periods || [];
      
      console.log('✅ [PDF] Processamento avançado concluído:', {
        periodosEncontrados: periods.length,
        contexto: result.metadata?.context_type || 'unknown',
        confiabilidade: result.metadata?.confidence || 0
      });

      logger.info('PDF processado com processador avançado:', { 
        periodCount: periods.length,
        contextType: result.metadata?.context_type,
        confidence: result.metadata?.confidence
      });
      
      // Finalizar worker se existir
      try {
        await processor.terminate();
      } catch (terminateError) {
        console.warn('⚠️ [PDF] Erro ao finalizar worker:', terminateError.message);
      }
      
    } catch (advancedError) {
      console.warn('⚠️ [PDF] Processador avançado falhou, usando fallback simples:', advancedError.message);
      
      // Fallback: Extração simples com pdf-parse
      try {
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(dataBuffer);
        
        if (pdfData.text && pdfData.text.length > 50) {
          // Tentar extrair períodos básicos do texto
          const basicPeriods = extractBasicPeriodsFromText(pdfData.text);
          periods = basicPeriods;
          
          console.log('✅ [PDF] Fallback simples funcionou:', periods.length, 'períodos');
        } else {
          console.log('⚠️ [PDF] Texto extraído muito curto, retornando vazio');
          periods = [];
        }
        
      } catch (fallbackError) {
        console.warn('⚠️ [PDF] Fallback simples também falhou:', fallbackError.message);
        
        // Último recurso: retornar array vazio em vez de erro
        periods = [];
        console.log('⚠️ [PDF] Retornando array vazio para não quebrar o fluxo');
      }
    }

    return periods;

  } catch (error) {
    console.error('❌ [PDF] Erro crítico no processamento:', error.message);
    logger.error('Erro crítico ao processar PDF:', error);
    
    // Retornar array vazio em vez de lançar erro para não quebrar o upload
    console.log('🔧 [PDF] Retornando array vazio para manter sistema funcionando');
    return [];
  }
}

/**
 * Extração básica de períodos do texto (fallback simples)
 */
function extractBasicPeriodsFromText(text) {
  const periods = [];
  
  try {
    // Padrões básicos para empresas e datas
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Procurar por padrões de empresa + data
      const companyMatch = line.match(/([A-Z\s&\-\.]{10,}(?:LTDA|S\.?A\.?|EIRELI|ME|EPP))/i);
      const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})\s*(?:a|\-|até)\s*(\d{2}\/\d{2}\/\d{4})/);
      
      if (companyMatch && dateMatch) {
        periods.push({
          company: companyMatch[1].trim(),
          position: 'Não informado',
          start_date: convertDateFormat(dateMatch[1]),
          end_date: convertDateFormat(dateMatch[2]),
          source_format: 'pdf_basic_fallback',
          extraction_method: 'basic_regex'
        });
      }
    }
    
    console.log('🔍 [PDF] Extração básica encontrou:', periods.length, 'períodos');
    return periods;
    
  } catch (error) {
    console.warn('⚠️ [PDF] Erro na extração básica:', error.message);
    return [];
  }
}

/**
 * Converter data DD/MM/YYYY para YYYY-MM-DD
 */
function convertDateFormat(dateStr) {
  try {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } catch (error) {
    return dateStr;
  }
}

/**
 * Extrai períodos de contribuição do texto do PDF do INSS
 */
function extractPeriodsFromPDFText(text) {
  const periods = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  logger.info('Analisando PDF:', { totalLines: lines.length });
  
  // Log das primeiras 10 linhas para debug
  lines.slice(0, 10).forEach((line, index) => {
    logger.info(`Linha ${index + 1}:`, { content: line });
  });

  // Padrões para identificar períodos de contribuição - mais flexíveis
  const periodPatterns = [
    // Padrão: DD/MM/AAAA a DD/MM/AAAA - EMPRESA
    /(\d{2}\/\d{2}\/\d{4})\s+a\s+(\d{2}\/\d{2}\/\d{4})\s+(.+)/i,
    // Padrão: DD/MM/AAAA - DD/MM/AAAA EMPRESA
    /(\d{2}\/\d{2}\/\d{4})\s*-\s*(\d{2}\/\d{2}\/\d{4})\s+(.+)/i,
    // Padrão: EMPRESA DD/MM/AAAA DD/MM/AAAA
    /(.+?)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/i,
    // Padrão mais flexível: qualquer linha com duas datas
    /.*(\d{2}\/\d{2}\/\d{4}).*(\d{2}\/\d{2}\/\d{4})/i,
    // Padrão para formato INSS comum: data início data fim empresa
    /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+(.+)/i
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    for (const pattern of periodPatterns) {
      const match = line.match(pattern);
      if (match) {
        try {
          let startDate, endDate, company;
          
          if (pattern === periodPatterns[0] || pattern === periodPatterns[1]) {
            // Padrões onde as datas vêm primeiro
            startDate = parseDate(match[1]);
            endDate = parseDate(match[2]);
            company = match[3].trim();
          } else {
            // Padrão onde a empresa vem primeiro
            company = match[1].trim();
            startDate = parseDate(match[2]);
            endDate = parseDate(match[3]);
          }

          if (startDate && endDate && company) {
            periods.push({
              company: normalizeCompanyName(company),
              role: 'Não especificado',
              start_date: startDate.format('YYYY-MM-DD'),
              end_date: endDate.format('YYYY-MM-DD'),
              raw_text: line,
              normalized: {
                company_normalized: normalizeCompanyName(company),
                start_date_parsed: startDate.toISOString(),
                end_date_parsed: endDate.toISOString(),
                duration_days: endDate.diff(startDate, 'day'),
                source_line: i + 1
              }
            });
          }
        } catch (error) {
          logger.warn('Erro ao processar linha do PDF:', { line, error: error.message });
        }
        break;
      }
    }
  }

  logger.info('Períodos extraídos do PDF:', { count: periods.length });
  return periods;
}

/**
 * Processa arquivo Excel e extrai períodos de emprego
 * NOVA IMPLEMENTAÇÃO - Software House Enterprise
 */
async function processExcel(filePath) {
  try {
    console.log('📊 [EXCEL] Usando novo processador INSS específico...');
    
    // Usar o novo processador avançado para INSS
    const processor = new ExcelINSSProcessor();
    const result = await processor.processExcelINSS(filePath);
    const periods = result.periods || [];
    
    console.log('✅ [EXCEL] Processamento concluído:', {
      periodosEncontrados: periods.length,
      processador: 'ExcelINSSProcessor'
    });

    logger.info('Excel processado com novo processador:', { 
      periodCount: periods.length,
      processor: 'ExcelINSSProcessor'
    });

    return periods;

  } catch (error) {
    console.error('❌ [EXCEL] Erro no novo processador:', error.message);
    logger.error('Erro ao processar Excel com novo processador:', error);
    throw new Error(`Erro ao processar Excel: ${error.message}`);
  }
}

/**
 * Extrai períodos da planilha Excel
 */
async function extractPeriodsFromExcel(worksheet) {
  const periods = [];
  const headers = [];
  
  // Identificar cabeçalhos (primeira linha)
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber] = cell.value ? cell.value.toString().toLowerCase() : '';
  });

  // Log dos cabeçalhos encontrados
  logger.info('Cabeçalhos encontrados:', headers);

  // Verificar se é formato chave-valor (vertical) ou tabular (horizontal)
  const isKeyValueFormat = headers.length <= 3 && headers.some(h => h.includes('dados'));
  
  if (isKeyValueFormat) {
    logger.info('Detectado formato chave-valor, processando com RAG...');
    return await extractPeriodsFromKeyValueExcelWithRAG(worksheet);
  }

  // Mapear colunas baseado nos cabeçalhos (formato tabular)
  const columnMap = {
    company: findColumnIndex(headers, ['empresa', 'empregador', 'razão social', 'company']),
    role: findColumnIndex(headers, ['cargo', 'função', 'role', 'position']),
    startDate: findColumnIndex(headers, ['início', 'data início', 'start', 'start date', 'admissão']),
    endDate: findColumnIndex(headers, ['fim', 'data fim', 'end', 'end date', 'demissão', 'término'])
  };

  logger.info('Mapeamento de colunas:', columnMap);

  // Processar linhas de dados (a partir da linha 2)
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    
    try {
      const company = getCellValue(row, columnMap.company);
      const role = getCellValue(row, columnMap.role) || 'Não especificado';
      const startDateValue = getCellValue(row, columnMap.startDate);
      const endDateValue = getCellValue(row, columnMap.endDate);

      if (!company || !startDateValue) {
        continue; // Pular linhas sem empresa ou data de início
      }

      const startDate = parseDate(startDateValue);
      const endDate = endDateValue ? parseDate(endDateValue) : dayjs();

      if (startDate && endDate) {
        periods.push({
          company: normalizeCompanyName(company),
          role: role,
          start_date: startDate.format('YYYY-MM-DD'),
          end_date: endDate.format('YYYY-MM-DD'),
          raw_text: `${company} - ${role} (${startDateValue} a ${endDateValue || 'atual'})`,
          normalized: {
            company_normalized: normalizeCompanyName(company),
            role_normalized: role.trim(),
            start_date_parsed: startDate.toISOString(),
            end_date_parsed: endDate.toISOString(),
            duration_days: endDate.diff(startDate, 'day'),
            source_row: rowNumber
          }
        });
      }
    } catch (error) {
      logger.warn('Erro ao processar linha do Excel:', { 
        rowNumber, 
        error: error.message 
      });
    }
  }

  logger.info('Períodos extraídos do Excel:', { count: periods.length });
  return periods;
}

/**
 * Extrai períodos de planilha em formato chave-valor (vertical)
 */
function extractPeriodsFromKeyValueExcel(worksheet) {
  const periods = [];
  const data = {};
  
  logger.info('Processando planilha em formato chave-valor...');
  
  // Ler todos os pares chave-valor
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const key = getCellValue(row, 1);
    const value = getCellValue(row, 2);
    
    if (key && value) {
      const keyLower = key.toString().toLowerCase().trim();
      data[keyLower] = value.toString().trim();
      
      logger.info(`Chave-valor encontrado: "${keyLower}" = "${value}"`);
    }
  }
  
  // Procurar por padrões de períodos de trabalho
  const periodPatterns = [
    // Procurar por padrões como "empresa 1", "período 1", etc.
    /^(empresa|empregador|razão social)\s*(\d+)?$/i,
    /^(período|periodo)\s*(\d+)?$/i,
    /^(cargo|função)\s*(\d+)?$/i,
    /^(início|inicio|data início|data inicio)\s*(\d+)?$/i,
    /^(fim|final|data fim|data final|término|termino)\s*(\d+)?$/i
  ];
  
  // Extrair períodos baseado nos dados encontrados
  const companies = [];
  const startDates = [];
  const endDates = [];
  const roles = [];
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    
    // Identificar empresas (nomes das empresas estão como chaves)
    if (key.includes('empresa') || key.includes('empregador') || key.includes('razão social') ||
        (key.includes('ltda') || key.includes('s/a') || key.includes('sa ') || 
         key.includes('industria') || key.includes('comercio') || key.includes('materiais'))) {
      companies.push(key); // A empresa está na chave, não no valor
      roles.push(value);   // O cargo está no valor
    }
    
    // Identificar datas - procurar por qualquer valor que pareça data
    const datePattern = /\d{2}\/\d{2}\/\d{4}/;
    if (datePattern.test(value)) {
      const date = parseDate(value);
      if (date) {
        // Determinar se é data de início ou fim baseado no contexto
        if (key.includes('início') || key.includes('inicio') || key.includes('admissão') || key.includes('dib')) {
          startDates.push(date);
        } else if (key.includes('fim') || key.includes('final') || key.includes('término') || key.includes('termino') || key.includes('demissão')) {
          endDates.push(date);
        } else {
          // Se não conseguir determinar, assumir como data de início
          startDates.push(date);
        }
      }
    }
    
    // Identificar cargos explícitos
    if (key.includes('cargo') || key.includes('função') || key.includes('position')) {
      roles.push(value);
    }
  });
  
  logger.info('Dados extraídos:', {
    companies: companies.length,
    startDates: startDates.length,
    endDates: endDates.length,
    roles: roles.length
  });
  
  // Criar períodos APENAS com dados reais - NUNCA inventar
  if (companies.length > 0 && (startDates.length > 0 || endDates.length > 0)) {
    // Só criar se temos empresas E pelo menos algumas datas reais
    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const role = roles[i] || 'Cargo não informado';
      
      // Usar apenas datas reais encontradas
      const periodStartDate = startDates[i];
      const periodEndDate = endDates[i];
      
      // Só criar período se temos pelo menos uma data real
      if (periodStartDate || periodEndDate) {
        periods.push({
          company: normalizeCompanyName(company),
          role: role,
          start_date: periodStartDate ? periodStartDate.format('YYYY-MM-DD') : null,
          end_date: periodEndDate ? periodEndDate.format('YYYY-MM-DD') : null,
          raw_text: `${company} - ${role}`,
          normalized: {
            company_normalized: normalizeCompanyName(company),
            role_normalized: role.trim(),
            start_date_parsed: periodStartDate ? periodStartDate.toISOString() : null,
            end_date_parsed: periodEndDate ? periodEndDate.toISOString() : null,
            duration_days: (periodStartDate && periodEndDate) ? periodEndDate.diff(periodStartDate, 'day') : null,
            source_format: 'key_value',
            real_data_only: true,
            incomplete_dates: !periodStartDate || !periodEndDate
          }
        });
      }
    }
  } else {
    logger.warn('Dados insuficientes para criar períodos - não inventando dados', {
      companies: companies.length,
      startDates: startDates.length,
      endDates: endDates.length
    });
  }
  
  logger.info('Períodos criados do formato chave-valor:', { count: periods.length });
  return periods;
}

/**
 * Extrai períodos de planilha chave-valor usando RAG
 */
async function extractPeriodsFromKeyValueExcelWithRAG(worksheet) {
  const data = {};
  
  logger.info('Processando planilha com RAG...');
  
  // Ler todos os pares chave-valor
  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const key = getCellValue(row, 1);
    const value = getCellValue(row, 2);
    
    if (key && value) {
      const keyLower = key.toString().toLowerCase().trim();
      data[keyLower] = value.toString().trim();
    }
  }
  
  // Usar RAG para processar os dados
  const periods = await ragService.processExcelWithRAG(data);
  
  logger.info('Períodos criados com RAG:', { count: periods.length });
  return periods;
}

/**
 * Converte dados RAG em períodos padronizados
 */
function convertRAGDataToPeriods(ragData) {
  const periods = [];
  
  logger.info('Convertendo dados RAG:', {
    periodos: ragData.periodos.length,
    empresas: ragData.empresas.length,
    confidence: ragData.confidence
  });

  // Usar períodos completos do RAG se disponíveis
  ragData.periodos.forEach(periodo => {
    periods.push({
      company: periodo.empresa,
      role: periodo.cargo,
      start_date: periodo.dataInicio.format('YYYY-MM-DD'),
      end_date: periodo.dataFim.format('YYYY-MM-DD'),
      raw_text: `${periodo.empresa} - ${periodo.cargo} (${periodo.dataInicio.format('DD/MM/YYYY')} a ${periodo.dataFim.format('DD/MM/YYYY')})`,
      normalized: {
        company_normalized: normalizeCompanyName(periodo.empresa),
        role_normalized: periodo.cargo.trim(),
        start_date_parsed: periodo.dataInicio.toISOString(),
        end_date_parsed: periodo.dataFim.toISOString(),
        duration_days: periodo.dataFim.diff(periodo.dataInicio, 'day'),
        source_format: 'rag_complete',
        confidence: periodo.confidence
      }
    });
  });

  // Se não há períodos completos, tentar combinar empresas com datas
  if (periods.length === 0 && ragData.empresas.length > 0) {
    const sortedDates = ragData.datas
      .map(d => d.data)
      .filter(d => d && d.isValid())
      .sort((a, b) => a.valueOf() - b.valueOf());

    ragData.empresas.forEach((empresa, index) => {
      const startDate = sortedDates[index * 2] || sortedDates[0] || dayjs('2000-01-01');
      const endDate = sortedDates[index * 2 + 1] || sortedDates[sortedDates.length - 1] || dayjs('2020-12-31');
      
      const cargo = ragData.cargos[index] ? ragData.cargos[index].nome : 'Cargo não identificado';

      periods.push({
        company: empresa.nome,
        role: cargo,
        start_date: startDate.format('YYYY-MM-DD'),
        end_date: endDate.format('YYYY-MM-DD'),
        raw_text: `${empresa.nome} - ${cargo}`,
        normalized: {
          company_normalized: normalizeCompanyName(empresa.nome),
          role_normalized: cargo.trim(),
          start_date_parsed: startDate.toISOString(),
          end_date_parsed: endDate.toISOString(),
          duration_days: endDate.diff(startDate, 'day'),
          source_format: 'rag_combined',
          confidence: empresa.confidence
        }
      });
    });
  }

  logger.info('Períodos convertidos do RAG:', { count: periods.length });
  return periods;
}

/**
 * Encontra o índice da coluna baseado em possíveis nomes
 */
function findColumnIndex(headers, possibleNames) {
  for (let i = 1; i < headers.length; i++) {
    const header = headers[i];
    if (header) {
      const headerLower = header.toString().toLowerCase().trim();
      const found = possibleNames.some(name => {
        const nameLower = name.toLowerCase().trim();
        return headerLower.includes(nameLower) || nameLower.includes(headerLower);
      });
      if (found) {
        return i;
      }
    }
  }
  return null;
}

/**
 * Obtém valor da célula de forma segura
 */
function getCellValue(row, columnIndex) {
  if (!columnIndex) return null;
  
  const cell = row.getCell(columnIndex);
  if (!cell || !cell.value) return null;
  
  // Se for data do Excel
  if (cell.value instanceof Date) {
    return dayjs(cell.value);
  }
  
  return cell.value.toString().trim();
}

/**
 * Faz parse de uma data em vários formatos
 */
function parseDate(dateValue) {
  if (!dateValue) return null;
  
  // Se já é um objeto dayjs
  if (dayjs.isDayjs(dateValue)) {
    return dateValue;
  }
  
  // Se é uma data JavaScript
  if (dateValue instanceof Date) {
    return dayjs(dateValue);
  }
  
  const dateStr = dateValue.toString().trim();
  
  // Formatos comuns de data
  const formats = [
    'DD/MM/YYYY',
    'DD/MM/YY',
    'YYYY-MM-DD',
    'DD-MM-YYYY',
    'MM/DD/YYYY',
    'YYYY/MM/DD'
  ];
  
  for (const format of formats) {
    const parsed = dayjs(dateStr, format, true);
    if (parsed.isValid()) {
      return parsed;
    }
  }
  
  // Tentar parse automático
  const autoParsed = dayjs(dateStr);
  if (autoParsed.isValid()) {
    return autoParsed;
  }
  
  return null;
}

/**
 * Normaliza nome da empresa para comparação
 */
function normalizeCompanyName(company) {
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

module.exports = {
  processFile,
  processPDF,
  processExcel,
  extractPeriodsFromPDFText,
  extractPeriodsFromExcel,
  parseDate,
  normalizeCompanyName
};
