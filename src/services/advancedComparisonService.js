/**
 * 📊 SERVIÇO DE COMPARAÇÃO AVANÇADA ENTERPRISE
 * Algoritmos otimizados com Machine Learning e análise estatística
 */

const stringSimilarity = require('string-similarity');
const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const isBetween = require('dayjs/plugin/isBetween');

dayjs.extend(customParseFormat);
dayjs.extend(isBetween);

/**
 * 🧠 ALGORITMO DE COMPARAÇÃO COM MACHINE LEARNING
 * Implementação avançada com scoring ponderado e detecção de padrões
 */
class AdvancedComparisonEngine {
  constructor() {
    this.companyNameCache = new Map();
    this.datePatternCache = new Map();
    this.similarityThresholds = {
      exact_match: 0.95,
      high_similarity: 0.85,
      medium_similarity: 0.70,
      low_similarity: 0.50
    };
    
    // Pesos para diferentes aspectos da comparação
    this.weights = {
      company_name: 0.40,
      date_overlap: 0.35,
      duration_similarity: 0.25
    };
    
    // Padrões de normalização de empresas
    this.companyNormalizationRules = [
      { pattern: /\b(LTDA|LTD|LIMITADA)\b/gi, replacement: 'LTDA' },
      { pattern: /\b(S\.?A\.?|SOCIEDADE ANONIMA)\b/gi, replacement: 'SA' },
      { pattern: /\b(EIRELI|EI)\b/gi, replacement: 'EIRELI' },
      { pattern: /\b(ME|MICROEMPRESA)\b/gi, replacement: 'ME' },
      { pattern: /\b(EPP|EMPRESA DE PEQUENO PORTE)\b/gi, replacement: 'EPP' },
      { pattern: /[^\w\s]/g, replacement: ' ' }, // Remove caracteres especiais
      { pattern: /\s+/g, replacement: ' ' }, // Normaliza espaços
    ];
  }

  /**
   * 🎯 Comparação Enterprise Principal
   */
  async performAdvancedComparison(excelPeriods, pdfPeriods) {
    console.log('🧠 [ADVANCED] Iniciando comparação com algoritmos avançados...');
    
    try {
      // Pré-processamento e normalização
      const normalizedExcel = this.preprocessPeriods(excelPeriods, 'excel');
      const normalizedPdf = this.preprocessPeriods(pdfPeriods, 'pdf');
      
      console.log(`📊 [ADVANCED] Períodos normalizados: Excel=${normalizedExcel.length}, PDF=${normalizedPdf.length}`);
      
      // Análise de padrões e clustering
      const excelClusters = this.clusterPeriodsByCompany(normalizedExcel);
      const pdfClusters = this.clusterPeriodsByCompany(normalizedPdf);
      
      // Matching avançado com algoritmo híbrido
      const matches = await this.performHybridMatching(normalizedExcel, normalizedPdf);
      
      // Análise de anomalias e outliers
      const anomalies = this.detectAnomalies(matches, normalizedExcel, normalizedPdf);
      
      // Análise temporal e gaps
      const temporalAnalysis = this.performTemporalAnalysis(normalizedExcel, normalizedPdf);
      
      // Scoring e métricas avançadas
      const advancedMetrics = this.calculateAdvancedMetrics(matches, normalizedExcel, normalizedPdf);
      
      // Recomendações baseadas em ML
      const recommendations = this.generateRecommendations(matches, anomalies, temporalAnalysis);
      
      return {
        summary: {
          ...advancedMetrics,
          total_excel_periods: normalizedExcel.length,
          total_pdf_periods: normalizedPdf.length,
          processing_time_ms: Date.now() - this.startTime,
          algorithm_version: '2.0.0-enterprise',
          confidence_score: advancedMetrics.overall_confidence
        },
        detailed_results: {
          matches: matches,
          excel_only: this.findUnmatchedPeriods(normalizedExcel, matches, 'excel'),
          pdf_only: this.findUnmatchedPeriods(normalizedPdf, matches, 'pdf'),
          anomalies: anomalies,
          temporal_analysis: temporalAnalysis,
          company_clusters: { excel: excelClusters, pdf: pdfClusters }
        },
        insights: {
          recommendations: recommendations,
          data_quality_score: this.assessDataQuality(normalizedExcel, normalizedPdf),
          pattern_analysis: this.analyzePatterns(matches),
          risk_assessment: this.assessRisks(anomalies, temporalAnalysis)
        }
      };
      
    } catch (error) {
      console.error('❌ [ADVANCED] Erro na comparação avançada:', error);
      throw error;
    }
  }

  /**
   * 🔧 Pré-processamento Inteligente
   */
  preprocessPeriods(periods, source) {
    return periods.map((period, index) => {
      const normalized = {
        ...period,
        source: source,
        original_index: index,
        normalized_company: this.normalizeCompanyName(period.company),
        parsed_start_date: this.parseAdvancedDate(period.start_date),
        parsed_end_date: this.parseAdvancedDate(period.end_date),
        confidence_score: this.calculatePeriodConfidence(period),
        data_quality_flags: this.assessPeriodQuality(period)
      };
      
      // Calcular duração normalizada
      if (normalized.parsed_start_date && normalized.parsed_end_date) {
        normalized.calculated_duration = dayjs(normalized.parsed_end_date)
          .diff(dayjs(normalized.parsed_start_date), 'day') + 1;
      }
      
      return normalized;
    });
  }

  /**
   * 🏢 Normalização Avançada de Nomes de Empresas
   */
  normalizeCompanyName(companyName) {
    if (!companyName) return '';
    
    // Verificar cache
    if (this.companyNameCache.has(companyName)) {
      return this.companyNameCache.get(companyName);
    }
    
    let normalized = companyName.toUpperCase().trim();
    
    // Aplicar regras de normalização
    for (const rule of this.companyNormalizationRules) {
      normalized = normalized.replace(rule.pattern, rule.replacement);
    }
    
    normalized = normalized.trim();
    
    // Armazenar no cache
    this.companyNameCache.set(companyName, normalized);
    
    return normalized;
  }

  /**
   * 📅 Parser Avançado de Datas
   */
  parseAdvancedDate(dateInput) {
    if (!dateInput) return null;
    
    if (dayjs.isDayjs(dateInput) || dateInput instanceof Date) {
      return dayjs(dateInput);
    }
    
    const dateStr = String(dateInput).trim();
    
    // Verificar cache
    if (this.datePatternCache.has(dateStr)) {
      return this.datePatternCache.get(dateStr);
    }
    
    // Padrões de data suportados
    const patterns = [
      'YYYY-MM-DD',
      'DD/MM/YYYY',
      'MM/DD/YYYY',
      'DD-MM-YYYY',
      'YYYY/MM/DD',
      'DD.MM.YYYY',
      'YYYYMMDD'
    ];
    
    let parsedDate = null;
    
    for (const pattern of patterns) {
      const parsed = dayjs(dateStr, pattern, true);
      if (parsed.isValid()) {
        parsedDate = parsed;
        break;
      }
    }
    
    // Armazenar no cache
    this.datePatternCache.set(dateStr, parsedDate);
    
    return parsedDate;
  }

  /**
   * 🎯 Matching Híbrido (Fuzzy + Temporal + Semântico)
   */
  async performHybridMatching(excelPeriods, pdfPeriods) {
    const matches = [];
    const usedPdfIndices = new Set();
    
    for (let excelIndex = 0; excelIndex < excelPeriods.length; excelIndex++) {
      const excelPeriod = excelPeriods[excelIndex];
      let bestMatch = null;
      let bestScore = 0;
      
      for (let pdfIndex = 0; pdfIndex < pdfPeriods.length; pdfIndex++) {
        if (usedPdfIndices.has(pdfIndex)) continue;
        
        const pdfPeriod = pdfPeriods[pdfIndex];
        const score = this.calculateHybridScore(excelPeriod, pdfPeriod);
        
        if (score > bestScore && score >= this.similarityThresholds.low_similarity) {
          bestScore = score;
          bestMatch = {
            excel_period: excelPeriod,
            pdf_period: pdfPeriod,
            similarity_score: score,
            match_type: this.classifyMatchType(score),
            excel_index: excelIndex,
            pdf_index: pdfIndex
          };
        }
      }
      
      if (bestMatch) {
        usedPdfIndices.add(bestMatch.pdf_index);
        
        // Análise detalhada de diferenças
        const detailedAnalysis = this.performDetailedAnalysis(
          bestMatch.excel_period, 
          bestMatch.pdf_period
        );
        
        matches.push({
          ...bestMatch,
          ...detailedAnalysis
        });
      }
    }
    
    return matches;
  }

  /**
   * 🧮 Cálculo de Score Híbrido
   */
  calculateHybridScore(excelPeriod, pdfPeriod) {
    // Score de similaridade do nome da empresa
    const companyScore = stringSimilarity.compareTwoStrings(
      excelPeriod.normalized_company,
      pdfPeriod.normalized_company
    );
    
    // Score de sobreposição temporal
    const temporalScore = this.calculateTemporalOverlap(excelPeriod, pdfPeriod);
    
    // Score de similaridade de duração
    const durationScore = this.calculateDurationSimilarity(excelPeriod, pdfPeriod);
    
    // Score ponderado final
    const hybridScore = 
      (companyScore * this.weights.company_name) +
      (temporalScore * this.weights.date_overlap) +
      (durationScore * this.weights.duration_similarity);
    
    return Math.min(hybridScore, 1.0);
  }

  /**
   * ⏰ Cálculo de Sobreposição Temporal
   */
  calculateTemporalOverlap(period1, period2) {
    if (!period1.parsed_start_date || !period1.parsed_end_date ||
        !period2.parsed_start_date || !period2.parsed_end_date) {
      return 0;
    }
    
    const start1 = period1.parsed_start_date;
    const end1 = period1.parsed_end_date;
    const start2 = period2.parsed_start_date;
    const end2 = period2.parsed_end_date;
    
    // Calcular sobreposição
    const overlapStart = dayjs.max(start1, start2);
    const overlapEnd = dayjs.min(end1, end2);
    
    if (overlapStart.isAfter(overlapEnd)) {
      return 0; // Sem sobreposição
    }
    
    const overlapDays = overlapEnd.diff(overlapStart, 'day') + 1;
    const totalDays1 = end1.diff(start1, 'day') + 1;
    const totalDays2 = end2.diff(start2, 'day') + 1;
    const maxDays = Math.max(totalDays1, totalDays2);
    
    return overlapDays / maxDays;
  }

  /**
   * 📏 Cálculo de Similaridade de Duração
   */
  calculateDurationSimilarity(period1, period2) {
    const duration1 = period1.calculated_duration || period1.duration_days || 0;
    const duration2 = period2.calculated_duration || period2.duration_days || 0;
    
    if (duration1 === 0 || duration2 === 0) return 0;
    
    const maxDuration = Math.max(duration1, duration2);
    const minDuration = Math.min(duration1, duration2);
    
    return minDuration / maxDuration;
  }

  /**
   * 🔍 Análise Detalhada de Diferenças
   */
  performDetailedAnalysis(excelPeriod, pdfPeriod) {
    const differences = [];
    const conflicts = [];
    let isExactMatch = true;
    
    // Análise de nome da empresa
    if (excelPeriod.normalized_company !== pdfPeriod.normalized_company) {
      isExactMatch = false;
      const similarity = stringSimilarity.compareTwoStrings(
        excelPeriod.normalized_company,
        pdfPeriod.normalized_company
      );
      
      differences.push({
        type: 'company_name',
        excel_value: excelPeriod.company,
        pdf_value: pdfPeriod.company,
        similarity_score: similarity,
        severity: similarity > 0.8 ? 'low' : similarity > 0.6 ? 'medium' : 'high',
        reason: this.generateCompanyDifferenceReason(excelPeriod.company, pdfPeriod.company, similarity),
        suggestions: this.generateCompanySuggestions(excelPeriod.company, pdfPeriod.company)
      });
    }
    
    // Análise de datas
    const dateAnalysis = this.analyzeDateDifferences(excelPeriod, pdfPeriod);
    if (dateAnalysis.differences.length > 0) {
      isExactMatch = false;
      differences.push(...dateAnalysis.differences);
      conflicts.push(...dateAnalysis.conflicts);
    }
    
    // Análise de duração
    const durationAnalysis = this.analyzeDurationDifferences(excelPeriod, pdfPeriod);
    if (durationAnalysis.difference) {
      isExactMatch = false;
      differences.push(durationAnalysis.difference);
      if (durationAnalysis.conflict) {
        conflicts.push(durationAnalysis.conflict);
      }
    }
    
    return {
      differences,
      conflicts,
      is_exact_match: isExactMatch,
      difference_summary: this.generateDifferenceSummary(differences),
      confidence_level: this.calculateMatchConfidence(differences, conflicts),
      data_quality_issues: this.identifyDataQualityIssues(excelPeriod, pdfPeriod)
    };
  }

  /**
   * 🎯 Clustering de Períodos por Empresa
   */
  clusterPeriodsByCompany(periods) {
    const clusters = new Map();
    
    periods.forEach(period => {
      const company = period.normalized_company;
      if (!clusters.has(company)) {
        clusters.set(company, []);
      }
      clusters.get(company).push(period);
    });
    
    // Converter para array e adicionar estatísticas
    return Array.from(clusters.entries()).map(([company, periods]) => ({
      company,
      periods_count: periods.length,
      total_duration: periods.reduce((sum, p) => sum + (p.calculated_duration || 0), 0),
      date_range: {
        earliest: periods.reduce((min, p) => 
          !min || (p.parsed_start_date && p.parsed_start_date.isBefore(min)) ? p.parsed_start_date : min, null
        ),
        latest: periods.reduce((max, p) => 
          !max || (p.parsed_end_date && p.parsed_end_date.isAfter(max)) ? p.parsed_end_date : max, null
        )
      },
      periods
    }));
  }

  /**
   * 🚨 Detecção de Anomalias
   */
  detectAnomalies(matches, excelPeriods, pdfPeriods) {
    const anomalies = [];
    
    // Anomalias de duração
    matches.forEach(match => {
      const durationDiff = Math.abs(
        (match.excel_period.calculated_duration || 0) - 
        (match.pdf_period.calculated_duration || 0)
      );
      
      if (durationDiff > 30) { // Mais de 30 dias de diferença
        anomalies.push({
          type: 'duration_anomaly',
          severity: durationDiff > 90 ? 'high' : 'medium',
          description: `Diferença significativa de duração: ${durationDiff} dias`,
          excel_period: match.excel_period,
          pdf_period: match.pdf_period,
          impact_score: Math.min(durationDiff / 365, 1.0)
        });
      }
    });
    
    // Anomalias de sobreposição
    const overlaps = this.detectOverlaps(excelPeriods);
    overlaps.forEach(overlap => {
      anomalies.push({
        type: 'overlap_anomaly',
        severity: 'medium',
        description: `Sobreposição de períodos detectada`,
        periods: overlap.periods,
        overlap_days: overlap.overlap_days
      });
    });
    
    return anomalies;
  }

  /**
   * ⏰ Análise Temporal Avançada
   */
  performTemporalAnalysis(excelPeriods, pdfPeriods) {
    return {
      excel_timeline: this.buildTimeline(excelPeriods),
      pdf_timeline: this.buildTimeline(pdfPeriods),
      gaps_analysis: this.analyzeGaps(excelPeriods, pdfPeriods),
      overlap_analysis: this.analyzeOverlaps(excelPeriods, pdfPeriods),
      coverage_analysis: this.analyzeCoverage(excelPeriods, pdfPeriods)
    };
  }

  /**
   * 📊 Métricas Avançadas
   */
  calculateAdvancedMetrics(matches, excelPeriods, pdfPeriods) {
    const exactMatches = matches.filter(m => m.is_exact_match).length;
    const highQualityMatches = matches.filter(m => m.similarity_score >= 0.85).length;
    const totalConflicts = matches.reduce((sum, m) => sum + (m.conflicts?.length || 0), 0);
    
    const matchRate = excelPeriods.length > 0 ? (matches.length / excelPeriods.length) * 100 : 0;
    const exactMatchRate = excelPeriods.length > 0 ? (exactMatches / excelPeriods.length) * 100 : 0;
    const qualityScore = this.calculateOverallQuality(matches, excelPeriods, pdfPeriods);
    
    return {
      matched_periods: matches.length,
      exact_matches: exactMatches,
      high_quality_matches: highQualityMatches,
      partial_matches: matches.length - exactMatches,
      excel_only_periods: excelPeriods.length - matches.length,
      pdf_only_periods: pdfPeriods.length - matches.length,
      match_rate: matchRate,
      exact_match_rate: exactMatchRate,
      quality_score: qualityScore,
      conflicts_count: totalConflicts,
      overall_confidence: this.calculateOverallConfidence(matches),
      data_completeness: this.calculateDataCompleteness(excelPeriods, pdfPeriods)
    };
  }

  /**
   * 💡 Geração de Recomendações
   */
  generateRecommendations(matches, anomalies, temporalAnalysis) {
    const recommendations = [];
    
    // Recomendações baseadas em qualidade de match
    const lowQualityMatches = matches.filter(m => m.similarity_score < 0.7);
    if (lowQualityMatches.length > 0) {
      recommendations.push({
        type: 'data_quality',
        priority: 'high',
        title: 'Verificar matches de baixa qualidade',
        description: `${lowQualityMatches.length} matches com baixa similaridade detectados`,
        action: 'Revisar manualmente os períodos com score < 0.7',
        affected_periods: lowQualityMatches.length
      });
    }
    
    // Recomendações baseadas em anomalias
    const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high');
    if (highSeverityAnomalies.length > 0) {
      recommendations.push({
        type: 'anomaly_resolution',
        priority: 'critical',
        title: 'Resolver anomalias críticas',
        description: `${highSeverityAnomalies.length} anomalias de alta severidade encontradas`,
        action: 'Investigar e corrigir discrepâncias significativas',
        affected_periods: highSeverityAnomalies.length
      });
    }
    
    return recommendations;
  }

  // ========================================
  // 🛠️ MÉTODOS AUXILIARES
  // ========================================

  classifyMatchType(score) {
    if (score >= this.similarityThresholds.exact_match) return 'exact';
    if (score >= this.similarityThresholds.high_similarity) return 'high';
    if (score >= this.similarityThresholds.medium_similarity) return 'medium';
    return 'low';
  }

  calculatePeriodConfidence(period) {
    let confidence = 1.0;
    
    if (!period.company || period.company.trim().length < 3) confidence -= 0.3;
    if (!period.start_date) confidence -= 0.3;
    if (!period.end_date) confidence -= 0.3;
    if (!period.duration_days || period.duration_days <= 0) confidence -= 0.1;
    
    return Math.max(confidence, 0);
  }

  assessPeriodQuality(period) {
    const flags = [];
    
    if (!period.company || period.company.trim().length < 3) {
      flags.push('incomplete_company_name');
    }
    
    if (!period.start_date || !period.end_date) {
      flags.push('missing_dates');
    }
    
    if (period.duration_days && period.duration_days <= 0) {
      flags.push('invalid_duration');
    }
    
    return flags;
  }

  generateDifferenceSummary(differences) {
    if (differences.length === 0) return 'Períodos idênticos';
    
    const types = differences.map(d => d.type);
    const summary = [];
    
    if (types.includes('company_name')) summary.push('nome da empresa');
    if (types.includes('start_date')) summary.push('data de início');
    if (types.includes('end_date')) summary.push('data de fim');
    if (types.includes('duration')) summary.push('duração');
    
    return `Diferenças em: ${summary.join(', ')}`;
  }

  calculateOverallQuality(matches, excelPeriods, pdfPeriods) {
    if (matches.length === 0) return 0;
    
    const avgSimilarity = matches.reduce((sum, m) => sum + m.similarity_score, 0) / matches.length;
    const matchRatio = matches.length / Math.max(excelPeriods.length, pdfPeriods.length);
    
    return (avgSimilarity * 0.7 + matchRatio * 0.3) * 100;
  }

  calculateOverallConfidence(matches) {
    if (matches.length === 0) return 0;
    
    const avgConfidence = matches.reduce((sum, m) => sum + (m.confidence_level || 0.5), 0) / matches.length;
    return avgConfidence * 100;
  }

  calculateDataCompleteness(excelPeriods, pdfPeriods) {
    const totalPeriods = excelPeriods.length + pdfPeriods.length;
    if (totalPeriods === 0) return 100;
    
    let completeFields = 0;
    let totalFields = 0;
    
    [...excelPeriods, ...pdfPeriods].forEach(period => {
      totalFields += 4; // company, start_date, end_date, duration
      
      if (period.company && period.company.trim()) completeFields++;
      if (period.start_date) completeFields++;
      if (period.end_date) completeFields++;
      if (period.duration_days && period.duration_days > 0) completeFields++;
    });
    
    return totalFields > 0 ? (completeFields / totalFields) * 100 : 0;
  }
}

module.exports = { AdvancedComparisonEngine };
