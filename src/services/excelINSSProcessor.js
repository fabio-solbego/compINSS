const ExcelJS = require('exceljs');
const dayjs = require('dayjs');
const winston = require('winston');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const isBetween = require('dayjs/plugin/isBetween');

dayjs.extend(customParseFormat);
dayjs.extend(isBetween);

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
 * Processador AVANÇADO para planilhas INSS - EXTRAÇÃO INTELIGENTE
 * Versão 3.0 - Algoritmo de Análise Contextual
 */
class ExcelINSSProcessor {
  
  constructor() {
    // Padrões de empresas brasileiras
    this.companyPatterns = [
      /\b\w+\s+(LTDA|S\.?A\.?|EIRELI|ME|EPP)\b/i,
      /\b(DISTRIBUIDORA|COMERCIO|SERVICOS|INDUSTRIA|CONSTRUTORA)\b/i,
      /\b\w+\s+(CIA|COMPANHIA)\b/i
    ];
    
    // Padrões de datas brasileiras
    this.datePatterns = [
      /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/g,
      /\b(\d{2,4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g
    ];
    
    // Palavras-chave de cargos
    this.jobKeywords = [
      'AUXILIAR', 'ASSISTENTE', 'ANALISTA', 'GERENTE', 'COORDENADOR',
      'SUPERVISOR', 'DIRETOR', 'VENDEDOR', 'OPERADOR', 'TECNICO',
      'SECRETARIA', 'MOTORISTA', 'VIGILANTE', 'PORTEIRO', 'SERVENTE'
    ];
    
    // Cache para otimização
    this.cache = new Map();
  }

  /**
   * Processar arquivo Excel INSS com algoritmo avançado
   */
  async processExcelINSS(filePath) {
    try {
      console.log('🚀 [EXCEL-ADVANCED] Iniciando processamento inteligente...');
      
      // Validações básicas
      const fs = require('fs');
      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        throw new Error('Arquivo Excel está vazio');
      }

      // Carregar workbook com múltiplas tentativas
      const workbook = await this.loadWorkbookSafely(filePath);
      const worksheet = workbook.getWorksheet(1);
      
      if (!worksheet || worksheet.rowCount === 0) {
        throw new Error('Planilha vazia ou inválida');
      }

      console.log('📊 [EXCEL-ADVANCED] Planilha carregada:', {
        linhas: worksheet.rowCount,
        colunas: worksheet.columnCount,
        nome: worksheet.name || 'Planilha1'
      });

      // Análise contextual da planilha
      const context = await this.analyzeWorksheetContext(worksheet);
      console.log('🔍 [EXCEL-ADVANCED] Contexto identificado:', context);

      // Extração baseada no contexto
      const periods = await this.extractPeriodsWithContext(worksheet, context);

      console.log('✅ [EXCEL-ADVANCED] Processamento concluído:', {
        periodosEncontrados: periods.length,
        contexto: context.type,
        confiabilidade: context.confidence
      });

      return {
        success: true,
        periods: periods,
        metadata: {
          total_periods: periods.length,
          file_size: stats.size,
          worksheet_name: worksheet.name || 'Planilha1',
          context_type: context.type,
          confidence: context.confidence
        }
      };

    } catch (error) {
      console.error('❌ [EXCEL-ADVANCED] Erro no processamento:', error.message);
      throw new Error(`Erro ao processar Excel: ${error.message}`);
    }
  }

  /**
   * Carregar workbook com múltiplas tentativas
   */
  async loadWorkbookSafely(filePath) {
    const workbook = new ExcelJS.Workbook();
    
    try {
      console.log('📖 [EXCEL-ADVANCED] Tentando XLSX...');
      await workbook.xlsx.readFile(filePath);
      return workbook;
    } catch (xlsxError) {
      console.log('⚠️ [EXCEL-ADVANCED] XLSX falhou, tentando CSV...');
      try {
        await workbook.csv.readFile(filePath);
        return workbook;
      } catch (csvError) {
        throw new Error(`Formato de arquivo não suportado: ${xlsxError.message}`);
      }
    }
  }

  /**
   * Analisar contexto da planilha para identificar layout
   */
  async analyzeWorksheetContext(worksheet) {
    console.log('🔍 [EXCEL-ADVANCED] Analisando contexto da planilha...');
    
    const context = {
      type: 'unknown',
      confidence: 0,
      dataStartRow: 1,
      columnMapping: {},
      hasHeaders: false,
      sectionBased: false
    };
    
    // Analisar primeiras 50 linhas para identificar padrão
    const sampleSize = Math.min(50, worksheet.rowCount);
    let headerCandidates = [];
    let dataCandidates = [];
    
    for (let rowNum = 1; rowNum <= sampleSize; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const rowAnalysis = this.analyzeRow(row, rowNum);
      
      if (rowAnalysis.isHeader) {
        headerCandidates.push(rowAnalysis);
      }
      
      if (rowAnalysis.hasData) {
        dataCandidates.push(rowAnalysis);
      }
    }
    
    // Identificar tipo de planilha
    if (this.findSectionMarker(worksheet)) {
      context.type = 'section_based';
      context.sectionBased = true;
      context.confidence = 85;
    } else if (headerCandidates.length > 0) {
      context.type = 'tabular';
      context.hasHeaders = true;
      context.dataStartRow = headerCandidates[0].rowNum + 1;
      context.columnMapping = this.identifyColumns(worksheet, headerCandidates[0].rowNum);
      context.confidence = 75;
    } else if (dataCandidates.length > 0) {
      context.type = 'free_form';
      context.dataStartRow = dataCandidates[0].rowNum;
      context.confidence = 60;
    }
    
    return context;
  }

  /**
   * Analisar uma linha específica
   */
  analyzeRow(row, rowNum) {
    const analysis = {
      rowNum: rowNum,
      isHeader: false,
      hasData: false,
      companies: [],
      dates: [],
      jobs: [],
      confidence: 0
    };
    
    const rowText = this.getRowText(row).toLowerCase();
    
    // Verificar se é cabeçalho
    const headerKeywords = ['empresa', 'inicio', 'início', 'fim', 'cargo', 'função', 'período'];
    const headerMatches = headerKeywords.filter(keyword => rowText.includes(keyword));
    
    if (headerMatches.length >= 2) {
      analysis.isHeader = true;
      analysis.confidence += 30;
    }
    
    // Analisar células individuais
    for (let colNum = 1; colNum <= Math.min(20, row.cellCount); colNum++) {
      const cell = row.getCell(colNum);
      if (!cell.value) continue;
      
      const cellValue = cell.value.toString().trim();
      
      // Identificar empresas
      const company = this.identifyCompany(cellValue);
      if (company) {
        analysis.companies.push({
          value: company,
          column: colNum,
          confidence: this.calculateCompanyConfidence(company)
        });
        analysis.hasData = true;
        analysis.confidence += 20;
      }
      
      // Identificar datas
      const date = this.identifyDate(cell);
      if (date) {
        analysis.dates.push({
          value: date,
          column: colNum,
          formatted: dayjs(date).format('YYYY-MM-DD')
        });
        analysis.hasData = true;
        analysis.confidence += 15;
      }
      
      // Identificar cargos
      const job = this.identifyJob(cellValue);
      if (job) {
        analysis.jobs.push({
          value: job,
          column: colNum
        });
        analysis.confidence += 10;
      }
    }
    
    return analysis;
  }

  /**
   * Extrair períodos com base no contexto identificado
   */
  async extractPeriodsWithContext(worksheet, context) {
    console.log('📊 [EXCEL-ADVANCED] Extraindo períodos com contexto:', context.type);
    
    switch (context.type) {
      case 'section_based':
        return await this.extractFromSections(worksheet);
      
      case 'tabular':
        return await this.extractFromTable(worksheet, context);
      
      case 'free_form':
      default:
        return await this.extractFreeForm(worksheet, context);
    }
  }

  /**
   * Extrair de planilha baseada em seções
   */
  async extractFromSections(worksheet) {
    console.log('📋 [EXCEL-ADVANCED] Extração por seções...');
    
    const periods = [];
    const sectionMarker = this.findSectionMarker(worksheet);
    
    if (sectionMarker) {
      const startRow = sectionMarker.row + 2; // Pular título e possível cabeçalho
      
      for (let rowNum = startRow; rowNum <= worksheet.rowCount; rowNum++) {
        const row = worksheet.getRow(rowNum);
        
        if (this.isEndOfSection(row)) break;
        
        const period = await this.extractPeriodFromRowAdvanced(row, rowNum);
        if (period && this.validatePeriodAdvanced(period)) {
          periods.push(period);
        }
      }
    }
    
    return periods;
  }

  /**
   * Extrair de planilha tabular
   */
  async extractFromTable(worksheet, context) {
    console.log('📊 [EXCEL-ADVANCED] Extração tabular...');
    
    const periods = [];
    const mapping = context.columnMapping;
    
    for (let rowNum = context.dataStartRow; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      
      if (this.isEmptyRow(row)) continue;
      
      const period = this.extractPeriodFromTableRow(row, rowNum, mapping);
      if (period && this.validatePeriodAdvanced(period)) {
        periods.push(period);
      }
    }
    
    return periods;
  }

  /**
   * Extrair formato livre
   */
  async extractFreeForm(worksheet, context) {
    console.log('🔄 [EXCEL-ADVANCED] Extração formato livre...');
    
    const periods = [];
    
    // Analisar TODAS as linhas em busca de dados
    for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      
      const period = await this.extractPeriodFromRowAdvanced(row, rowNum);
      if (period && this.validatePeriodAdvanced(period)) {
        periods.push(period);
      }
    }
    
    // Se não encontrou nada, tentar extração mais agressiva
    if (periods.length === 0) {
      console.log('🔍 [EXCEL-ADVANCED] Tentando extração agressiva...');
      return await this.extractAggressively(worksheet);
    }
    
    return periods;
  }

  /**
   * Extração agressiva quando métodos normais falham
   */
  async extractAggressively(worksheet) {
    console.log('⚡ [EXCEL-ADVANCED] Modo extração agressiva ativado...');
    
    const periods = [];
    const allData = [];
    
    // Coletar todos os dados da planilha
    for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const rowData = [];
      
      for (let colNum = 1; colNum <= Math.min(20, row.cellCount); colNum++) {
        const cell = row.getCell(colNum);
        if (cell.value) {
          rowData.push({
            value: cell.value.toString().trim(),
            row: rowNum,
            col: colNum,
            cell: cell
          });
        }
      }
      
      if (rowData.length > 0) {
        allData.push(...rowData);
      }
    }
    
    // Tentar formar períodos com os dados coletados
    const companies = allData.filter(item => this.identifyCompany(item.value));
    const dates = allData.filter(item => this.identifyDate(item.cell));
    
    console.log(`📊 [EXCEL-ADVANCED] Dados coletados: ${companies.length} empresas, ${dates.length} datas`);
    
    // Se temos empresas e datas, tentar combinar
    if (companies.length > 0 && dates.length >= 2) {
      for (const company of companies) {
        // Procurar datas próximas à empresa
        const nearbyDates = dates.filter(date => 
          Math.abs(date.row - company.row) <= 3 || Math.abs(date.col - company.col) <= 3
        );
        
        if (nearbyDates.length >= 2) {
          const sortedDates = nearbyDates.sort((a, b) => a.col - b.col);
          const startDate = this.identifyDate(sortedDates[0].cell);
          const endDate = this.identifyDate(sortedDates[1].cell);
          
          if (startDate && endDate) {
            const { validStartDate, validEndDate } = this.validateAndAdjustDates(startDate, endDate);
            
            const period = {
              company: company.value,
              position: 'Não informado',
              start_date: dayjs(validStartDate).format('YYYY-MM-DD'),
              end_date: dayjs(validEndDate).format('YYYY-MM-DD'),
              duration_days: dayjs(validEndDate).diff(dayjs(validStartDate), 'day') + 1,
              source_format: 'excel_aggressive_v3',
              linha_origem: company.row,
              extraction_method: 'aggressive_combination'
            };
            
            if (this.validatePeriodAdvanced(period)) {
              periods.push(period);
            }
          }
        }
      }
    }
    
    console.log(`⚡ [EXCEL-ADVANCED] Extração agressiva encontrou: ${periods.length} períodos`);
    return periods;
  }

  /**
   * Extrair período de linha com algoritmo avançado
   */
  async extractPeriodFromRowAdvanced(row, rowNum) {
    const cacheKey = `advanced_row_${rowNum}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const analysis = this.analyzeRow(row, rowNum);
    
    if (!analysis.hasData || analysis.companies.length === 0 || analysis.dates.length === 0) {
      this.cache.set(cacheKey, null);
      return null;
    }
    
    // Selecionar melhor empresa
    const bestCompany = analysis.companies.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
    
    // Selecionar datas
    const sortedDates = analysis.dates.sort((a, b) => a.column - b.column);
    const startDate = sortedDates[0].value;
    const endDate = sortedDates.length > 1 ? sortedDates[1].value : null;
    
    // Selecionar cargo
    const job = analysis.jobs.length > 0 ? analysis.jobs[0].value : 'Não informado';
    
    // Validar e ajustar datas
    const { validStartDate, validEndDate } = this.validateAndAdjustDates(startDate, endDate);
    
    const period = {
      company: bestCompany.value,
      position: job,
      start_date: dayjs(validStartDate).format('YYYY-MM-DD'),
      end_date: dayjs(validEndDate).format('YYYY-MM-DD'),
      duration_days: dayjs(validEndDate).diff(dayjs(validStartDate), 'day') + 1,
      source_format: 'excel_advanced_v3',
      linha_origem: rowNum,
      confidence_score: analysis.confidence,
      extraction_method: 'contextual_analysis'
    };
    
    this.cache.set(cacheKey, period);
    return period;
  }

  /**
   * Extrair período de linha tabular
   */
  extractPeriodFromTableRow(row, rowNum, mapping) {
    const data = {};
    
    // Extrair dados baseado no mapeamento de colunas
    Object.keys(mapping).forEach(field => {
      const colNum = mapping[field];
      const cell = row.getCell(colNum);
      
      if (cell.value) {
        switch (field) {
          case 'company':
            data.company = this.cleanCompanyName(cell.value.toString());
            break;
          case 'start_date':
            data.start_date = this.identifyDate(cell);
            break;
          case 'end_date':
            data.end_date = this.identifyDate(cell);
            break;
          case 'position':
            data.position = cell.value.toString().trim();
            break;
        }
      }
    });
    
    if (!data.company || !data.start_date) {
      return null;
    }
    
    // Ajustar data de fim se não informada
    if (!data.end_date) {
      data.end_date = new Date();
    }
    
    const { validStartDate, validEndDate } = this.validateAndAdjustDates(data.start_date, data.end_date);
    
    return {
      company: data.company,
      position: data.position || 'Não informado',
      start_date: dayjs(validStartDate).format('YYYY-MM-DD'),
      end_date: dayjs(validEndDate).format('YYYY-MM-DD'),
      duration_days: dayjs(validEndDate).diff(dayjs(validStartDate), 'day') + 1,
      source_format: 'excel_tabular_v3',
      linha_origem: rowNum,
      extraction_method: 'column_mapping'
    };
  }

  /**
   * Identificar empresa com algoritmo avançado
   */
  identifyCompany(text) {
    if (!text || text.length < 5) return null;
    
    const cleanText = text.toString().trim().toUpperCase();
    
    // Verificar padrões de empresa
    for (const pattern of this.companyPatterns) {
      if (pattern.test(cleanText)) {
        return this.cleanCompanyName(cleanText);
      }
    }
    
    // Verificar por tamanho e características (mais flexível)
    if (cleanText.length > 10 && /[A-Z]/.test(cleanText) && !/^\d+$/.test(cleanText)) {
      // Verificar se não é dados pessoais
      const personalDataKeywords = ['NOME', 'CPF', 'RG', 'NASCIMENTO', 'IDADE', 'SEXO', 'ENDERECO'];
      const isPersonalData = personalDataKeywords.some(keyword => cleanText.includes(keyword));
      
      if (!isPersonalData) {
        return this.cleanCompanyName(cleanText);
      }
    }
    
    // Verificar palavras-chave empresariais mais amplas
    const businessKeywords = ['EMPRESA', 'EMPREGADOR', 'FIRMA', 'ESTABELECIMENTO', 'ORGANIZAÇÃO'];
    if (businessKeywords.some(keyword => cleanText.includes(keyword)) && cleanText.length > 8) {
      return this.cleanCompanyName(cleanText);
    }
    
    return null;
  }

  /**
   * Identificar data com múltiplos formatos
   */
  identifyDate(cell) {
    if (!cell.value) return null;
    
    // Se já é uma data do Excel
    if (cell.type === ExcelJS.ValueType.Date) {
      return cell.value;
    }
    
    const cellValue = cell.value.toString().trim();
    
    // Tentar múltiplos formatos brasileiros
    const formats = [
      'DD/MM/YYYY',
      'DD/MM/YY',
      'DD-MM-YYYY',
      'DD-MM-YY',
      'YYYY-MM-DD',
      'DD/MM/YYYY HH:mm:ss',
      'DD.MM.YYYY'
    ];
    
    for (const format of formats) {
      const parsed = dayjs(cellValue, format, true);
      if (parsed.isValid() && parsed.year() >= 1950 && parsed.year() <= 2030) {
        return parsed.toDate();
      }
    }
    
    return null;
  }

  /**
   * Identificar cargo/função
   */
  identifyJob(text) {
    if (!text || text.length < 3) return null;
    
    const cleanText = text.toString().trim().toUpperCase();
    
    // Verificar palavras-chave de cargos
    for (const keyword of this.jobKeywords) {
      if (cleanText.includes(keyword)) {
        return text.toString().trim();
      }
    }
    
    // Verificar se parece com cargo (não é empresa nem data)
    if (cleanText.length > 3 && cleanText.length < 50 && 
        !/LTDA|S\.A\.|EIRELI/.test(cleanText) && 
        !/\d{2}\/\d{2}\/\d{4}/.test(cleanText)) {
      return text.toString().trim();
    }
    
    return null;
  }

  /**
   * Validar e ajustar datas
   */
  validateAndAdjustDates(startDate, endDate) {
    let validStartDate = dayjs(startDate);
    let validEndDate = endDate ? dayjs(endDate) : dayjs();
    
    // Verificar se as datas fazem sentido
    if (!validStartDate.isValid()) {
      validStartDate = dayjs('1990-01-01');
    }
    
    if (!validEndDate.isValid()) {
      validEndDate = dayjs();
    }
    
    // Corrigir ordem se necessário
    if (validEndDate.isBefore(validStartDate)) {
      [validStartDate, validEndDate] = [validEndDate, validStartDate];
    }
    
    // Verificar limites razoáveis
    if (validStartDate.year() < 1950) {
      validStartDate = dayjs('1950-01-01');
    }
    
    if (validEndDate.year() > 2030) {
      validEndDate = dayjs();
    }
    
    return {
      validStartDate: validStartDate.toDate(),
      validEndDate: validEndDate.toDate()
    };
  }

  /**
   * Calcular confiança da empresa
   */
  calculateCompanyConfidence(company) {
    let confidence = 50;
    
    if (company.length > 10) confidence += 20;
    if (company.length > 20) confidence += 10;
    
    // Palavras-chave empresariais
    if (/LTDA|S\.A\.|EIRELI|ME|EPP/.test(company)) confidence += 25;
    if (/DISTRIBUIDORA|COMERCIO|SERVICOS|INDUSTRIA/.test(company)) confidence += 15;
    
    // Penalizar se parece com dados pessoais
    if (/^\d+$/.test(company) || company.length < 5) confidence -= 30;
    
    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Validação avançada de período
   */
  validatePeriodAdvanced(period) {
    if (!period) return false;
    
    // Validações básicas
    if (!period.company || period.company.length < 3) return false;
    if (!period.start_date || !period.end_date) return false;
    
    // Validar duração
    if (period.duration_days <= 0 || period.duration_days > 36500) return false;
    
    // Validar datas
    const startDate = dayjs(period.start_date);
    const endDate = dayjs(period.end_date);
    
    if (!startDate.isValid() || !endDate.isValid()) return false;
    if (startDate.year() < 1950 || endDate.year() > 2030) return false;
    
    // Validar confiança mínima
    if (period.confidence_score && period.confidence_score < 30) return false;
    
    return true;
  }

  /**
   * Encontrar marcador de seção
   */
  findSectionMarker(worksheet) {
    const sectionKeywords = [
      'períodos de contribuição',
      'periodos de contribuição',
      'períodos de contribuicao',
      'contribuição inseridos',
      'relação de vínculos',
      'histórico laboral',
      'vínculos empregatícios',
      'empresas trabalhadas',
      'período trabalhado',
      'tempo de serviço'
    ];
    
    for (let rowNum = 1; rowNum <= Math.min(50, worksheet.rowCount); rowNum++) {
      const row = worksheet.getRow(rowNum);
      const rowText = this.getRowText(row).toLowerCase();
      
      for (const keyword of sectionKeywords) {
        if (rowText.includes(keyword)) {
          return { row: rowNum, keyword: keyword };
        }
      }
    }
    
    return null;
  }

  /**
   * Identificar colunas em planilha tabular
   */
  identifyColumns(worksheet, headerRow) {
    const mapping = {};
    const row = worksheet.getRow(headerRow);
    
    for (let colNum = 1; colNum <= row.cellCount; colNum++) {
      const cell = row.getCell(colNum);
      if (!cell.value) continue;
      
      const headerText = cell.value.toString().toLowerCase();
      
      if (headerText.includes('empresa') || headerText.includes('empregador')) {
        mapping.company = colNum;
      } else if (headerText.includes('inicio') || headerText.includes('início')) {
        mapping.start_date = colNum;
      } else if (headerText.includes('fim') || headerText.includes('final')) {
        mapping.end_date = colNum;
      } else if (headerText.includes('cargo') || headerText.includes('função')) {
        mapping.position = colNum;
      }
    }
    
    return mapping;
  }

  /**
   * Verificar se é fim de seção
   */
  isEndOfSection(row) {
    const rowText = this.getRowText(row).toLowerCase();
    const endMarkers = [
      'dados do cálculo',
      'dados do calculo',
      'resumo',
      'totais',
      'total geral',
      'observações',
      'observacoes'
    ];
    
    return endMarkers.some(marker => rowText.includes(marker));
  }

  /**
   * Limpar nome da empresa
   */
  cleanCompanyName(name) {
    return name.toString().trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-\.]/g, '')
      .toUpperCase();
  }

  /**
   * Verificar se linha está vazia
   */
  isEmptyRow(row) {
    for (let colNum = 1; colNum <= Math.min(10, row.cellCount); colNum++) {
      const cell = row.getCell(colNum);
      if (cell.value && cell.value.toString().trim()) {
        return false;
      }
    }
    return true;
  }

  /**
   * Obter texto completo da linha
   */
  getRowText(row) {
    let text = '';
    for (let colNum = 1; colNum <= row.cellCount; colNum++) {
      const cell = row.getCell(colNum);
      if (cell.value) {
        text += cell.value.toString() + ' ';
      }
    }
    return text.trim();
  }
}

module.exports = ExcelINSSProcessor;
