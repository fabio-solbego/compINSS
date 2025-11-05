const winston = require('winston');
const stringSimilarity = require('string-similarity');
const dayjs = require('dayjs');

// Configuração do logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/rag.log' }),
    new winston.transports.Console()
  ]
});

/**
 * Serviço RAG (Retrieval-Augmented Generation) para extração inteligente de dados
 */
class RAGService {
  constructor() {
    // Base de conhecimento para padrões INSS
    this.knowledgeBase = {
      empresaPatterns: [
        'ltda', 'limitada', 's/a', 'sa ', 'eireli', 'me ', 'epp',
        'industria', 'comercio', 'servicos', 'construcao', 'materiais',
        'tecnologia', 'consultoria', 'representacoes', 'distribuidora'
      ],
      cargoPatterns: [
        'auxiliar', 'assistente', 'analista', 'coordenador', 'gerente',
        'diretor', 'supervisor', 'operador', 'tecnico', 'engenheiro',
        'motorista', 'vendedor', 'office-boy', 'secretaria', 'contador'
      ],
      dataPatterns: [
        /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
        /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/g,
        /(\d{1,2})\s+de\s+\w+\s+de\s+(\d{4})/gi
      ],
      periodPatterns: [
        /de\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+a\s+(\d{1,2}\/\d{1,2}\/\d{4})/gi,
        /período:\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
        /(\d{1,2}\/\d{1,2}\/\d{4})\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{4})/g
      ]
    };
  }

  /**
   * Extrai informações inteligentemente usando RAG
   */
  async extractInformation(text, type = 'pdf') {
    logger.info('Iniciando extração RAG:', { type, textLength: text.length });

    const chunks = this.chunkText(text);
    const extractedData = {
      empresas: [],
      cargos: [],
      periodos: [],
      datas: [],
      confidence: 0
    };

    for (const chunk of chunks) {
      const chunkData = await this.processChunk(chunk, type);
      this.mergeData(extractedData, chunkData);
    }

    // Calcular confiança baseada na qualidade dos dados extraídos
    extractedData.confidence = this.calculateConfidence(extractedData);

    logger.info('Extração RAG concluída:', {
      empresas: extractedData.empresas.length,
      periodos: extractedData.periodos.length,
      confidence: extractedData.confidence
    });

    return extractedData;
  }

  /**
   * Divide o texto em chunks para processamento
   */
  chunkText(text, maxChunkSize = 1000) {
    const chunks = [];
    const lines = text.split('\n');
    let currentChunk = '';

    for (const line of lines) {
      if (currentChunk.length + line.length > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = line;
      } else {
        currentChunk += '\n' + line;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Processa um chunk de texto
   */
  async processChunk(chunk, type) {
    const data = {
      empresas: [],
      cargos: [],
      periodos: [],
      datas: []
    };

    // Extrair empresas
    data.empresas = this.extractEmpresas(chunk);
    
    // Extrair cargos
    data.cargos = this.extractCargos(chunk);
    
    // Extrair períodos completos
    data.periodos = this.extractPeriodos(chunk);
    
    // Extrair datas isoladas
    data.datas = this.extractDatas(chunk);

    return data;
  }

  /**
   * Extrai nomes de empresas usando padrões inteligentes
   */
  extractEmpresas(text) {
    const empresas = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const lineLower = line.toLowerCase().trim();
      
      // Verificar se a linha contém padrões de empresa
      const hasEmpresaPattern = this.knowledgeBase.empresaPatterns.some(pattern => 
        lineLower.includes(pattern)
      );

      if (hasEmpresaPattern) {
        // Limpar e extrair o nome da empresa
        let empresa = line.trim();
        
        // Remover caracteres especiais no início/fim
        empresa = empresa.replace(/^[^\w]+|[^\w]+$/g, '');
        
        // Verificar se não é muito curto ou muito longo
        if (empresa.length > 5 && empresa.length < 100) {
          empresas.push({
            nome: empresa,
            confidence: this.calculateEmpresaConfidence(empresa),
            source: 'pattern_match'
          });
        }
      }
    }

    return empresas;
  }

  /**
   * Extrai cargos usando padrões inteligentes
   */
  extractCargos(text) {
    const cargos = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const lineLower = line.toLowerCase().trim();
      
      // Verificar se a linha contém padrões de cargo
      const hasCargoPattern = this.knowledgeBase.cargoPatterns.some(pattern => 
        lineLower.includes(pattern)
      );

      if (hasCargoPattern) {
        let cargo = line.trim();
        
        // Limpar o cargo
        cargo = cargo.replace(/^[^\w]+|[^\w]+$/g, '');
        
        if (cargo.length > 2 && cargo.length < 50) {
          cargos.push({
            nome: cargo,
            confidence: this.calculateCargoConfidence(cargo),
            source: 'pattern_match'
          });
        }
      }
    }

    return cargos;
  }

  /**
   * Extrai períodos completos (empresa + datas + cargo)
   */
  extractPeriodos(text) {
    const periodos = [];
    
    // Tentar diferentes padrões de período
    for (const pattern of this.knowledgeBase.periodPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const startDate = this.parseDate(match[1]);
        const endDate = this.parseDate(match[2]);
        
        if (startDate && endDate) {
          // Procurar empresa e cargo no contexto próximo
          const context = this.getContext(text, match.index, 200);
          const empresa = this.findEmpresaInContext(context);
          const cargo = this.findCargoInContext(context);
          
          periodos.push({
            empresa: empresa || 'Empresa não identificada',
            cargo: cargo || 'Cargo não identificado',
            dataInicio: startDate,
            dataFim: endDate,
            confidence: 0.8,
            source: 'period_pattern'
          });
        }
      }
    }

    return periodos;
  }

  /**
   * Extrai datas do texto
   */
  extractDatas(text) {
    const datas = [];
    
    for (const pattern of this.knowledgeBase.dataPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const date = this.parseDate(match[0]);
        if (date) {
          datas.push({
            data: date,
            formato: match[0],
            confidence: 0.9
          });
        }
      }
    }

    return datas;
  }

  /**
   * Obtém contexto ao redor de uma posição no texto
   */
  getContext(text, position, radius = 100) {
    const start = Math.max(0, position - radius);
    const end = Math.min(text.length, position + radius);
    return text.substring(start, end);
  }

  /**
   * Encontra empresa no contexto
   */
  findEmpresaInContext(context) {
    const empresas = this.extractEmpresas(context);
    return empresas.length > 0 ? empresas[0].nome : null;
  }

  /**
   * Encontra cargo no contexto
   */
  findCargoInContext(context) {
    const cargos = this.extractCargos(context);
    return cargos.length > 0 ? cargos[0].nome : null;
  }

  /**
   * Calcula confiança para empresa
   */
  calculateEmpresaConfidence(empresa) {
    let confidence = 0.5;
    
    // Aumentar confiança se contém padrões típicos
    if (/ltda|s\/a|eireli|me\b|epp\b/i.test(empresa)) confidence += 0.3;
    if (/industria|comercio|servicos/i.test(empresa)) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calcula confiança para cargo
   */
  calculateCargoConfidence(cargo) {
    let confidence = 0.5;
    
    // Aumentar confiança se contém padrões típicos
    if (/auxiliar|assistente|analista|coordenador|gerente/i.test(cargo)) confidence += 0.3;
    if (/tecnico|engenheiro|supervisor/i.test(cargo)) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calcula confiança geral dos dados extraídos
   */
  calculateConfidence(data) {
    let totalConfidence = 0;
    let items = 0;

    // Confiança das empresas
    data.empresas.forEach(empresa => {
      totalConfidence += empresa.confidence || 0.5;
      items++;
    });

    // Confiança dos períodos
    data.periodos.forEach(periodo => {
      totalConfidence += periodo.confidence || 0.5;
      items++;
    });

    return items > 0 ? totalConfidence / items : 0;
  }

  /**
   * Mescla dados de diferentes chunks
   */
  mergeData(target, source) {
    target.empresas.push(...source.empresas);
    target.cargos.push(...source.cargos);
    target.periodos.push(...source.periodos);
    target.datas.push(...source.datas);
  }

  /**
   * Parse inteligente de datas
   */
  parseDate(dateStr) {
    if (!dateStr) return null;

    // Limpar a string
    const cleaned = dateStr.toString().trim();
    
    // Formatos suportados
    const formats = [
      'DD/MM/YYYY',
      'DD-MM-YYYY',
      'YYYY/MM/DD',
      'YYYY-MM-DD',
      'DD/MM/YY',
      'MM/DD/YYYY'
    ];

    for (const format of formats) {
      const parsed = dayjs(cleaned, format, true);
      if (parsed.isValid()) {
        return parsed;
      }
    }

    // Tentar parse automático
    const autoParsed = dayjs(cleaned);
    return autoParsed.isValid() ? autoParsed : null;
  }

  /**
   * Processa dados do Excel usando RAG
   */
  async processExcelWithRAG(data) {
    logger.info('Processando Excel com RAG:', { keys: Object.keys(data).length });

    const periods = [];
    const empresas = [];
    const cargos = [];
    const datas = [];

    // Analisar cada chave-valor
    Object.entries(data).forEach(([key, value]) => {
      const keyLower = key.toLowerCase().trim();
      const valueLower = value.toString().toLowerCase().trim();

      // Identificar empresas (chaves que parecem nomes de empresa)
      if (this.isEmpresaKey(keyLower)) {
        empresas.push({
          nome: key,
          cargo: value,
          confidence: this.calculateEmpresaConfidence(key)
        });
      }

      // Identificar datas
      const date = this.parseDate(value);
      if (date) {
        datas.push({
          data: date,
          contexto: key,
          confidence: 0.9
        });
      }
    });

    // Criar períodos APENAS com dados reais encontrados
    if (empresas.length > 0 && datas.length >= 2) {
      // Só criar períodos se temos empresas E datas reais
      const sortedDates = datas.sort((a, b) => a.data.valueOf() - b.data.valueOf());
      
      empresas.forEach((empresa, index) => {
        // Usar apenas datas reais encontradas, não inventar
        const startDate = sortedDates[index * 2] || sortedDates[0];
        const endDate = sortedDates[index * 2 + 1] || sortedDates[1];
        
        if (startDate && endDate) {
          periods.push({
            company: empresa.nome,
            role: empresa.cargo,
            start_date: startDate.data.format('YYYY-MM-DD'),
            end_date: endDate.data.format('YYYY-MM-DD'),
            raw_text: `${empresa.nome} - ${empresa.cargo}`,
            normalized: {
              company_normalized: this.normalizeCompanyName(empresa.nome),
              role_normalized: empresa.cargo.trim(),
              start_date_parsed: startDate.data.toISOString(),
              end_date_parsed: endDate.data.toISOString(),
              duration_days: endDate.data.diff(startDate.data, 'day'),
              source_format: 'rag_excel',
              confidence: empresa.confidence,
              real_data_only: true
            }
          });
        }
      });
    } else {
      logger.warn('Dados insuficientes para criar períodos - não inventando dados', {
        empresas: empresas.length,
        datas: datas.length
      });
    }

    logger.info('Excel processado com RAG:', { periods: periods.length });
    return periods;
  }

  /**
   * Verifica se uma chave parece ser nome de empresa
   */
  isEmpresaKey(key) {
    return this.knowledgeBase.empresaPatterns.some(pattern => 
      key.includes(pattern)
    ) && key.length > 5;
  }

  /**
   * Normaliza nome da empresa
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
}

module.exports = new RAGService();
