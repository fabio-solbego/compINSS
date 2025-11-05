const dayjs = require('dayjs');
const minMax = require('dayjs/plugin/minMax');
dayjs.extend(minMax);
const stringSimilarity = require('string-similarity');
const _ = require('lodash');
const winston = require('winston');
const EmploymentPeriod = require('../models/EmploymentPeriod');
const Comparacao = require('../models/Comparacao');
const Log = require('../models/Log');

// Configuração do logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/comparison.log' }),
    new winston.transports.Console()
  ]
});

/**
 * Executa a comparação entre períodos do Excel e PDF
 */
async function performComparison(comparisonId, excelUpload, pdfUpload) {
  try {
    logger.info('Iniciando comparação:', { comparisonId });
    
    // Atualizar status para processando
    const comparison = await Comparacao.findById(comparisonId);
    await comparison.updateStatus('processing');
    
    await Log.info('Carregando períodos dos arquivos', {}, comparisonId);
    
    // Carregar períodos de ambos os arquivos
    const excelPeriods = await EmploymentPeriod.findByUploadId(excelUpload.id);
    const pdfPeriods = await EmploymentPeriod.findByUploadId(pdfUpload.id);
    
    logger.info('Períodos carregados:', {
      comparisonId,
      excelCount: excelPeriods.length,
      pdfCount: pdfPeriods.length
    });
    
    // await Log.info('Períodos carregados', {
    //   excel_periods: excelPeriods.length,
    //   pdf_periods: pdfPeriods.length
    // }, comparisonId);
    
    // Executar comparação
    console.log('🔄 [COMPARISON] Executando lógica de comparação...');
    const comparisonResult = await compareEmploymentPeriods(
      excelPeriods, 
      pdfPeriods, 
      comparisonId
    );
    
    console.log('📊 [COMPARISON] Resultado da comparação gerado:', {
      comparisonId,
      totalMatches: comparisonResult.summary?.total_matches || 0,
      totalDiscrepancies: comparisonResult.summary?.total_discrepancies || 0
    });
    
    // Análise especializada INSS - com verificação de segurança
    if (comparisonResult && comparisonResult.detailed_results) {
      comparisonResult.inss_analysis = performINSSSpecializedAnalysis(
        comparisonResult, 
        comparisonResult.detailed_results.matches || [], 
        comparisonResult.detailed_results.excel_only || [], 
        comparisonResult.detailed_results.pdf_only || []
      );
      
      console.log(`🏛️ [INSS] Análise especializada: ${comparisonResult.inss_analysis.tempo_comum_nao_computado?.length || 0} períodos não computados, ${comparisonResult.inss_analysis.periodos_omissos?.length || 0} omissões identificadas`);
    } else {
      console.log('⚠️ [INSS] Pulando análise especializada - resultado de comparação inválido');
      comparisonResult.inss_analysis = {
        tempo_comum_nao_computado: [],
        periodos_omissos: [],
        periodos_especiais: [],
        periodos_rurais: []
      };
    }
    
    // 🧾 Salva o resultado completo na tabela comparacao
    console.log('💾 [COMPARISON] Salvando resultado completo no banco...');
    
    // Preparar resultado completo
    const resultadoCompleto = {
      summary: comparisonResult.summary,
      detailed_results: comparisonResult.detailed_results || null,
      excel_periods_count: excelPeriods.length,
      pdf_periods_count: pdfPeriods.length,
      processed_at: new Date().toISOString()
    };
    
    await comparison.updateResultado(resultadoCompleto);
    await comparison.updateStatus('done');
    
    console.log('✅ [COMPARISON] Comparação salva com sucesso:', { comparisonId });
    logger.info('Comparação concluída:', { comparisonId, result: comparisonResult.summary });
    
    return comparisonResult;
    
  } catch (error) {
    logger.error('Erro na comparação:', { comparisonId, error: error.message });
    
    // Atualizar status para erro
    const comparison = await Comparacao.findById(comparisonId);
    if (comparison) {
      await comparison.updateStatus('error', error.message);
    }
    
    // await Log.error('Erro na comparação', { error: error.message }, comparisonId);
    throw error;
  }
}

/**
 * Função principal de comparação enterprise com análise detalhada de diferenças
 */
async function compareEmploymentPeriods(excelPeriods, pdfPeriods, comparisonId) {
  console.log('🔄 [COMPARISON] Iniciando comparação enterprise avançada...');
  console.log(`📊 [COMPARISON] Excel: ${excelPeriods.length} períodos, PDF: ${pdfPeriods.length} períodos`);
  
  // Normalizar e enriquecer dados
  const normalizedExcel = excelPeriods.map((period, index) => ({
    ...period,
    index: index,
    source: 'excel',
    company_normalized: normalizeCompanyName(period.company || period.company_name || ''),
    start_date: parseDate(period.start_date),
    end_date: parseDate(period.end_date),
    duration_days: calculateDuration(period.start_date, period.end_date),
    original_company: period.company || period.company_name || '',
    original_start: period.start_date,
    original_end: period.end_date
  }));
  
  const normalizedPdf = pdfPeriods.map((period, index) => ({
    ...period,
    index: index,
    source: 'pdf',
    company_normalized: normalizeCompanyName(period.company || period.company_name || ''),
    start_date: parseDate(period.start_date),
    end_date: parseDate(period.end_date),
    duration_days: calculateDuration(period.start_date, period.end_date),
    original_company: period.company || period.company_name || '',
    original_start: period.start_date,
    original_end: period.end_date
  }));
  
  console.log('📊 [COMPARISON] Dados normalizados e enriquecidos');
  
  // Encontrar matches usando algoritmo enterprise
  const matches = [];
  const partialMatches = [];
  const usedPdfIndices = new Set();
  
  for (const excelPeriod of normalizedExcel) {
    let bestMatch = null;
    let bestScore = 0;
    let bestPdfIndex = -1;
    
    for (let pdfIndex = 0; pdfIndex < normalizedPdf.length; pdfIndex++) {
      if (usedPdfIndices.has(pdfIndex)) continue;
      
      const pdfPeriod = normalizedPdf[pdfIndex];
      const score = calculateEnterpriseScore(excelPeriod, pdfPeriod);
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = pdfPeriod;
        bestPdfIndex = pdfIndex;
      }
    }
    
    if (bestMatch && bestScore >= 0.3) {
      usedPdfIndices.add(bestPdfIndex);
      
      const detailedAnalysis = analyzeDetailedDifferences(excelPeriod, bestMatch);
      
      const matchData = {
        excel_period: {
          company: excelPeriod.original_company,
          start_date: formatDate(excelPeriod.start_date),
          end_date: formatDate(excelPeriod.end_date),
          duration_days: excelPeriod.duration_days,
          index: excelPeriod.index
        },
        pdf_period: {
          company: bestMatch.original_company,
          start_date: formatDate(bestMatch.start_date),
          end_date: formatDate(bestMatch.end_date),
          duration_days: bestMatch.duration_days,
          index: bestMatch.index
        },
        similarity_score: bestScore,
        match_type: bestScore >= 0.8 ? 'high' : bestScore >= 0.6 ? 'medium' : 'low',
        confidence_score: bestScore * 100,
        differences: detailedAnalysis.differences,
        difference_summary: detailedAnalysis.summary,
        conflicts: detailedAnalysis.conflicts,
        is_exact_match: detailedAnalysis.isExactMatch
      };
      
      if (bestScore >= 0.5) {
        matches.push(matchData);
      } else {
        partialMatches.push(matchData);
      }
    }
  }
  
  // Identificar períodos únicos com análise detalhada
  const usedExcelIndices = new Set(matches.map(m => m.excel_period.index));
  const excelOnly = normalizedExcel
    .filter((_, index) => !usedExcelIndices.has(index))
    .map(period => ({
      company: period.original_company,
      start_date: formatDate(period.start_date),
      end_date: formatDate(period.end_date),
      duration_days: period.duration_days,
      index: period.index,
      reason: 'Período presente apenas no Excel - não encontrado correspondência no PDF',
      analysis: analyzeStandalonePeriod(period, 'excel')
    }));
  
  const pdfOnly = normalizedPdf
    .filter((_, index) => !usedPdfIndices.has(index))
    .map(period => ({
      company: period.original_company,
      start_date: formatDate(period.start_date),
      end_date: formatDate(period.end_date),
      duration_days: period.duration_days,
      index: period.index,
      reason: 'Período presente apenas no PDF - não encontrado correspondência no Excel',
      analysis: analyzeStandalonePeriod(period, 'pdf')
    }));
  
  // Análise de sobreposições e lacunas
  const overlapAnalysis = analyzePeriodsOverlap(normalizedExcel, normalizedPdf);
  const gapAnalysis = analyzePeriodsGaps(normalizedExcel, normalizedPdf);
  
  // Calcular métricas enterprise
  const totalExcelPeriods = normalizedExcel.length;
  const totalPdfPeriods = normalizedPdf.length;
  const matchedPeriods = matches.length;
  const conflictsCount = matches.reduce((sum, match) => sum + (match.conflicts ? match.conflicts.length : 0), 0);
  
  const matchRate = totalExcelPeriods > 0 ? (matchedPeriods / totalExcelPeriods) * 100 : 0;
  const accuracyScore = calculateEnterpriseAccuracy(matches);
  const qualityScore = calculateQualityScore(matches, excelOnly, pdfOnly, conflictsCount);
  
  // Calcular totais de dias
  const totalDaysExcel = normalizedExcel.reduce((sum, p) => sum + (p.duration_days || 0), 0);
  const totalDaysPdf = normalizedPdf.reduce((sum, p) => sum + (p.duration_days || 0), 0);
  const daysDifference = Math.abs(totalDaysExcel - totalDaysPdf);
  
  const result = {
    summary: {
      total_excel_periods: totalExcelPeriods,
      total_pdf_periods: totalPdfPeriods,
      matched_periods: matchedPeriods,
      partial_matches: partialMatches.length,
      excel_only_periods: excelOnly.length,
      pdf_only_periods: pdfOnly.length,
      conflicts_count: conflictsCount,
      match_rate: matchRate,
      accuracy_score: accuracyScore,
      quality_score: qualityScore,
      total_days_excel: totalDaysExcel,
      total_days_pdf: totalDaysPdf,
      days_difference: daysDifference,
      coverage_excel: matchRate,
      coverage_pdf: totalPdfPeriods > 0 ? (matchedPeriods / totalPdfPeriods) * 100 : 0,
      overlaps_found: overlapAnalysis.overlaps.length,
      gaps_found: gapAnalysis.gaps.length
    },
    detailed_results: {
      matches: matches,
      partial_matches: partialMatches,
      excel_only: excelOnly,
      pdf_only: pdfOnly,
      overlaps: overlapAnalysis.overlaps,
      gaps: gapAnalysis.gaps,
      timeline_analysis: generateTimelineAnalysis(normalizedExcel, normalizedPdf)
    },
    processed_at: new Date().toISOString(),
    comparison_type: 'enterprise_advanced_detailed'
  };
  
  console.log('✅ [COMPARISON] Comparação enterprise avançada concluída');
  console.log(`📊 [COMPARISON] Matches: ${matchedPeriods}, Parciais: ${partialMatches.length}, Conflitos: ${conflictsCount}`);
  console.log(`📊 [COMPARISON] Taxa: ${matchRate.toFixed(1)}%, Sobreposições: ${overlapAnalysis.overlaps.length}, Lacunas: ${gapAnalysis.gaps.length}`);
  
  return result;
}

/**
 * Encontrar melhor match para um período do Excel - ALGORITMO AVANÇADO
 */
function findBestMatch(excelPeriod, pdfPeriods) {
  let bestMatch = null;
  let bestScore = 0;
  let bestAnalysis = null;
  
  // Análise multi-dimensional para cada período PDF
  for (const pdfPeriod of pdfPeriods) {
    const analysis = performAdvancedMatching(excelPeriod, pdfPeriod);
    
    if (analysis.composite_score > bestScore && analysis.composite_score >= 0.5) {
      bestScore = analysis.composite_score;
      bestMatch = pdfPeriod;
      bestAnalysis = analysis;
    }
  }
  
  return bestMatch ? { 
    match: bestMatch, 
    score: bestScore,
    analysis: bestAnalysis,
    confidence_level: calculateConfidenceLevel(bestAnalysis)
  } : null;
}

// Análise avançada de matching multi-dimensional
function performAdvancedMatching(excelPeriod, pdfPeriod) {
  console.log('🧠 [ADVANCED] Análise multi-dimensional iniciada...');
  
  // 1. Similaridade de empresa (com fuzzy logic avançado)
  const companySimilarity = calculateAdvancedCompanySimilarity(
    excelPeriod.company, 
    pdfPeriod.company
  );
  
  // 2. Análise temporal inteligente
  const temporalAnalysis = performIntelligentTemporalAnalysis(
    excelPeriod, 
    pdfPeriod
  );
  
  // 3. Detecção de padrões contextuais
  const contextualPatterns = detectContextualPatterns(
    excelPeriod, 
    pdfPeriod
  );
  
  // 4. Análise de anomalias
  const anomalyDetection = detectAnomalies(excelPeriod, pdfPeriod);
  
  // 5. Score composto com pesos inteligentes
  const weights = calculateDynamicWeights(excelPeriod, pdfPeriod);
  
  const composite_score = (
    companySimilarity.score * weights.company +
    temporalAnalysis.score * weights.temporal +
    contextualPatterns.score * weights.contextual +
    anomalyDetection.reliability_score * weights.reliability
  );
  
  return {
    composite_score,
    company_similarity: companySimilarity,
    temporal_analysis: temporalAnalysis,
    contextual_patterns: contextualPatterns,
    anomaly_detection: anomalyDetection,
    weights,
    match_quality: getMatchQuality(composite_score),
    risk_level: calculateRiskLevel(anomalyDetection, composite_score)
  };
}

// Similaridade avançada de empresa com fuzzy logic e cache
function calculateAdvancedCompanySimilarity(company1, company2) {
  if (!company1 || !company2) {
    return { score: 0, method: 'null_values', details: 'Valores nulos detectados' };
  }
  
  // Verificar cache primeiro
  const cached = getCachedSimilarity(company1, company2);
  if (cached) {
    return cached;
  }
  
  const c1 = normalizeCompanyName(company1);
  const c2 = normalizeCompanyName(company2);
  
  // 1. Match exato
  if (c1 === c2) {
    const result = { score: 1.0, method: 'exact_match', details: 'Match exato' };
    setCachedSimilarity(company1, company2, result);
    return result;
  }
  
  // 2. Fuzzy matching com múltiplas técnicas
  const levenshtein = 1 - (levenshteinDistance(c1, c2) / Math.max(c1.length, c2.length));
  const jaro = calculateJaroSimilarity(c1, c2);
  const jaccard = calculateJaccardSimilarity(c1, c2);
  const soundex = calculateSoundexSimilarity(c1, c2);
  
  // 3. Análise de palavras-chave importantes
  const keywordMatch = calculateKeywordSimilarity(c1, c2);
  
  // 4. Detecção de abreviações e siglas
  const abbreviationMatch = detectAbbreviations(c1, c2);
  
  // Score composto com pesos otimizados
  const score = (
    levenshtein * 0.25 +
    jaro * 0.25 +
    jaccard * 0.20 +
    keywordMatch * 0.15 +
    abbreviationMatch * 0.10 +
    soundex * 0.05
  );
  
  const result = {
    score: Math.min(score, 1.0),
    method: 'advanced_fuzzy',
    details: {
      levenshtein,
      jaro,
      jaccard,
      keyword_match: keywordMatch,
      abbreviation_match: abbreviationMatch,
      soundex
    }
  };
  
  // Salvar no cache
  setCachedSimilarity(company1, company2, result);
  return result;
}

// Análise temporal inteligente
function performIntelligentTemporalAnalysis(period1, period2) {
  const start1 = new Date(period1.start_date);
  const end1 = new Date(period1.end_date);
  const start2 = new Date(period2.start_date);
  const end2 = new Date(period2.end_date);
  
  // 1. Sobreposição temporal
  const overlap = calculateDateOverlap(period1, period2);
  
  // 2. Análise de proximidade temporal
  const startProximity = calculateDateProximity(start1, start2);
  const endProximity = calculateDateProximity(end1, end2);
  
  // 3. Análise de duração
  const duration1 = Math.abs(end1 - start1) / (1000 * 60 * 60 * 24);
  const duration2 = Math.abs(end2 - start2) / (1000 * 60 * 60 * 24);
  const durationSimilarity = 1 - Math.abs(duration1 - duration2) / Math.max(duration1, duration2);
  
  // 4. Detecção de padrões temporais
  const temporalPatterns = detectTemporalPatterns(period1, period2);
  
  // Score temporal composto
  const score = (
    overlap * 0.4 +
    startProximity * 0.25 +
    endProximity * 0.25 +
    durationSimilarity * 0.1
  ) * temporalPatterns.multiplier;
  
  return {
    score: Math.min(score, 1.0),
    overlap,
    start_proximity: startProximity,
    end_proximity: endProximity,
    duration_similarity: durationSimilarity,
    temporal_patterns: temporalPatterns,
    analysis_type: 'intelligent_temporal'
  };
}

// Detecção de padrões contextuais
function detectContextualPatterns(period1, period2) {
  const patterns = {
    same_year: isSameYear(period1, period2),
    sequential_periods: areSequentialPeriods(period1, period2),
    overlapping_periods: areOverlappingPeriods(period1, period2),
    similar_duration: hasSimilarDuration(period1, period2),
    same_company_group: belongToSameCompanyGroup(period1.company, period2.company)
  };
  
  // Calcular score baseado nos padrões detectados
  let score = 0;
  let patternCount = 0;
  
  Object.values(patterns).forEach(pattern => {
    if (pattern.detected) {
      score += pattern.weight;
      patternCount++;
    }
  });
  
  return {
    score: Math.min(score, 1.0),
    patterns,
    pattern_count: patternCount,
    context_strength: patternCount > 2 ? 'strong' : patternCount > 0 ? 'moderate' : 'weak'
  };
}

// Detecção de anomalias
function detectAnomalies(period1, period2) {
  const anomalies = [];
  let reliability_score = 1.0;
  
  // 1. Anomalias temporais
  const temporalAnomalies = detectTemporalAnomalies(period1, period2);
  anomalies.push(...temporalAnomalies);
  
  // 2. Anomalias de empresa
  const companyAnomalies = detectCompanyAnomalies(period1.company, period2.company);
  anomalies.push(...companyAnomalies);
  
  // 3. Anomalias de duração
  const durationAnomalies = detectDurationAnomalies(period1, period2);
  anomalies.push(...durationAnomalies);
  
  // Reduzir confiabilidade baseado nas anomalias
  anomalies.forEach(anomaly => {
    reliability_score *= (1 - anomaly.impact);
  });
  
  return {
    anomalies,
    anomaly_count: anomalies.length,
    reliability_score: Math.max(reliability_score, 0.1),
    risk_level: anomalies.length > 2 ? 'high' : anomalies.length > 0 ? 'medium' : 'low'
  };
}

// Calcular pesos dinâmicos baseado no contexto
function calculateDynamicWeights(period1, period2) {
  // Pesos base
  let weights = {
    company: 0.4,
    temporal: 0.35,
    contextual: 0.15,
    reliability: 0.1
  };
  
  // Ajustar pesos baseado no contexto
  const duration1 = calculatePeriodDuration(period1);
  const duration2 = calculatePeriodDuration(period2);
  
  // Para períodos curtos, dar mais peso à empresa
  if (duration1 < 90 || duration2 < 90) {
    weights.company += 0.1;
    weights.temporal -= 0.05;
    weights.contextual -= 0.05;
  }
  
  // Para períodos longos, dar mais peso ao temporal
  if (duration1 > 365 || duration2 > 365) {
    weights.temporal += 0.1;
    weights.company -= 0.05;
    weights.contextual -= 0.05;
  }
  
  return weights;
}

// ========================================
// 🚀 SISTEMA DE CACHE INTELIGENTE
// ========================================

// Cache para resultados de comparação
const comparisonCache = new Map();
const similarityCache = new Map();
const CACHE_TTL = 1000 * 60 * 30; // 30 minutos

// Gerar chave única para cache
function generateCacheKey(data) {
  const hash = require('crypto').createHash('md5');
  hash.update(JSON.stringify(data));
  return hash.digest('hex');
}

// Cache inteligente para similaridade de empresas
function getCachedSimilarity(company1, company2) {
  const key = `${normalizeCompanyName(company1)}_${normalizeCompanyName(company2)}`;
  const reverseKey = `${normalizeCompanyName(company2)}_${normalizeCompanyName(company1)}`;
  
  const cached = similarityCache.get(key) || similarityCache.get(reverseKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.result;
  }
  
  return null;
}

function setCachedSimilarity(company1, company2, result) {
  const key = `${normalizeCompanyName(company1)}_${normalizeCompanyName(company2)}`;
  similarityCache.set(key, {
    result,
    timestamp: Date.now()
  });
  
  // Limpar cache antigo
  if (similarityCache.size > 1000) {
    const oldEntries = Array.from(similarityCache.entries())
      .filter(([, value]) => Date.now() - value.timestamp > CACHE_TTL);
    oldEntries.forEach(([key]) => similarityCache.delete(key));
  }
}

// ========================================
// 🧠 FUNÇÕES AUXILIARES AVANÇADAS
// ========================================

// Distância de Levenshtein otimizada
function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

// Similaridade Jaro-Winkler
function calculateJaroSimilarity(str1, str2) {
  if (str1 === str2) return 1.0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  
  const matches1 = new Array(len1).fill(false);
  const matches2 = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Encontrar matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (matches2[j] || str1[i] !== str2[j]) continue;
      matches1[i] = matches2[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  // Contar transposições
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!matches1[i]) continue;
    while (!matches2[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }
  
  return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3.0;
}

// Similaridade Jaccard
function calculateJaccardSimilarity(str1, str2) {
  const set1 = new Set(str1.toLowerCase().split(''));
  const set2 = new Set(str2.toLowerCase().split(''));
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

// Similaridade Soundex (fonética)
function calculateSoundexSimilarity(str1, str2) {
  const soundex1 = generateSoundex(str1);
  const soundex2 = generateSoundex(str2);
  return soundex1 === soundex2 ? 1.0 : 0.0;
}

function generateSoundex(str) {
  const code = str.toUpperCase().replace(/[^A-Z]/g, '');
  if (!code) return '0000';
  
  let soundex = code[0];
  const mapping = {
    'BFPV': '1', 'CGJKQSXZ': '2', 'DT': '3',
    'L': '4', 'MN': '5', 'R': '6'
  };
  
  for (let i = 1; i < code.length && soundex.length < 4; i++) {
    const char = code[i];
    for (const [chars, digit] of Object.entries(mapping)) {
      if (chars.includes(char) && soundex[soundex.length - 1] !== digit) {
        soundex += digit;
        break;
      }
    }
  }
  
  return soundex.padEnd(4, '0').substring(0, 4);
}

// Similaridade de palavras-chave
function calculateKeywordSimilarity(company1, company2) {
  const keywords1 = extractKeywords(company1);
  const keywords2 = extractKeywords(company2);
  
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  
  const matches = keywords1.filter(k1 => 
    keywords2.some(k2 => k1.includes(k2) || k2.includes(k1))
  );
  
  return matches.length / Math.max(keywords1.length, keywords2.length);
}

function extractKeywords(company) {
  const stopWords = ['ltda', 'sa', 'eireli', 'me', 'epp', 'da', 'de', 'do', 'e', 'em'];
  return company.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
}

// Detecção de abreviações
function detectAbbreviations(company1, company2) {
  const abbrev1 = generateAbbreviation(company1);
  const abbrev2 = generateAbbreviation(company2);
  
  if (abbrev1 === abbrev2) return 1.0;
  if (company1.includes(abbrev2) || company2.includes(abbrev1)) return 0.8;
  
  return 0.0;
}

function generateAbbreviation(company) {
  return company.split(/\s+/)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}

// Proximidade de datas
function calculateDateProximity(date1, date2) {
  const diffDays = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);
  
  if (diffDays === 0) return 1.0;
  if (diffDays <= 7) return 0.9;
  if (diffDays <= 30) return 0.7;
  if (diffDays <= 90) return 0.5;
  if (diffDays <= 180) return 0.3;
  
  return Math.max(0.1, 1 / (1 + diffDays / 365));
}

// Detecção de padrões temporais
function detectTemporalPatterns(period1, period2) {
  let multiplier = 1.0;
  const patterns = [];
  
  // Mesmo mês de início
  const start1 = new Date(period1.start_date);
  const start2 = new Date(period2.start_date);
  
  if (start1.getMonth() === start2.getMonth()) {
    patterns.push('same_start_month');
    multiplier *= 1.1;
  }
  
  // Períodos consecutivos
  const end1 = new Date(period1.end_date);
  const daysDiff = Math.abs(start2 - end1) / (1000 * 60 * 60 * 24);
  
  if (daysDiff <= 30) {
    patterns.push('consecutive_periods');
    multiplier *= 1.2;
  }
  
  return { multiplier, patterns };
}

// Funções de análise de padrões contextuais
function isSameYear(period1, period2) {
  const year1 = new Date(period1.start_date).getFullYear();
  const year2 = new Date(period2.start_date).getFullYear();
  return { detected: year1 === year2, weight: 0.2 };
}

function areSequentialPeriods(period1, period2) {
  const end1 = new Date(period1.end_date);
  const start2 = new Date(period2.start_date);
  const daysDiff = Math.abs(start2 - end1) / (1000 * 60 * 60 * 24);
  return { detected: daysDiff <= 30, weight: 0.3 };
}

function areOverlappingPeriods(period1, period2) {
  const overlap = calculateDateOverlap(period1, period2);
  return { detected: overlap > 0, weight: 0.4 };
}

function hasSimilarDuration(period1, period2) {
  const duration1 = calculatePeriodDuration(period1);
  const duration2 = calculatePeriodDuration(period2);
  const ratio = Math.min(duration1, duration2) / Math.max(duration1, duration2);
  return { detected: ratio > 0.8, weight: 0.1 };
}

function belongToSameCompanyGroup(company1, company2) {
  const keywords1 = extractKeywords(company1);
  const keywords2 = extractKeywords(company2);
  const commonKeywords = keywords1.filter(k => keywords2.includes(k));
  return { detected: commonKeywords.length > 0, weight: 0.2 };
}

// Detecção de anomalias específicas
function detectTemporalAnomalies(period1, period2) {
  const anomalies = [];
  
  // Sobreposição excessiva
  const overlap = calculateDateOverlap(period1, period2);
  if (overlap > 0.8) {
    anomalies.push({
      type: 'excessive_overlap',
      description: 'Sobreposição temporal excessiva',
      impact: 0.3
    });
  }
  
  // Lacuna temporal muito grande
  const gap = calculateTemporalGap(period1, period2);
  if (gap > 365) {
    anomalies.push({
      type: 'large_temporal_gap',
      description: 'Lacuna temporal muito grande',
      impact: 0.2
    });
  }
  
  return anomalies;
}

function detectCompanyAnomalies(company1, company2) {
  const anomalies = [];
  
  // Empresas muito diferentes
  const similarity = calculateAdvancedCompanySimilarity(company1, company2);
  if (similarity.score < 0.3) {
    anomalies.push({
      type: 'low_company_similarity',
      description: 'Baixa similaridade entre empresas',
      impact: 0.4
    });
  }
  
  return anomalies;
}

function detectDurationAnomalies(period1, period2) {
  const anomalies = [];
  
  const duration1 = calculatePeriodDuration(period1);
  const duration2 = calculatePeriodDuration(period2);
  
  // Diferença de duração muito grande
  const ratio = Math.min(duration1, duration2) / Math.max(duration1, duration2);
  if (ratio < 0.3) {
    anomalies.push({
      type: 'duration_mismatch',
      description: 'Grande diferença na duração dos períodos',
      impact: 0.2
    });
  }
  
  return anomalies;
}

// Funções de qualidade e confiança
function getMatchQuality(score) {
  if (score >= 0.9) return 'EXCELENTE';
  if (score >= 0.8) return 'BOM';
  if (score >= 0.7) return 'REGULAR';
  if (score >= 0.6) return 'BAIXO';
  return 'MUITO_BAIXO';
}

function calculateRiskLevel(anomalyDetection, compositeScore) {
  if (anomalyDetection.anomaly_count > 2 || compositeScore < 0.6) return 'HIGH';
  if (anomalyDetection.anomaly_count > 0 || compositeScore < 0.8) return 'MEDIUM';
  return 'LOW';
}

function calculateConfidenceLevel(analysis) {
  const baseConfidence = analysis.composite_score;
  const anomalyPenalty = analysis.anomaly_detection.anomaly_count * 0.1;
  const contextBonus = analysis.contextual_patterns.pattern_count * 0.05;
  
  return Math.max(0.1, Math.min(1.0, baseConfidence - anomalyPenalty + contextBonus));
}

function calculateTemporalGap(period1, period2) {
  const end1 = new Date(period1.end_date);
  const start2 = new Date(period2.start_date);
  return Math.abs(start2 - end1) / (1000 * 60 * 60 * 24);
}

// Analisar sobreposições entre períodos
function analyzePeriodsOverlap(excelPeriods, pdfPeriods) {
  console.log('🔍 [ANALYSIS] Analisando sobreposições entre períodos...');
  
  const overlaps = [];
  
  // Verificar se os arrays existem e são válidos
  if (!Array.isArray(excelPeriods) || !Array.isArray(pdfPeriods)) {
    console.log('⚠️ [ANALYSIS] Arrays de períodos inválidos, retornando análise vazia');
    return { overlaps: [] };
  }
  
  // Analisar sobreposições dentro do Excel
  for (let i = 0; i < excelPeriods.length; i++) {
    for (let j = i + 1; j < excelPeriods.length; j++) {
      if (!excelPeriods[i] || !excelPeriods[j]) continue;
      
      const overlap = calculateDateOverlap(excelPeriods[i], excelPeriods[j]);
      if (overlap > 0) {
        overlaps.push({
          type: 'excel_internal_overlap',
          period1: excelPeriods[i],
          period2: excelPeriods[j],
          overlap_days: overlap,
          severity: overlap > 30 ? 'high' : overlap > 7 ? 'medium' : 'low',
          source: 'excel'
        });
      }
    }
  }
  
  // Analisar sobreposições dentro do PDF
  for (let i = 0; i < pdfPeriods.length; i++) {
    for (let j = i + 1; j < pdfPeriods.length; j++) {
      if (!pdfPeriods[i] || !pdfPeriods[j]) continue;
      
      const overlap = calculateDateOverlap(pdfPeriods[i], pdfPeriods[j]);
      if (overlap > 0) {
        overlaps.push({
          type: 'pdf_internal_overlap',
          period1: pdfPeriods[i],
          period2: pdfPeriods[j],
          overlap_days: overlap,
          severity: overlap > 30 ? 'high' : overlap > 7 ? 'medium' : 'low',
          source: 'pdf'
        });
      }
    }
  }
  
  // Analisar sobreposições entre Excel e PDF
  for (const excelPeriod of excelPeriods) {
    if (!excelPeriod) continue;
    
    for (const pdfPeriod of pdfPeriods) {
      if (!pdfPeriod) continue;
      
      const overlap = calculateDateOverlap(excelPeriod, pdfPeriod);
      if (overlap > 0) {
        const companySimilarity = calculateAdvancedCompanySimilarity(
          excelPeriod.company || '', 
          pdfPeriod.company || ''
        );
        
        // Se as empresas são diferentes mas há sobreposição temporal
        if (companySimilarity && companySimilarity.score < 0.7) {
          overlaps.push({
            type: 'cross_document_overlap',
            period1: excelPeriod,
            period2: pdfPeriod,
            overlap_days: overlap,
            severity: overlap > 30 ? 'high' : overlap > 7 ? 'medium' : 'low',
            source: 'cross_reference',
            company_similarity: companySimilarity.score
          });
        }
      }
    }
  }
  
  return {
    overlaps,
    overlap_count: overlaps.length,
    high_severity_count: overlaps.filter(o => o.severity === 'high').length,
    medium_severity_count: overlaps.filter(o => o.severity === 'medium').length,
    low_severity_count: overlaps.filter(o => o.severity === 'low').length,
    total_overlap_days: overlaps.reduce((sum, o) => sum + o.overlap_days, 0),
    risk_assessment: assessOverlapRisk(overlaps)
  };
}

// Analisar lacunas entre períodos
function analyzePeriodsGaps(excelPeriods, pdfPeriods) {
  console.log('🔍 [ANALYSIS] Analisando lacunas entre períodos...');
  
  const gaps = [];
  
  // Verificar se os arrays existem e são válidos
  if (!Array.isArray(excelPeriods) || !Array.isArray(pdfPeriods)) {
    console.log('⚠️ [ANALYSIS] Arrays de períodos inválidos para análise de lacunas');
    return { gaps: [], gap_count: 0, high_severity_count: 0, medium_severity_count: 0, low_severity_count: 0, total_gap_days: 0 };
  }
  
  // Analisar lacunas no Excel
  const validExcelPeriods = excelPeriods.filter(p => p && p.start_date && p.end_date);
  if (validExcelPeriods.length > 1) {
    const sortedExcel = [...validExcelPeriods].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    for (let i = 0; i < sortedExcel.length - 1; i++) {
      const current = sortedExcel[i];
      const next = sortedExcel[i + 1];
      
      if (!current || !next) continue;
      
      const gapDays = calculateTemporalGap(current, next);
      if (gapDays > 1) {
        gaps.push({
          type: 'excel_gap',
          after_period: current,
          before_period: next,
          gap_days: gapDays,
          severity: gapDays > 365 ? 'high' : gapDays > 90 ? 'medium' : 'low',
          source: 'excel'
        });
      }
    }
  }
  
  // Analisar lacunas no PDF
  const validPdfPeriods = pdfPeriods.filter(p => p && p.start_date && p.end_date);
  if (validPdfPeriods.length > 1) {
    const sortedPdf = [...validPdfPeriods].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    for (let i = 0; i < sortedPdf.length - 1; i++) {
      const current = sortedPdf[i];
      const next = sortedPdf[i + 1];
      
      if (!current || !next) continue;
      
      const gapDays = calculateTemporalGap(current, next);
      if (gapDays > 1) {
        gaps.push({
          type: 'pdf_gap',
          after_period: current,
          before_period: next,
          gap_days: gapDays,
          severity: gapDays > 365 ? 'high' : gapDays > 90 ? 'medium' : 'low',
          source: 'pdf'
        });
      }
    }
  }
  
  return {
    gaps,
    gap_count: gaps.length,
    high_severity_count: gaps.filter(g => g.severity === 'high').length,
    medium_severity_count: gaps.filter(g => g.severity === 'medium').length,
    low_severity_count: gaps.filter(g => g.severity === 'low').length,
    total_gap_days: gaps.reduce((sum, g) => sum + g.gap_days, 0),
    risk_assessment: assessGapRisk(gaps)
  };
}

// Avaliar risco de sobreposições
function assessOverlapRisk(overlaps) {
  if (overlaps.length === 0) return 'low';
  
  const highSeverityCount = overlaps.filter(o => o.severity === 'high').length;
  const totalOverlapDays = overlaps.reduce((sum, o) => sum + o.overlap_days, 0);
  
  if (highSeverityCount > 2 || totalOverlapDays > 180) return 'high';
  if (highSeverityCount > 0 || totalOverlapDays > 60) return 'medium';
  return 'low';
}

// Avaliar risco de lacunas
function assessGapRisk(gaps) {
  if (gaps.length === 0) return 'low';
  
  const highSeverityCount = gaps.filter(g => g.severity === 'high').length;
  const totalGapDays = gaps.reduce((sum, g) => sum + g.gap_days, 0);
  
  if (highSeverityCount > 1 || totalGapDays > 730) return 'high';
  if (highSeverityCount > 0 || totalGapDays > 180) return 'medium';
  return 'low';
}

// Detectar padrões suspeitos
function detectSuspiciousPatterns(excelPeriods, pdfPeriods) {
  console.log('🔍 [ANALYSIS] Detectando padrões suspeitos...');
  
  if (!excelPeriods || !pdfPeriods) {
    return [];
  }
  
  const patterns = [];
  
  try {
    // 1. Padrão de períodos muito curtos
    const shortPeriods = excelPeriods.filter(p => {
      const duration = calculatePeriodDuration(p);
      return duration < 30;
    });
    
    if (shortPeriods.length > 3) {
      patterns.push({
        type: 'multiple_short_periods',
        description: 'Múltiplos períodos muito curtos detectados',
        periods: shortPeriods,
        risk_level: 'medium',
        implication: 'Possível instabilidade no emprego ou registros fragmentados'
      });
    }
    
    // 2. Padrão de empresas similares
    const companyClusters = clusterSimilarCompanies(excelPeriods);
    if (companyClusters && companyClusters.length > 0) {
      companyClusters.forEach(cluster => {
        if (cluster.periods && cluster.periods.length > 2) {
          patterns.push({
            type: 'similar_companies_cluster',
            description: 'Múltiplos períodos em empresas similares',
            periods: cluster.periods,
            risk_level: 'low',
            implication: 'Possível grupo empresarial ou terceirização'
          });
        }
      });
    }
    
    // 3. Padrão de datas suspeitas
    const suspiciousDates = detectSuspiciousDates(excelPeriods);
    if (suspiciousDates && suspiciousDates.length > 0) {
      patterns.push({
        type: 'suspicious_dates',
        description: 'Datas com padrões suspeitos detectadas',
        dates: suspiciousDates,
        risk_level: 'high',
        implication: 'Possível manipulação ou erro sistemático nas datas'
      });
    }
  } catch (error) {
    console.error('❌ [ANALYSIS] Erro ao detectar padrões suspeitos:', error);
  }
  
  return patterns;
}

// Analisar consistência temporal
function analyzeTemporalConsistency(excelPeriods, pdfPeriods) {
  console.log('🔍 [ANALYSIS] Analisando consistência temporal...');
  
  if (!excelPeriods || !pdfPeriods) {
    return {
      score: 0.5,
      level: 'BAIXO',
      inconsistencies: [],
      recommendations: []
    };
  }
  
  const inconsistencies = [];
  let consistencyScore = 1.0;
  
  try {
    // Verificar ordem cronológica
    const chronologyCheck = verifyChronologicalOrder(excelPeriods);
    if (!chronologyCheck.isConsistent) {
      inconsistencies.push(chronologyCheck);
      consistencyScore *= 0.8;
    }
    
    // Verificar padrões de duração
    const durationPatterns = analyzeDurationPatterns(excelPeriods);
    if (durationPatterns.hasAnomalies) {
      inconsistencies.push(durationPatterns);
      consistencyScore *= 0.9;
    }
    
    // Verificar consistência com PDF
    const pdfConsistency = analyzePdfConsistency(excelPeriods, pdfPeriods);
    if (pdfConsistency.inconsistencies) {
      inconsistencies.push(...pdfConsistency.inconsistencies);
      consistencyScore *= pdfConsistency.score;
    }
  } catch (error) {
    console.error('❌ [ANALYSIS] Erro na análise de consistência temporal:', error);
    consistencyScore *= 0.7;
  }
  
  return {
    score: Math.max(consistencyScore, 0.1),
    level: getConsistencyLevel(consistencyScore),
    inconsistencies,
    recommendations: generateConsistencyRecommendations(inconsistencies)
  };
}

// Verificar ordem cronológica
function verifyChronologicalOrder(periods) {
  if (!periods || periods.length === 0) {
    return { isConsistent: true, violations: [], type: 'chronological_order' };
  }
  
  const sorted = [...periods].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  const violations = [];
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    
    if (new Date(current.end_date) > new Date(next.start_date)) {
      violations.push({
        period1: current,
        period2: next,
        issue: 'Sobreposição cronológica'
      });
    }
  }
  
  return {
    isConsistent: violations.length === 0,
    violations,
    type: 'chronological_order'
  };
}

// Analisar padrões de duração
function analyzeDurationPatterns(periods) {
  if (!periods || periods.length === 0) {
    return { hasAnomalies: false, anomalies: [], avgDuration: 0, type: 'duration_patterns' };
  }
  
  const durations = periods.map(p => calculatePeriodDuration(p));
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const anomalies = [];
  
  durations.forEach((duration, index) => {
    if (duration < 7) {
      anomalies.push({
        period: periods[index],
        issue: 'Período muito curto (menos de 7 dias)',
        duration
      });
    } else if (duration > avgDuration * 3) {
      anomalies.push({
        period: periods[index],
        issue: 'Período anormalmente longo',
        duration
      });
    }
  });
  
  return {
    hasAnomalies: anomalies.length > 0,
    anomalies,
    avgDuration,
    type: 'duration_patterns'
  };
}

// Analisar consistência com PDF
function analyzePdfConsistency(excelPeriods, pdfPeriods) {
  if (!excelPeriods || !pdfPeriods) {
    return { inconsistencies: [], score: 0.5 };
  }
  
  const inconsistencies = [];
  let score = 1.0;
  
  // Verificar se períodos do Excel têm correspondência no PDF
  const unmatchedExcel = excelPeriods.filter(excelPeriod => {
    return !pdfPeriods.some(pdfPeriod => {
      const similarity = calculateAdvancedCompanySimilarity(excelPeriod.company, pdfPeriod.company);
      const temporalOverlap = calculateDateOverlap(excelPeriod, pdfPeriod);
      return similarity.score > 0.6 && temporalOverlap > 0.5;
    });
  });
  
  if (unmatchedExcel.length > 0) {
    inconsistencies.push({
      type: 'unmatched_excel_periods',
      periods: unmatchedExcel,
      description: 'Períodos do Excel sem correspondência no PDF'
    });
    score *= Math.max(0.5, 1 - (unmatchedExcel.length / excelPeriods.length));
  }
  
  return { inconsistencies, score };
}

// Obter nível de consistência
function getConsistencyLevel(score) {
  if (score >= 0.9) return 'EXCELENTE';
  if (score >= 0.8) return 'BOM';
  if (score >= 0.7) return 'REGULAR';
  if (score >= 0.6) return 'BAIXO';
  return 'CRÍTICO';
}

// Gerar recomendações de consistência
function generateConsistencyRecommendations(inconsistencies) {
  return inconsistencies.map(inc => ({
    type: inc.type,
    priority: inc.type.includes('critical') ? 'high' : 'medium',
    action: `Corrigir inconsistência: ${inc.type}`,
    details: inc.description || 'Revisar dados inconsistentes'
  }));
}

// Agrupar empresas similares
function clusterSimilarCompanies(periods) {
  if (!periods || periods.length === 0) {
    return [];
  }
  
  const clusters = [];
  const processed = new Set();
  
  periods.forEach((period, index) => {
    if (processed.has(index)) return;
    
    const cluster = { company_pattern: period.company, periods: [period] };
    processed.add(index);
    
    periods.forEach((otherPeriod, otherIndex) => {
      if (processed.has(otherIndex)) return;
      
      const similarity = calculateAdvancedCompanySimilarity(period.company, otherPeriod.company);
      if (similarity.score > 0.7) {
        cluster.periods.push(otherPeriod);
        processed.add(otherIndex);
      }
    });
    
    clusters.push(cluster);
  });
  
  return clusters.filter(c => c.periods.length > 1);
}

// Detectar datas suspeitas
function detectSuspiciousDates(periods) {
  if (!periods || periods.length === 0) {
    return [];
  }
  
  const suspicious = [];
  
  periods.forEach(period => {
    try {
      const start = new Date(period.start_date);
      const end = new Date(period.end_date);
      
      // Verificar se as datas são válidas
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        suspicious.push({
          period,
          reason: 'Data inválida detectada'
        });
        return;
      }
      
      // Datas em finais de ano (possível ajuste fiscal)
      if (start.getMonth() === 11 && start.getDate() === 31) {
        suspicious.push({
          period,
          date: start,
          reason: 'Data de início em 31/12 - possível ajuste fiscal'
        });
      }
      
      // Datas muito redondas (dia 1º ou 15)
      if ((start.getDate() === 1 || start.getDate() === 15) && 
          (end.getDate() === 1 || end.getDate() === 15)) {
        suspicious.push({
          period,
          reason: 'Datas muito "redondas" - possível estimativa'
        });
      }
      
      // Períodos que começam e terminam no mesmo dia
      if (start.getTime() === end.getTime()) {
        suspicious.push({
          period,
          reason: 'Período de apenas um dia - suspeito'
        });
      }
    } catch (error) {
      console.error('❌ [ANALYSIS] Erro ao analisar data suspeita:', error);
      suspicious.push({
        period,
        reason: 'Erro ao processar datas do período'
      });
    }
  });
  
  return suspicious;
}

// Calcular duração de um período em dias
function calculatePeriodDuration(period) {
  if (!period || !period.start_date || !period.end_date) {
    return 0;
  }
  
  const startDate = new Date(period.start_date);
  const endDate = new Date(period.end_date);
  
  // Verificar se as datas são válidas
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 0;
  }
  
  // Calcular diferença em dias
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
}

// Análise detalhada de diferenças entre períodos
function analyzeDetailedDifferences(excelPeriod, pdfPeriod) {
  console.log('🔍 [ANALYSIS] Analisando diferenças detalhadas...');
  
  const differences = [];
  
  // 1. Diferenças de empresa
  const companyDiff = analyzeCompanyDifferences(excelPeriod, pdfPeriod);
  if (companyDiff) differences.push(companyDiff);
  
  // 2. Diferenças de datas
  const dateDifferences = analyzeDateDifferences(excelPeriod, pdfPeriod);
  differences.push(...dateDifferences);
  
  // 3. Diferenças de duração
  const durationDiff = analyzeDurationDifferences(excelPeriod, pdfPeriod);
  if (durationDiff) differences.push(durationDiff);
  
  // 4. Análise de impacto
  const impactAnalysis = calculateImpactAnalysis(differences, excelPeriod, pdfPeriod);
  
  return {
    differences,
    difference_count: differences.length,
    impact_analysis: impactAnalysis,
    severity_level: calculateOverallSeverity(differences),
    recommendations: generateDifferenceRecommendations(differences)
  };
}

// Analisar diferenças de empresa
function analyzeCompanyDifferences(excelPeriod, pdfPeriod) {
  const excelCompany = normalizeCompanyName(excelPeriod.company || '');
  const pdfCompany = normalizeCompanyName(pdfPeriod.company || '');
  
  if (excelCompany !== pdfCompany) {
    const similarity = calculateAdvancedCompanySimilarity(excelPeriod.company, pdfPeriod.company);
    
    return {
      type: 'company_difference',
      category: 'EMPRESA',
      severity: similarity.score > 0.7 ? 'low' : similarity.score > 0.4 ? 'medium' : 'high',
      excel_value: excelPeriod.company,
      pdf_value: pdfPeriod.company,
      similarity_score: similarity.score,
      reason: similarity.score > 0.7 ? 
        'Variação menor no nome da empresa' : 
        similarity.score > 0.4 ? 
        'Diferença moderada no nome da empresa' : 
        'Empresas completamente diferentes',
      impact_analysis: {
        legal: similarity.score < 0.4 ? 
          'CRÍTICO: Pode indicar períodos de empresas diferentes' : 
          'Verificar se é a mesma empresa com grafia diferente',
        financial: similarity.score < 0.4 ? 
          'Possível impacto na contagem de tempo de contribuição' : 
          'Impacto mínimo se confirmada mesma empresa',
        administrative: 'Verificar documentação da empresa para confirmação'
      },
      recommendations: similarity.score < 0.4 ? [
        'Verificar CNPJ das empresas',
        'Confirmar se são empresas do mesmo grupo',
        'Validar períodos com documentação adicional'
      ] : [
        'Confirmar grafia correta da empresa',
        'Verificar se houve mudança de razão social'
      ]
    };
  }
  
  return null;
}

// Analisar diferenças de datas
function analyzeDateDifferences(excelPeriod, pdfPeriod) {
  const differences = [];
  
  const excelStart = new Date(excelPeriod.start_date);
  const pdfStart = new Date(pdfPeriod.start_date);
  const excelEnd = new Date(excelPeriod.end_date);
  const pdfEnd = new Date(pdfPeriod.end_date);
  
  // Diferença na data de início
  const startDiffDays = Math.abs(excelStart - pdfStart) / (1000 * 60 * 60 * 24);
  if (startDiffDays > 0) {
    differences.push({
      type: 'start_date_difference',
      category: 'DATA DE INÍCIO',
      severity: startDiffDays <= 7 ? 'low' : startDiffDays <= 30 ? 'medium' : 'high',
      excel_value: formatDate(excelPeriod.start_date),
      pdf_value: formatDate(pdfPeriod.start_date),
      difference_days: Math.round(startDiffDays),
      reason: startDiffDays <= 7 ? 
        'Pequena diferença na data de início' : 
        startDiffDays <= 30 ? 
        'Diferença moderada na data de início' : 
        'Grande diferença na data de início',
      impact_analysis: {
        legal: startDiffDays > 30 ? 
          'IMPORTANTE: Diferença significativa pode afetar cálculos previdenciários' : 
          'Verificar qual data está correta',
        financial: `Diferença de ${Math.round(startDiffDays)} dias no período contributivo`,
        administrative: 'Confirmar data correta com documentação oficial'
      },
      recommendations: [
        'Verificar carteira de trabalho',
        'Consultar registros da empresa',
        'Confirmar data de admissão oficial'
      ]
    });
  }
  
  // Diferença na data de fim
  const endDiffDays = Math.abs(excelEnd - pdfEnd) / (1000 * 60 * 60 * 24);
  if (endDiffDays > 0) {
    differences.push({
      type: 'end_date_difference',
      category: 'DATA DE FIM',
      severity: endDiffDays <= 7 ? 'low' : endDiffDays <= 30 ? 'medium' : 'high',
      excel_value: formatDate(excelPeriod.end_date),
      pdf_value: formatDate(pdfPeriod.end_date),
      difference_days: Math.round(endDiffDays),
      reason: endDiffDays <= 7 ? 
        'Pequena diferença na data de fim' : 
        endDiffDays <= 30 ? 
        'Diferença moderada na data de fim' : 
        'Grande diferença na data de fim',
      impact_analysis: {
        legal: endDiffDays > 30 ? 
          'IMPORTANTE: Diferença significativa pode afetar cálculos previdenciários' : 
          'Verificar qual data está correta',
        financial: `Diferença de ${Math.round(endDiffDays)} dias no período contributivo`,
        administrative: 'Confirmar data correta com documentação oficial'
      },
      recommendations: [
        'Verificar carteira de trabalho',
        'Consultar registros da empresa',
        'Confirmar data de desligamento oficial'
      ]
    });
  }
  
  return differences;
}

// Analisar diferenças de duração
function analyzeDurationDifferences(excelPeriod, pdfPeriod) {
  const excelDuration = calculatePeriodDuration(excelPeriod);
  const pdfDuration = calculatePeriodDuration(pdfPeriod);
  
  const durationDiff = Math.abs(excelDuration - pdfDuration);
  
  if (durationDiff > 7) { // Mais de 7 dias de diferença
    return {
      type: 'duration_difference',
      category: 'DURAÇÃO',
      severity: durationDiff <= 30 ? 'low' : durationDiff <= 90 ? 'medium' : 'high',
      excel_value: `${excelDuration} dias`,
      pdf_value: `${pdfDuration} dias`,
      difference_days: durationDiff,
      reason: `Diferença de ${durationDiff} dias na duração do período`,
      impact_analysis: {
        legal: durationDiff > 90 ? 
          'CRÍTICO: Grande diferença pode indicar períodos distintos' : 
          'Verificar causa da diferença na duração',
        financial: `Diferença de ${durationDiff} dias no tempo de contribuição`,
        administrative: 'Revisar cálculo de duração dos períodos'
      },
      recommendations: [
        'Recalcular duração com datas corretas',
        'Verificar se há sobreposições ou lacunas',
        'Confirmar períodos com documentação oficial'
      ]
    };
  }
  
  return null;
}

// Calcular análise de impacto geral
function calculateImpactAnalysis(differences, excelPeriod, pdfPeriod) {
  const highSeverityCount = differences.filter(d => d.severity === 'high').length;
  const mediumSeverityCount = differences.filter(d => d.severity === 'medium').length;
  
  let overallImpact = 'low';
  if (highSeverityCount > 0) {
    overallImpact = 'high';
  } else if (mediumSeverityCount > 1) {
    overallImpact = 'medium';
  }
  
  return {
    overall_impact: overallImpact,
    critical_differences: highSeverityCount,
    moderate_differences: mediumSeverityCount,
    total_differences: differences.length,
    period_reliability: calculatePeriodReliability(differences),
    action_required: overallImpact === 'high' ? 'URGENTE' : overallImpact === 'medium' ? 'RECOMENDADO' : 'OPCIONAL'
  };
}

// Calcular severidade geral
function calculateOverallSeverity(differences) {
  if (differences.some(d => d.severity === 'high')) return 'high';
  if (differences.some(d => d.severity === 'medium')) return 'medium';
  return 'low';
}

// Gerar recomendações para diferenças
function generateDifferenceRecommendations(differences) {
  const recommendations = [];
  
  if (differences.some(d => d.type === 'company_difference' && d.severity === 'high')) {
    recommendations.push({
      priority: 'high',
      action: 'Verificar identidade das empresas',
      description: 'Confirmar se são a mesma empresa ou empresas diferentes'
    });
  }
  
  if (differences.some(d => d.type.includes('date_difference') && d.severity === 'high')) {
    recommendations.push({
      priority: 'high',
      action: 'Validar datas oficiais',
      description: 'Confirmar datas corretas com documentação oficial'
    });
  }
  
  if (differences.some(d => d.type === 'duration_difference' && d.severity === 'high')) {
    recommendations.push({
      priority: 'medium',
      action: 'Recalcular períodos',
      description: 'Revisar cálculo de duração dos períodos'
    });
  }
  
  return recommendations;
}

// Calcular confiabilidade do período
function calculatePeriodReliability(differences) {
  let reliability = 1.0;
  
  differences.forEach(diff => {
    if (diff.severity === 'high') reliability *= 0.7;
    else if (diff.severity === 'medium') reliability *= 0.85;
    else reliability *= 0.95;
  });
  
  return Math.max(reliability, 0.1);
}

/**
 * Calcula score de similaridade entre dois períodos
 */
function calculateSimilarityScore(period1, period2) {
  const weights = {
    company: 0.4,
    dateOverlap: 0.4,
    role: 0.2
  };
  
  // Similaridade da empresa
  const companySimilarity = stringSimilarity.compareTwoStrings(
    period1.normalized?.company_normalized || period1.company || '',
    period2.normalized?.company_normalized || period2.company || ''
  );
  
  // Sobreposição de datas
  const dateOverlap = calculateDateOverlap(period1, period2);
  
  // Similaridade do cargo (se disponível)
  const roleSimilarity = stringSimilarity.compareTwoStrings(
    period1.role || '',
    period2.role || ''
  );
  
  // Score final ponderado
  const finalScore = 
    (companySimilarity * weights.company) +
    (dateOverlap * weights.dateOverlap) +
    (roleSimilarity * weights.role);
  
  return finalScore;
}

/**
 * Calcula sobreposição de datas entre dois períodos
 */
function calculateDateOverlap(period1, period2) {
  const start1 = dayjs(period1.start_date);
  const end1 = dayjs(period1.end_date);
  const start2 = dayjs(period2.start_date);
  const end2 = dayjs(period2.end_date);
  
  // Calcular interseção
  const overlapStart = dayjs.max(start1, start2);
  const overlapEnd = dayjs.min(end1, end2);
  
  if (overlapEnd.isBefore(overlapStart)) {
    return 0; // Sem sobreposição
  }
  
  const overlapDays = overlapEnd.diff(overlapStart, 'day') + 1;
  const totalDays1 = end1.diff(start1, 'day') + 1;
  const totalDays2 = end2.diff(start2, 'day') + 1;
  
  // Retorna a proporção de sobreposição em relação ao menor período
  const minDays = Math.min(totalDays1, totalDays2);
  return overlapDays / minDays;
}

/**
 * Analisa detalhes de uma correspondência encontrada
 */
function analyzeMatch(excelPeriod, pdfPeriod) {
  const conflicts = [];
  const details = {};
  
  // Comparar empresas
  const companyMatch = stringSimilarity.compareTwoStrings(
    excelPeriod.normalized?.company_normalized || excelPeriod.company || '',
    pdfPeriod.normalized?.company_normalized || pdfPeriod.company || ''
  );
  
  details.company_similarity = companyMatch;
  
  if (companyMatch < 0.8) {
    conflicts.push({
      type: 'company_mismatch',
      excel_value: excelPeriod.company,
      pdf_value: pdfPeriod.company,
      similarity: companyMatch
    });
  }
  
  // Comparar datas
  const excelStart = dayjs(excelPeriod.start_date);
  const excelEnd = dayjs(excelPeriod.end_date);
  const pdfStart = dayjs(pdfPeriod.start_date);
  const pdfEnd = dayjs(pdfPeriod.end_date);
  
  const startDiff = Math.abs(excelStart.diff(pdfStart, 'day'));
  const endDiff = Math.abs(excelEnd.diff(pdfEnd, 'day'));
  
  details.start_date_diff_days = startDiff;
  details.end_date_diff_days = endDiff;
  
  // Tolerância de 30 dias para diferenças de data
  if (startDiff > 30) {
    conflicts.push({
      type: 'start_date_mismatch',
      excel_value: excelPeriod.start_date,
      pdf_value: pdfPeriod.start_date,
      difference_days: startDiff
    });
  }
  
  if (endDiff > 30) {
    conflicts.push({
      type: 'end_date_mismatch',
      excel_value: excelPeriod.end_date,
      pdf_value: pdfPeriod.end_date,
      difference_days: endDiff
    });
  }
  
  // Comparar cargos se disponível
  if (excelPeriod.role && pdfPeriod.role) {
    const roleMatch = stringSimilarity.compareTwoStrings(
      excelPeriod.role,
      pdfPeriod.role
    );
    
    details.role_similarity = roleMatch;
    
    if (roleMatch < 0.5) {
      conflicts.push({
        type: 'role_mismatch',
        excel_value: excelPeriod.role,
        pdf_value: pdfPeriod.role,
        similarity: roleMatch
      });
    }
  }
  
  return {
    details,
    conflicts,
    overall_quality: conflicts.length === 0 ? 'excellent' : 
                    conflicts.length <= 2 ? 'good' : 'poor'
  };
}

/**
 * Calcula estatísticas da comparação
 */
function calculateStatistics(excelPeriods, pdfPeriods, matches, conflicts) {
  const totalExcel = excelPeriods.length;
  const totalPdf = pdfPeriods.length;
  const totalMatches = matches.length;
  
  // Taxa de correspondência
  const matchRate = totalExcel > 0 ? (totalMatches / totalExcel) * 100 : 0;
  
  // Score de precisão (considerando conflitos)
  const perfectMatches = matches.filter(m => !m.has_conflicts).length;
  const accuracyScore = totalMatches > 0 ? (perfectMatches / totalMatches) * 100 : 0;
  
  // Calcular total de dias
  const totalDaysExcel = excelPeriods.reduce((sum, period) => {
    const start = dayjs(period.start_date);
    const end = dayjs(period.end_date);
    return sum + end.diff(start, 'day') + 1;
  }, 0);
  
  const totalDaysPdf = pdfPeriods.reduce((sum, period) => {
    const start = dayjs(period.start_date);
    const end = dayjs(period.end_date);
    return sum + end.diff(start, 'day') + 1;
  }, 0);
  
  const daysDifference = Math.abs(totalDaysExcel - totalDaysPdf);
  
  return {
    matchRate: Math.round(matchRate * 100) / 100,
    accuracyScore: Math.round(accuracyScore * 100) / 100,
    totalDaysExcel,
    totalDaysPdf,
    daysDifference,
    averageSimilarity: matches.length > 0 ? 
      matches.reduce((sum, m) => sum + m.similarity_score, 0) / matches.length : 0
  };
}

/**
 * FUNÇÕES AUXILIARES ENTERPRISE
 */

// Normalizar nome da empresa (Enterprise)
function normalizeCompanyName(name) {
  if (!name) return '';
  
  return String(name)
    .toUpperCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Calcular diferença em dias entre duas datas
function calculateDateDifference(date1, date2) {
  if (!date1 || !date2) return 0;
  
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

// Gerar razão avançada para diferença de empresa
function generateAdvancedCompanyReason(excel, pdf, similarity) {
  if (similarity > 0.9) {
    return `Empresas muito similares: possível variação de grafia ou abreviação. Excel: "${excel}", PDF: "${pdf}"`;
  } else if (similarity > 0.7) {
    return `Empresas relacionadas: possível mudança de razão social ou grupo empresarial. Excel: "${excel}", PDF: "${pdf}"`;
  } else {
    return `Empresas diferentes: possível erro de digitação ou empresas distintas. Excel: "${excel}", PDF: "${pdf}"`;
  }
}

// Gerar recomendações para diferenças de empresa
function generateCompanyRecommendations(excel, pdf, severity) {
  const base = [
    'Verificar CNPJ das empresas',
    'Consultar carteira de trabalho',
    'Confirmar razão social oficial'
  ];
  
  if (severity === 'high') {
    return [...base, 'URGENTE: Verificar se são empresas diferentes', 'Pode impactar cálculo de benefícios'];
  } else if (severity === 'medium') {
    return [...base, 'Verificar mudança de razão social', 'Confirmar continuidade do vínculo'];
  } else {
    return [...base, 'Verificação de rotina', 'Provável variação de grafia'];
  }
}

// Gerar razão para diferença de datas
function generateDateDifferenceReason(tipo, date1, date2, daysDiff) {
  const direction = daysDiff > 0 ? 'posterior' : 'anterior';
  const absDiff = Math.abs(daysDiff);
  
  return `Data de ${tipo} no PDF é ${absDiff} dias ${direction} à data no Excel. ` +
         `Excel: ${formatDate(date1)}, PDF: ${formatDate(date2)}. ` +
         `Diferença: ${absDiff} dias.`;
}

// Gerar resumo aprimorado de diferenças
function generateEnhancedDifferenceSummary(differences) {
  if (differences.length === 0) {
    return 'MATCH PERFEITO: Todos os dados são idênticos';
  }
  
  const critical = differences.filter(d => d.severity === 'high').length;
  const medium = differences.filter(d => d.severity === 'medium').length;
  const low = differences.filter(d => d.severity === 'low').length;
  
  let summary = `${differences.length} diferença(s) encontrada(s): `;
  
  if (critical > 0) summary += `${critical} crítica(s), `;
  if (medium > 0) summary += `${medium} média(s), `;
  if (low > 0) summary += `${low} menor(es)`;
  
  return summary.replace(/, $/, '');
}

// Gerar impacto no negócio
function generateBusinessImpact(differences, criticalCount, minorCount) {
  if (criticalCount > 0) {
    return 'ALTO: Diferenças críticas podem afetar significativamente o cálculo de benefícios';
  } else if (minorCount > 2) {
    return 'MÉDIO: Múltiplas diferenças menores requerem verificação';
  } else if (minorCount > 0) {
    return 'BAIXO: Diferenças menores com impacto limitado';
  } else {
    return 'NENHUM: Períodos idênticos';
  }
}

// Gerar explicação detalhada
function generateDetailedExplanation(excelPeriod, pdfPeriod, differences) {
  if (differences.length === 0) {
    return `Período de ${formatDate(excelPeriod.start_date)} a ${formatDate(excelPeriod.end_date)} ` +
           `na empresa ${excelPeriod.company} está perfeitamente alinhado entre Excel e PDF.`;
  }
  
  const company = excelPeriod.company || pdfPeriod.company || 'Empresa não identificada';
  let explanation = `Período na empresa ${company}: `;
  
  differences.forEach((diff, index) => {
    if (index > 0) explanation += '; ';
    explanation += diff.reason;
  });
  
  return explanation;
}

// Gerar resumo das diferenças
function generateDifferenceSummary(differences) {
  if (differences.length === 0) {
    return 'Períodos idênticos - match perfeito';
  }
  
  const summaryParts = [];
  const companyDiffs = differences.filter(d => d.type === 'company_name');
  const dateDiffs = differences.filter(d => d.type.includes('date'));
  const durationDiffs = differences.filter(d => d.type === 'duration');
  
  if (companyDiffs.length > 0) {
    summaryParts.push('Nome da empresa diferente');
  }
  
  if (dateDiffs.length > 0) {
    const totalDaysDiff = dateDiffs.reduce((sum, d) => sum + d.difference_days, 0);
    summaryParts.push(`Datas diferem em ${totalDaysDiff} dias`);
  }
  
  if (durationDiffs.length > 0) {
    summaryParts.push(`Duração difere em ${durationDiffs[0].difference_days} dias`);
  }
  
  return summaryParts.join(', ');
}

// Analisar período isolado
function analyzeStandalonePeriod(period, source) {
  return {
    duration_analysis: `Período de ${period.duration_days} dias`,
    date_range: `${formatDate(period.start_date)} até ${formatDate(period.end_date)}`,
    company_analysis: `Empresa: ${period.original_company}`,
    possible_reasons: [
      `Período pode ter sido registrado apenas no ${source.toUpperCase()}`,
      'Possível diferença no processo de extração de dados',
      'Período pode estar em formato não reconhecido no outro documento'
    ]
  };
}

// Análise avançada de sobreposições e lacunas com IA
function analyzeOverlapsAndGaps(excelPeriods, pdfPeriods) {
  console.log('🔍 [ANALYSIS] Analisando sobreposições e lacunas com IA...');
  
  const overlaps = [];
  const gaps = [];
  const patterns = [];
  
  // 1. Análise de sobreposições com contexto inteligente
  for (let i = 0; i < excelPeriods.length; i++) {
    for (let j = i + 1; j < excelPeriods.length; j++) {
      const overlap = calculateDateOverlap(excelPeriods[i], excelPeriods[j]);
      if (overlap > 0) {
        const overlapAnalysis = analyzeOverlapContext(excelPeriods[i], excelPeriods[j], overlap);
        overlaps.push({
          type: 'excel_overlap',
          period1: excelPeriods[i],
          period2: excelPeriods[j],
          overlap_days: overlap,
          severity: overlapAnalysis.severity,
          context: overlapAnalysis.context,
          likely_cause: overlapAnalysis.likely_cause,
          recommendation: overlapAnalysis.recommendation
        });
      }
    }
  }
  
  // 2. Análise inteligente de lacunas temporais
  const timelineAnalysis = performTimelineAnalysis(excelPeriods, pdfPeriods);
  gaps.push(...timelineAnalysis.gaps);
  patterns.push(...timelineAnalysis.patterns);
  
  // 3. Detecção de padrões suspeitos
  const suspiciousPatterns = detectSuspiciousPatterns(excelPeriods, pdfPeriods);
  if (suspiciousPatterns && suspiciousPatterns.length) {
    patterns.push(...suspiciousPatterns);
  }
  
  // 4. Análise de consistência temporal
  const consistencyAnalysis = analyzeTemporalConsistency(excelPeriods, pdfPeriods);
  
  return {
    overlaps,
    gaps,
    patterns,
    consistency: consistencyAnalysis,
    overlap_count: overlaps.length,
    gap_count: gaps.length,
    pattern_count: patterns.length,
    total_overlap_days: overlaps.reduce((sum, o) => sum + o.overlap_days, 0),
    total_gap_days: gaps.reduce((sum, g) => sum + g.gap_days, 0),
    risk_score: calculateTimelineRiskScore(overlaps, gaps, patterns),
    recommendations: generateTimelineRecommendations(overlaps, gaps, patterns)
  };
}

// Análise contextual de sobreposições
function analyzeOverlapContext(period1, period2, overlapDays) {
  const sameCompany = normalizeCompanyName(period1.company) === normalizeCompanyName(period2.company);
  
  let severity, context, likely_cause, recommendation;
  
  if (sameCompany) {
    if (overlapDays <= 7) {
      severity = 'low';
      context = 'Sobreposição mínima na mesma empresa';
      likely_cause = 'Ajuste de datas ou período de transição';
      recommendation = 'Verificar se é um ajuste administrativo normal';
    } else if (overlapDays <= 30) {
      severity = 'medium';
      context = 'Sobreposição moderada na mesma empresa';
      likely_cause = 'Possível mudança de função ou setor';
      recommendation = 'Confirmar se houve mudança de cargo ou departamento';
    } else {
      severity = 'high';
      context = 'Sobreposição significativa na mesma empresa';
      likely_cause = 'Erro de registro ou situação irregular';
      recommendation = 'Investigar possível duplicação ou erro nos registros';
    }
  } else {
    if (overlapDays <= 3) {
      severity = 'low';
      context = 'Sobreposição mínima entre empresas diferentes';
      likely_cause = 'Transição entre empregos';
      recommendation = 'Normal para mudança de emprego';
    } else if (overlapDays <= 15) {
      severity = 'medium';
      context = 'Sobreposição entre empresas diferentes';
      likely_cause = 'Período de aviso prévio ou transição';
      recommendation = 'Verificar se corresponde ao período de aviso prévio';
    } else {
      severity = 'high';
      context = 'Sobreposição longa entre empresas diferentes';
      likely_cause = 'Possível trabalho simultâneo ou erro';
      recommendation = 'ATENÇÃO: Verificar legalidade do trabalho simultâneo';
    }
  }
  
  return { severity, context, likely_cause, recommendation };
}

// Análise avançada de timeline
function performTimelineAnalysis(excelPeriods, pdfPeriods) {
  const gaps = [];
  const patterns = [];
  
  // Ordenar períodos por data de início
  const sortedExcel = [...excelPeriods].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  const sortedPdf = [...pdfPeriods].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  
  // Analisar lacunas no Excel
  for (let i = 0; i < sortedExcel.length - 1; i++) {
    const current = sortedExcel[i];
    const next = sortedExcel[i + 1];
    
    const gapDays = Math.ceil((next.start_date - current.end_date) / (1000 * 60 * 60 * 24));
    
    if (gapDays > 1) {
      gaps.push({
        type: 'excel_gap',
        gap_days: gapDays - 1,
        after_period: current,
        before_period: next,
        reason: `Lacuna de ${gapDays - 1} dias entre períodos no Excel`
      });
    }
  }
  
  return { gaps };
}

// Gerar análise de timeline
function generateTimelineAnalysis(excelPeriods, pdfPeriods) {
  const validExcelPeriods = Array.isArray(excelPeriods) ? excelPeriods : [];
  const validPdfPeriods = Array.isArray(pdfPeriods) ? pdfPeriods : [];
  
  const allPeriods = [
    ...validExcelPeriods.map(p => ({ ...p, source: 'excel' })),
    ...validPdfPeriods.map(p => ({ ...p, source: 'pdf' }))
  ].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
  
  const timeline = {
    total_periods: allPeriods.length,
    date_range: {
      earliest: allPeriods.length > 0 ? formatDate(allPeriods[0]?.start_date) : null,
      latest: allPeriods.length > 0 ? formatDate(allPeriods[allPeriods.length - 1]?.end_date) : null
    },
    coverage_analysis: {
      excel_coverage: calculateCoverage(validExcelPeriods),
      pdf_coverage: calculateCoverage(validPdfPeriods)
    }
  };
  
  return timeline;
}

// Calcular cobertura de períodos
function calculateCoverage(periods) {
  if (!Array.isArray(periods) || periods.length === 0) return { total_days: 0, periods_count: 0 };
  
  const totalDays = periods.reduce((sum, p) => sum + p.duration_days, 0);
  const sorted = [...periods].sort((a, b) => a.start_date - b.start_date);
  const dateRange = {
    start: sorted[0].start_date,
    end: sorted[sorted.length - 1].end_date
  };
  const totalRangeDays = Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24));
  
  return {
    total_days: totalDays,
    periods_count: periods.length,
    date_range_days: totalRangeDays,
    coverage_percentage: totalRangeDays > 0 ? (totalDays / totalRangeDays) * 100 : 0
  };
}

// Formatar data para exibição
function formatDate(date) {
  if (!date) return 'N/A';
  
  if (typeof date === 'string') return date;
  
  if (date instanceof Date) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }
  
  return String(date);
}

// Parse de data robusto
function parseDate(dateInput) {
  if (!dateInput) return null;
  
  if (dateInput instanceof Date) return dateInput;
  
  // Tentar diferentes formatos
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/,  // YYYY-MM-DD
    /(\d{2})\/(\d{2})\/(\d{4})/, // DD/MM/YYYY
    /(\d{2})-(\d{2})-(\d{4})/   // DD-MM-YYYY
  ];
  
  const dateStr = String(dateInput);
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format.source.includes('(\\d{4})')) {
        // YYYY-MM-DD
        return new Date(match[1], match[2] - 1, match[3]);
      } else {
        // DD/MM/YYYY ou DD-MM-YYYY
        return new Date(match[3], match[2] - 1, match[1]);
      }
    }
  }
  
  // Fallback para Date constructor
  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Calcular duração em dias
function calculateDuration(startDate, endDate) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  if (!start || !end) return 0;
  
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Score enterprise de similaridade
function calculateEnterpriseScore(period1, period2) {
  if (!period1 || !period2) return 0;
  
  // Score da empresa (40% do peso)
  const companyScore = calculateCompanyScore(period1.company_normalized, period2.company_normalized);
  
  // Score de sobreposição de datas (40% do peso)
  const dateScore = calculateDateOverlap(period1, period2);
  
  // Score de duração similar (20% do peso)
  const durationScore = calculateDurationSimilarity(period1.duration_days, period2.duration_days);
  
  const totalScore = (companyScore * 0.4) + (dateScore * 0.4) + (durationScore * 0.2);
  
  return Math.min(totalScore, 1.0);
}

// Score de similaridade de empresa
function calculateCompanyScore(name1, name2) {
  if (!name1 || !name2) return 0;
  
  // Usar string-similarity se disponível, senão implementar básico
  try {
    return stringSimilarity.compareTwoStrings(name1, name2);
  } catch (error) {
    // Implementação básica
    const longer = name1.length > name2.length ? name1 : name2;
    const shorter = name1.length > name2.length ? name2 : name1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
}

// Similaridade de duração
function calculateDurationSimilarity(duration1, duration2) {
  if (!duration1 || !duration2) return 0;
  
  const maxDuration = Math.max(duration1, duration2);
  const minDuration = Math.min(duration1, duration2);
  
  if (maxDuration === 0) return 1;
  
  return minDuration / maxDuration;
}

// Detectar conflitos enterprise
function detectEnterpriseConflicts(excelPeriod, pdfPeriod) {
  const conflicts = [];
  
  // Conflito de empresa
  const companyScore = calculateCompanyScore(excelPeriod.company_normalized, pdfPeriod.company_normalized);
  if (companyScore < 0.8) {
    conflicts.push({
      type: 'company_mismatch',
      excel_value: excelPeriod.company_normalized,
      pdf_value: pdfPeriod.company_normalized,
      similarity: companyScore
    });
  }
  
  // Conflito de datas
  const dateOverlap = calculateDateOverlap(excelPeriod, pdfPeriod);
  if (dateOverlap < 0.7) {
    conflicts.push({
      type: 'date_mismatch',
      excel_period: `${excelPeriod.start_date?.toISOString().split('T')[0]} a ${excelPeriod.end_date?.toISOString().split('T')[0]}`,
      pdf_period: `${pdfPeriod.start_date?.toISOString().split('T')[0]} a ${pdfPeriod.end_date?.toISOString().split('T')[0]}`,
      overlap: dateOverlap
    });
  }
  
  // Conflito de duração
  const durationDiff = Math.abs(excelPeriod.duration_days - pdfPeriod.duration_days);
  if (durationDiff > 90) { // Mais de 3 meses de diferença
    conflicts.push({
      type: 'duration_mismatch',
      excel_days: excelPeriod.duration_days,
      pdf_days: pdfPeriod.duration_days,
      difference: durationDiff
    });
  }
  
  return conflicts;
}

// Calcular acurácia enterprise
function calculateEnterpriseAccuracy(matches) {
  if (matches.length === 0) return 0;
  
  const totalScore = matches.reduce((sum, match) => sum + match.similarity_score, 0);
  const avgScore = totalScore / matches.length;
  
  return Math.max(0, avgScore * 100);
}

// Score de qualidade geral
function calculateQualityScore(matches, excelOnly, pdfOnly, conflictsCount) {
  const matchesLength = matches ? matches.length : 0;
  const excelOnlyLength = excelOnly ? excelOnly.length : 0;
  const pdfOnlyLength = pdfOnly ? pdfOnly.length : 0;
  
  const totalPeriods = matchesLength + excelOnlyLength + pdfOnlyLength;
  if (totalPeriods === 0) return 0;
  
  // Base score por matches
  const matchScore = (matchesLength / totalPeriods) * 100;
  
  // Penalidade por períodos não matcheados
  const unmatchedPenalty = ((excelOnlyLength + pdfOnlyLength) / totalPeriods) * 30;
  
  // Penalidade por conflitos (conflictsCount já é um número)
  const conflictPenalty = (conflictsCount / Math.max(matchesLength, 1)) * 20;
  
  return Math.max(0, matchScore - unmatchedPenalty - conflictPenalty);
}

// Distância de Levenshtein (implementação básica)
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Análise especializada INSS - Identificação de períodos específicos
function performINSSSpecializedAnalysis(comparisonResult, matches, excelOnly, pdfOnly) {
  console.log(' [INSS] Iniciando análise especializada INSS...');
  
  const inssAnalysis = {
    tempo_comum_nao_computado: [],
    periodos_omissos: [],
    periodos_especiais: [],
    periodos_rurais: [],
    resumo_inss: {
      total_tempo_comum_perdido: 0,
      total_periodos_omissos: 0,
      total_periodos_especiais: 0,
      total_periodos_rurais: 0,
      impacto_financeiro_estimado: 0
    }
  };
  
  // 1.  IDENTIFICAR PERÍODOS QUE O INSS DEIXOU DE COMPUTAR COMO TEMPO COMUM
  console.log(' [INSS] Analisando períodos não computados como tempo comum...');
  
  excelOnly.forEach((period, index) => {
    const tempoComumAnalysis = analyzeTempoComum(period);
    
    if (tempoComumAnalysis.should_be_computed) {
      const periodoNaoComputado = {
        id: `tempo_comum_${index + 1}`,
        period: period,
        motivo: tempoComumAnalysis.motivo,
        impacto: tempoComumAnalysis.impacto,
        dias_perdidos: period.duration_days || 0,
        valor_estimado_perdido: calculateEstimatedLoss(period.duration_days || 0),
        recomendacoes: tempoComumAnalysis.recomendacoes,
        urgencia: tempoComumAnalysis.urgencia,
        documentos_necessarios: tempoComumAnalysis.documentos_necessarios
      };
      
      inssAnalysis.tempo_comum_nao_computado.push(periodoNaoComputado);
      inssAnalysis.resumo_inss.total_tempo_comum_perdido += period.duration_days || 0;
    }
  });
  
  // 2.  IDENTIFICAR PERÍODOS EM QUE O INSS FOI OMISSO NO EXTRATO
  console.log(' [INSS] Analisando omissões no extrato...');
  
  excelOnly.forEach((period, index) => {
    const omissaoAnalysis = analyzeOmissaoINSS(period);
    
    if (omissaoAnalysis.is_omission) {
      const periodoOmisso = {
        id: `omissao_${index + 1}`,
        period: period,
        tipo_omissao: omissaoAnalysis.tipo_omissao,
        motivo_provavel: omissaoAnalysis.motivo_provavel,
        impacto_legal: omissaoAnalysis.impacto_legal,
        dias_omitidos: period.duration_days || 0,
        acao_recomendada: omissaoAnalysis.acao_recomendada,
        prazo_para_acao: omissaoAnalysis.prazo_para_acao,
        documentos_comprobatorios: omissaoAnalysis.documentos_comprobatorios
      };
      
      inssAnalysis.periodos_omissos.push(periodoOmisso);
      inssAnalysis.resumo_inss.total_periodos_omissos += 1;
    }
  });
  
  // 3.  IDENTIFICAR PERÍODOS ENQUADRADOS COMO ESPECIAIS
  console.log(' [INSS] Analisando períodos especiais...');
  
  // Analisar tanto Excel quanto PDF para períodos especiais
  const matchPeriods = (matches && Array.isArray(matches)) ? matches.map(m => m.excel_period) : [];
  const allPeriods = [...matchPeriods, ...(excelOnly || []), ...(pdfOnly || [])];
  
  allPeriods.forEach((period, index) => {
    const especialAnalysis = analyzePeriodoEspecial(period);
    
    if (especialAnalysis.is_special) {
      const periodoEspecial = {
        id: `especial_${index + 1}`,
        period: period,
        tipo_atividade_especial: especialAnalysis.tipo_atividade,
        categoria_especial: especialAnalysis.categoria,
        fator_conversao: especialAnalysis.fator_conversao,
        tempo_convertido: Math.floor((period.duration_days || 0) * especialAnalysis.fator_conversao),
        beneficio_adicional: especialAnalysis.beneficio_adicional,
        comprovacao_necessaria: especialAnalysis.comprovacao_necessaria,
        status_reconhecimento: especialAnalysis.status_reconhecimento
      };
      
      inssAnalysis.periodos_especiais.push(periodoEspecial);
      inssAnalysis.resumo_inss.total_periodos_especiais += 1;
    }
  });
  
  // 4.  IDENTIFICAR PERÍODOS RURAIS RECONHECIDOS
  console.log(' [INSS] Analisando períodos rurais...');
  
  allPeriods.forEach((period, index) => {
    const ruralAnalysis = analyzePeriodoRural(period);
    
    if (ruralAnalysis.is_rural) {
      const periodoRural = {
        id: `rural_${index + 1}`,
        period: period,
        tipo_atividade_rural: ruralAnalysis.tipo_atividade,
        categoria_segurado: ruralAnalysis.categoria_segurado,
        regime_previdenciario: ruralAnalysis.regime_previdenciario,
        comprovacao_rural: ruralAnalysis.comprovacao_rural,
        beneficios_rurais: ruralAnalysis.beneficios_rurais,
        idade_minima_aplicavel: ruralAnalysis.idade_minima_aplicavel,
        status_reconhecimento: ruralAnalysis.status_reconhecimento
      };
      
      inssAnalysis.periodos_rurais.push(periodoRural);
      inssAnalysis.resumo_inss.total_periodos_rurais += 1;
    }
  });
  
  // Calcular impacto financeiro total estimado
  inssAnalysis.resumo_inss.impacto_financeiro_estimado = 
    inssAnalysis.tempo_comum_nao_computado.reduce((total, p) => total + (p.valor_estimado_perdido || 0), 0);
  
  console.log(` [INSS] Análise especializada concluída:`, {
    tempo_comum_perdido: inssAnalysis.resumo_inss.total_tempo_comum_perdido,
    periodos_omissos: inssAnalysis.resumo_inss.total_periodos_omissos,
    periodos_especiais: inssAnalysis.resumo_inss.total_periodos_especiais,
    periodos_rurais: inssAnalysis.resumo_inss.total_periodos_rurais,
    impacto_financeiro: inssAnalysis.resumo_inss.impacto_financeiro_estimado
  });
  
  return inssAnalysis;
}

// Analisar se período deveria ser computado como tempo comum
function analyzeTempoComum(period) {
  const company = (period.company || '').toUpperCase();
  const startYear = new Date(period.start_date).getFullYear();
  const duration = period.duration_days || 0;
  
  // Critérios para tempo comum
  const isRegularEmployment = !company.includes('RURAL') && 
                             !company.includes('COOPERATIVA') && 
                             !company.includes('SINDICATO') &&
                             duration >= 30; // Mínimo 30 dias
  
  const isAfter1991 = startYear >= 1991; // Após criação do RGPS
  
  if (isRegularEmployment && isAfter1991) {
    return {
      should_be_computed: true,
      motivo: `Período de emprego formal de ${duration} dias deveria ser computado como tempo comum`,
      impacto: duration > 365 ? 'ALTO' : duration > 180 ? 'MÉDIO' : 'BAIXO',
      urgencia: duration > 365 ? 'CRÍTICA' : 'ALTA',
      recomendacoes: [
        'Solicitar revisão do CNIS (Cadastro Nacional de Informações Sociais)',
        'Apresentar carteira de trabalho e documentos comprobatórios',
        'Protocolar pedido de inclusão de período no INSS',
        duration > 365 ? 'URGENTE: Período superior a 1 ano não computado' : 'Verificar motivo da não inclusão'
      ],
      documentos_necessarios: [
        'Carteira de Trabalho',
        'Contrato de trabalho',
        'Comprovantes de pagamento',
        'Declaração da empresa',
        'Guias de recolhimento do FGTS'
      ]
    };
  }
  
  return {
    should_be_computed: false,
    motivo: 'Período não se enquadra como tempo comum padrão'
  };
}

// Analisar omissões do INSS
function analyzeOmissaoINSS(period) {
  const company = (period.company || '').toUpperCase();
  const duration = period.duration_days || 0;
  const startYear = new Date(period.start_date).getFullYear();
  
  // Identificar tipos de omissão
  let tipoOmissao = 'PERÍODO_FORMAL';
  let motivoProvavel = 'Empresa não repassou informações ao INSS';
  
  if (company.includes('PÚBLICO') || company.includes('PREFEITURA') || company.includes('ESTADO')) {
    tipoOmissao = 'SERVIÇO_PÚBLICO';
    motivoProvavel = 'Possível período de serviço público não informado ao RGPS';
  } else if (company.includes('COOPERATIVA')) {
    tipoOmissao = 'COOPERATIVA';
    motivoProvavel = 'Período em cooperativa pode ter regime diferenciado';
  } else if (startYear < 1991) {
    tipoOmissao = 'PERÍODO_ANTERIOR_RGPS';
    motivoProvavel = 'Período anterior ao RGPS (1991) pode não estar no sistema';
  }
  
  return {
    is_omission: duration >= 30, // Considera omissão se >= 30 dias
    tipo_omissao: tipoOmissao,
    motivo_provavel: motivoProvavel,
    impacto_legal: duration > 365 ? 'CRÍTICO - Pode afetar aposentadoria' : 'MODERADO - Verificar necessidade',
    acao_recomendada: getAcaoRecomendadaOmissao(tipoOmissao),
    prazo_para_acao: duration > 365 ? '30 dias' : '90 dias',
    documentos_comprobatorios: getDocumentosOmissao(tipoOmissao)
  };
}

// Analisar períodos especiais
function analyzePeriodoEspecial(period) {
  const company = (period.company || '').toUpperCase();
  
  // Identificar atividades especiais por palavras-chave
  const atividadesEspeciais = {
    'MINERAÇÃO': { fator: 1.4, categoria: 'Atividade Insalubre - Mineração' },
    'SIDERURGIA': { fator: 1.4, categoria: 'Atividade Insalubre - Siderurgia' },
    'METALURGIA': { fator: 1.4, categoria: 'Atividade Insalubre - Metalurgia' },
    'QUÍMICA': { fator: 1.4, categoria: 'Atividade Insalubre - Química' },
    'PETRÓLEO': { fator: 1.4, categoria: 'Atividade Insalubre - Petróleo' },
    'AMIANTO': { fator: 1.4, categoria: 'Atividade Especial - Amianto' },
    'HOSPITAL': { fator: 1.4, categoria: 'Atividade Insalubre - Hospitalar' },
    'RAIO': { fator: 1.4, categoria: 'Atividade Especial - Radiação' },
    'ELETRICITÁRIO': { fator: 1.4, categoria: 'Atividade Especial - Eletricidade' }
  };
  
  for (const [keyword, config] of Object.entries(atividadesEspeciais)) {
    if (company.includes(keyword)) {
      return {
        is_special: true,
        tipo_atividade: keyword,
        categoria: config.categoria,
        fator_conversao: config.fator,
        beneficio_adicional: `Conversão de tempo: ${config.fator}x`,
        comprovacao_necessaria: 'PPP (Perfil Profissiográfico Previdenciário)',
        status_reconhecimento: 'REQUER_ANÁLISE'
      };
    }
  }
  
  return { is_special: false };
}

// Analisar períodos rurais
function analyzePeriodoRural(period) {
  const company = (period.company || '').toUpperCase();
  
  const atividadesRurais = [
    'RURAL', 'FAZENDA', 'AGRICULTURA', 'PECUÁRIA', 'COOPERATIVA RURAL',
    'SINDICATO RURAL', 'AGROPECUÁRIA', 'LAVOURA', 'CRIAÇÃO'
  ];
  
  const isRural = atividadesRurais.some(keyword => company.includes(keyword));
  
  if (isRural) {
    return {
      is_rural: true,
      tipo_atividade: 'ATIVIDADE_RURAL',
      categoria_segurado: 'SEGURADO_ESPECIAL_RURAL',
      regime_previdenciario: 'RGPS_RURAL',
      comprovacao_rural: 'Documentos de atividade rural necessários',
      beneficios_rurais: 'Aposentadoria rural com idade reduzida',
      idade_minima_aplicavel: 'Homem: 60 anos, Mulher: 55 anos',
      status_reconhecimento: 'RECONHECIDO_COMO_RURAL'
    };
  }
  
  return { is_rural: false };
}

// Funções auxiliares
function calculateEstimatedLoss(days) {
  // Estimativa baseada em salário mínimo e impacto na aposentadoria
  const salarioMinimo = 1320; // Valor aproximado 2024
  const impactoDiario = salarioMinimo / 30;
  return Math.round(days * impactoDiario * 0.1); // 10% de impacto estimado
}

function getAcaoRecomendadaOmissao(tipo) {
  switch (tipo) {
    case 'SERVIÇO_PÚBLICO':
      return 'Solicitar CTC (Certidão de Tempo de Contribuição) do órgão público';
    case 'COOPERATIVA':
      return 'Verificar recolhimentos da cooperativa e solicitar inclusão';
    case 'PERÍODO_ANTERIOR_RGPS':
      return 'Apresentar documentos do período anterior a 1991';
    default:
      return 'Protocolar pedido de inclusão com documentos comprobatórios';
  }
}

function getDocumentosOmissao(tipo) {
  const documentosBase = ['Carteira de Trabalho', 'Contratos', 'Comprovantes de pagamento'];
  
  switch (tipo) {
    case 'SERVIÇO_PÚBLICO':
      return [...documentosBase, 'CTC do órgão público', 'Portarias de nomeação'];
    case 'COOPERATIVA':
      return [...documentosBase, 'Documentos da cooperativa', 'Comprovantes de recolhimento'];
    default:
      return documentosBase;
  }
}


module.exports = {
  performComparison,
  compareEmploymentPeriods,
  findBestMatch,
  calculateSimilarityScore,
  calculateDateOverlap,
  analyzeMatch,
  calculateStatistics,
  performINSSSpecializedAnalysis,
  analyzeTempoComum,
  analyzeOmissaoINSS,
  analyzePeriodoEspecial,
  analyzePeriodoRural,
  calculateEstimatedLoss,
  getAcaoRecomendadaOmissao,
  getDocumentosOmissao
};
