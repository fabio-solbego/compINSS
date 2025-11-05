/**
 * 🔍 DEBUG - ANÁLISE COMPLETA DO CONTEÚDO DO EXCEL
 * Para identificar todas as empresas que deveriam ser extraídas
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function debugExcelContent() {
  console.log('🔍 Iniciando análise completa do Excel...\n');

  try {
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsDir);
    const excelFiles = files.filter(f => 
      f.toLowerCase().endsWith('.xlsx') || f.toLowerCase().endsWith('.xls')
    );

    const testFile = path.join(uploadsDir, excelFiles[0]);
    console.log(`📊 Analisando: ${excelFiles[0]}\n`);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(testFile);
    const worksheet = workbook.getWorksheet(1);

    console.log('📋 CONTEÚDO COMPLETO DA PLANILHA:');
    console.log('=====================================\n');

    // Analisar cada linha
    for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      const rowData = [];
      
      row.eachCell((cell, colNum) => {
        if (cell.value) {
          let value = cell.value;
          if (cell.value instanceof Date) {
            value = cell.value.toLocaleDateString('pt-BR');
          }
          rowData.push(`Col${colNum}: "${value}"`);
        }
      });

      if (rowData.length > 0) {
        console.log(`Linha ${rowNum}: ${rowData.join(' | ')}`);
      }
    }

    console.log('\n=====================================');
    console.log('🔍 ANÁLISE DE POSSÍVEIS EMPRESAS:');
    console.log('=====================================\n');

    // Buscar padrões que parecem empresas
    const possibleCompanies = [];
    
    for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      
      row.eachCell((cell, colNum) => {
        if (cell.value && typeof cell.value === 'string') {
          const value = cell.value.toString().trim();
          
          // Critérios mais amplos para identificar possíveis empresas
          if (value.length >= 8 && 
              (value.includes('LTDA') || 
               value.includes('S.A') || 
               value.includes('INDUSTRIA') ||
               value.includes('COMERCIO') ||
               value.includes('MATERIAIS') ||
               value.includes('CONSTRUCAO') ||
               value.includes('SERVICOS') ||
               value.includes('EMPRESA') ||
               value.includes('CIA') ||
               (value.split(' ').length >= 3 && /^[A-Z]/.test(value)))) {
            
            possibleCompanies.push({
              linha: rowNum,
              coluna: colNum,
              texto: value,
              tamanho: value.length
            });
          }
        }
      });
    }

    console.log(`📊 Possíveis empresas encontradas: ${possibleCompanies.length}\n`);
    
    possibleCompanies.forEach((company, index) => {
      console.log(`${index + 1}. Linha ${company.linha}, Col ${company.coluna}: "${company.texto}"`);
    });

    console.log('\n=====================================');
    console.log('📅 ANÁLISE DE DATAS:');
    console.log('=====================================\n');

    // Buscar todas as datas
    const dates = [];
    
    for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
      const row = worksheet.getRow(rowNum);
      
      row.eachCell((cell, colNum) => {
        if (cell.value) {
          let isDate = false;
          let dateValue = '';
          
          if (cell.value instanceof Date) {
            isDate = true;
            dateValue = cell.value.toLocaleDateString('pt-BR');
          } else if (typeof cell.value === 'string' && /\d{1,2}\/\d{1,2}\/\d{4}/.test(cell.value)) {
            isDate = true;
            dateValue = cell.value;
          }
          
          if (isDate) {
            dates.push({
              linha: rowNum,
              coluna: colNum,
              data: dateValue
            });
          }
        }
      });
    }

    console.log(`📅 Datas encontradas: ${dates.length}\n`);
    
    dates.forEach((date, index) => {
      console.log(`${index + 1}. Linha ${date.linha}, Col ${date.coluna}: ${date.data}`);
    });

  } catch (error) {
    console.error('❌ Erro na análise:', error.message);
  }
}

// Executar debug
debugExcelContent();
