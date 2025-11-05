const ExcelJS = require('exceljs');
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
    new winston.transports.File({ filename: 'logs/excel-export.log' }),
    new winston.transports.Console()
  ]
});

/**
 * Serviço para exportar dados extraídos do TXT para planilha Excel
 */
class ExcelExportService {
  constructor() {
    this.exportsDir = path.join(__dirname, '../../exports');
    this.ensureExportsDir();
  }

  /**
   * Garantir que o diretório de exports existe
   */
  async ensureExportsDir() {
    try {
      await fs.mkdir(this.exportsDir, { recursive: true });
    } catch (error) {
      logger.error('Erro ao criar diretório de exports:', error);
    }
  }

  /**
   * Processar arquivo TXT e extrair períodos para planilha
   */
  async processarTxtParaPlanilha(txtFilePath, uploadId) {
    try {
      console.log('📊 [EXCEL] Processando TXT para planilha:', txtFilePath);
      
      // Ler arquivo TXT
      const texto = await fs.readFile(txtFilePath, 'utf-8');
      
      // Filtrar cabeçalho
      const linhas = texto.split('\n').filter((linha, index) => {
        const linhaLimpa = linha.trim();
        if (index < 10 && (linhaLimpa.startsWith('===') || linhaLimpa.startsWith('Upload ID:') || 
            linhaLimpa.startsWith('Data/Hora:') || linhaLimpa.startsWith('Tamanho do texto:') ||
            linhaLimpa.startsWith('API Key:') || linhaLimpa === '========================================')) {
          return false;
        }
        return true;
      });

      const periodos = [];
      let i = 0;
      const total = linhas.length;

      console.log('📋 [EXCEL] Processando', total, 'linhas...');

      while (i < total) {
        const linha = linhas[i].trim();
        
        // Usar a mesma regex que funciona
        const regexPadrao = /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4}).*?([A-Z][A-Z\s\.\-&]+?)(?:\s*$)/;
        const matchPadrao = linha.match(regexPadrao);
        
        if (matchPadrao) {
          const [, inicio, fim, empregadorParcial] = matchPadrao;
          let empregador = empregadorParcial.trim();
          let tipo = "";

          // Verificar continuação do nome na próxima linha
          if (i + 1 < total) {
            const proximaLinha = linhas[i + 1].trim();
            if (!/^\d/.test(proximaLinha) && proximaLinha.length > 0 && proximaLinha.length < 50) {
              empregador += ' ' + proximaLinha;
            }
          }

          // Buscar tipo de documento nas próximas linhas
          for (let j = i; j < Math.min(i + 6, total); j++) {
            const linhaDoc = linhas[j].trim();
            const tipoMatch = linhaDoc.match(/[Tt]ipo\s+de\s+documento\s*[:\-]?\s*([A-Z]+)/i);
            
            if (tipoMatch) {
              tipo = tipoMatch[1].toUpperCase();
              break;
            }
          }

          // Caso especial: TEMPO EM BENEFICIO
          if (/TEMPO\s+EM\s+BENEFICIO/i.test(empregador)) {
            empregador = "TEMPO EM BENEFICIO";
          } else {
            empregador = this.limparEmpregador(empregador);
          }

          // Só salvar se encontrou dados válidos
          if (empregador && tipo) {
            const duracao = this.calcularDuracao(inicio, fim);
            
            periodos.push({
              sequencia: periodos.length + 1,
              empregador: empregador,
              tipo_documento: tipo,
              data_inicio: inicio,
              data_fim: fim,
              duracao_dias: duracao,
              linha_original: linha.substring(0, 100)
            });

            console.log(`✅ [EXCEL] Período ${periodos.length}: ${empregador} (${inicio} - ${fim}) - ${tipo}`);
          }
        }
        i++;
      }

      console.log('📊 [EXCEL] Total de períodos extraídos:', periodos.length);
      return periodos;

    } catch (error) {
      logger.error('Erro ao processar TXT para planilha:', error);
      throw error;
    }
  }

  /**
   * Criar planilha Excel com os períodos extraídos
   */
  async criarPlanilhaExcel(periodos, uploadId) {
    try {
      console.log('📝 [EXCEL] Criando planilha com', periodos.length, 'períodos...');

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Períodos INSS');

      // Configurar cabeçalhos
      worksheet.columns = [
        { header: 'Seq.', key: 'sequencia', width: 8 },
        { header: 'Empregador', key: 'empregador', width: 50 },
        { header: 'Tipo Doc.', key: 'tipo_documento', width: 12 },
        { header: 'Data Início', key: 'data_inicio', width: 15 },
        { header: 'Data Fim', key: 'data_fim', width: 15 },
        { header: 'Duração (dias)', key: 'duracao_dias', width: 15 },
        { header: 'Linha Original', key: 'linha_original', width: 60 }
      ];

      // Estilizar cabeçalho
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
      };
      worksheet.getRow(1).font.color = { argb: 'FFFFFFFF' };

      // Adicionar dados
      periodos.forEach(periodo => {
        worksheet.addRow(periodo);
      });

      // Aplicar bordas
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      // Adicionar informações do arquivo
      const infoRow = worksheet.addRow([]);
      worksheet.addRow(['Informações do Processamento:']);
      worksheet.addRow(['Upload ID:', uploadId]);
      worksheet.addRow(['Data/Hora:', new Date().toLocaleString('pt-BR')]);
      worksheet.addRow(['Total de Períodos:', periodos.length]);

      // Nome do arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `periodos_inss_upload_${uploadId}_${timestamp}.xlsx`;
      const filePath = path.join(this.exportsDir, fileName);

      // Salvar arquivo
      await workbook.xlsx.writeFile(filePath);

      console.log('✅ [EXCEL] Planilha criada:', fileName);
      logger.info('Planilha Excel criada:', { fileName, filePath, periodos: periodos.length });

      return {
        fileName,
        filePath,
        periodos: periodos.length
      };

    } catch (error) {
      logger.error('Erro ao criar planilha Excel:', error);
      throw error;
    }
  }

  /**
   * Processar arquivo TXT completo e gerar planilha
   */
  async processarTxtCompleto(txtFilePath, uploadId) {
    try {
      console.log('🚀 [EXCEL] Iniciando processamento completo do TXT...');
      
      // Extrair períodos do TXT
      const periodos = await this.processarTxtParaPlanilha(txtFilePath, uploadId);
      
      if (periodos.length === 0) {
        throw new Error('Nenhum período encontrado no arquivo TXT');
      }

      // Criar planilha Excel
      const resultado = await this.criarPlanilhaExcel(periodos, uploadId);
      
      console.log('🎉 [EXCEL] Processamento completo finalizado!');
      return resultado;

    } catch (error) {
      logger.error('Erro no processamento completo:', error);
      throw error;
    }
  }

  /**
   * Limpar nome do empregador (adaptado do teste2.py)
   */
  limparEmpregador(nome) {
    if (!nome) return '';
    
    let nomeClean = nome.trim().toUpperCase();
    
    // Correções específicas
    const correcoes = {
      'ECE BEBIDAS': 'ECE BEBIDAS LTDA',
      'AMBEV BRASIL': 'AMBEV BRASIL BEBIDAS S.A.',
      'STEMAC': 'STEMAC SA GRUPOS GERADORES',
      'ELETROFORJA': 'ELETROFORJA INDUSTRIA MECANICA LTDA'
    };

    for (const [original, corrigido] of Object.entries(correcoes)) {
      if (nomeClean.includes(original)) {
        nomeClean = corrigido;
        break;
      }
    }

    return nomeClean;
  }

  /**
   * Calcular duração entre duas datas
   */
  calcularDuracao(dataInicio, dataFim) {
    try {
      const [diaI, mesI, anoI] = dataInicio.split('/').map(Number);
      const [diaF, mesF, anoF] = dataFim.split('/').map(Number);
      
      const inicio = new Date(anoI, mesI - 1, diaI);
      const fim = new Date(anoF, mesF - 1, diaF);
      
      const diffTime = Math.abs(fim - inicio);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = new ExcelExportService();
