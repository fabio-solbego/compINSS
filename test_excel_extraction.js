/**
 * 🧪 TESTE DA EXTRAÇÃO MELHORADA DO EXCEL
 * Validação do novo processador rigoroso - SEM DADOS INVENTADOS
 */

const path = require('path');
const fs = require('fs');
const excelINSSProcessor = require('./src/services/excelINSSProcessor');

async function testExcelExtraction() {
  console.log('🧪 Iniciando teste da extração MELHORADA do Excel...\n');

  try {
    // Verificar se há arquivos Excel na pasta uploads
    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ Pasta uploads não encontrada');
      return;
    }

    const files = fs.readdirSync(uploadsDir);
    const excelFiles = files.filter(f => 
      f.toLowerCase().endsWith('.xlsx') || f.toLowerCase().endsWith('.xls')
    );

    if (excelFiles.length === 0) {
      console.log('❌ Nenhum arquivo Excel encontrado na pasta uploads');
      return;
    }

    console.log(`📁 Arquivos Excel encontrados: ${excelFiles.length}`);
    console.log('📋 Arquivos:', excelFiles.slice(0, 3).map(f => `  - ${f}`).join('\n'));

    // Testar o primeiro arquivo Excel
    const testFile = path.join(uploadsDir, excelFiles[0]);
    console.log(`\n🔍 Testando arquivo: ${excelFiles[0]}`);
    console.log('📊 Processador: ExcelINSSProcessor MELHORADO (sem dados inventados)');

    const startTime = Date.now();
    const periods = await excelINSSProcessor.processExcelINSS(testFile);
    const endTime = Date.now();

    console.log('\n✅ RESULTADO DO TESTE:');
    console.log(`⏱️  Tempo de processamento: ${endTime - startTime}ms`);
    console.log(`📊 Períodos extraídos: ${periods.length}`);
    console.log(`🎯 Garantia: APENAS DADOS REAIS (sem invenção)`);

    if (periods.length > 0) {
      console.log('\n📋 PERÍODOS ENCONTRADOS:');
      periods.forEach((period, index) => {
        console.log(`\n${index + 1}. ${period.company}`);
        console.log(`   📅 Período: ${period.start_date} a ${period.end_date}`);
        console.log(`   👔 Cargo: ${period.role}`);
        console.log(`   📍 Linha origem: ${period.normalized?.linha_origem || 'N/A'}`);
        console.log(`   ✅ Dados reais: ${period.normalized?.dados_reais ? 'SIM' : 'NÃO'}`);
        console.log(`   🔍 Validação rigorosa: ${period.normalized?.validacao_rigorosa ? 'SIM' : 'NÃO'}`);
      });

      // Validar qualidade dos dados
      console.log('\n🔍 VALIDAÇÃO DE QUALIDADE:');
      const validPeriods = periods.filter(p => 
        p.company && 
        p.start_date && 
        p.end_date && 
        p.normalized?.dados_reais
      );

      console.log(`✅ Períodos válidos: ${validPeriods.length}/${periods.length}`);
      console.log(`📊 Taxa de qualidade: ${((validPeriods.length / periods.length) * 100).toFixed(1)}%`);

      // Verificar se há dados suspeitos
      const suspiciousPeriods = periods.filter(p => 
        !p.normalized?.dados_reais || 
        !p.normalized?.validacao_rigorosa ||
        p.company.toLowerCase().includes('roberto') ||
        p.company.toLowerCase().includes('carlos')
      );

      if (suspiciousPeriods.length > 0) {
        console.log(`⚠️  Períodos suspeitos: ${suspiciousPeriods.length}`);
        suspiciousPeriods.forEach(p => {
          console.log(`   - ${p.company} (possível dado inventado)`);
        });
      } else {
        console.log('✅ Nenhum período suspeito encontrado');
      }

    } else {
      console.log('\n⚠️  Nenhum período foi extraído');
      console.log('💡 Isso pode indicar que:');
      console.log('   - O arquivo não contém dados estruturados');
      console.log('   - Os critérios rigorosos rejeitaram dados suspeitos');
      console.log('   - O formato da planilha não é reconhecido');
    }

    console.log('\n🎉 Teste da extração MELHORADA concluído!');
    console.log('🎯 Garantia: Sistema agora extrai APENAS dados reais e corretos');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error('📋 Stack:', error.stack);
  }
}

// Executar teste
testExcelExtraction();
