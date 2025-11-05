/**
 * 🧪 TESTE DE EXTRAÇÃO - Verificar se os processadores estão funcionando
 */

const ExcelINSSProcessor = require('./src/services/excelINSSProcessor');
const PDFINSSProcessor = require('./src/services/pdfINSSProcessor');
const path = require('path');
const fs = require('fs');

async function testExcelProcessor() {
    console.log('🧪 TESTANDO PROCESSADOR EXCEL');
    console.log('==============================\n');
    
    try {
        const processor = new ExcelINSSProcessor();
        
        // Verificar se há arquivos Excel na pasta uploads
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            console.log('❌ Pasta uploads não existe');
            return;
        }
        
        const files = fs.readdirSync(uploadsDir);
        const excelFiles = files.filter(f => 
            f.toLowerCase().endsWith('.xlsx') || f.toLowerCase().endsWith('.xls')
        );
        
        if (excelFiles.length === 0) {
            console.log('❌ Nenhum arquivo Excel encontrado');
            return;
        }
        
        // Testar com o arquivo mais recente
        const latestFile = excelFiles[excelFiles.length - 1];
        const filePath = path.join(uploadsDir, latestFile);
        
        console.log(`📊 Testando arquivo: ${latestFile}`);
        console.log(`📁 Caminho: ${filePath}\n`);
        
        const result = await processor.processExcelINSS(filePath);
        
        console.log('✅ RESULTADO DO PROCESSAMENTO:');
        console.log(`   Sucesso: ${result.success}`);
        console.log(`   Períodos encontrados: ${result.periods ? result.periods.length : 0}`);
        console.log(`   Tipo de contexto: ${result.metadata?.context_type || 'N/A'}`);
        console.log(`   Confiança: ${result.metadata?.confidence || 0}%\n`);
        
        if (result.periods && result.periods.length > 0) {
            console.log('📋 PERÍODOS EXTRAÍDOS:');
            result.periods.forEach((period, index) => {
                console.log(`   ${index + 1}. Empresa: ${period.company}`);
                console.log(`      Início: ${period.start_date}`);
                console.log(`      Fim: ${period.end_date}`);
                console.log(`      Duração: ${period.duration_days} dias`);
                console.log(`      Linha origem: ${period.linha_origem}`);
                console.log('');
            });
        } else {
            console.log('❌ NENHUM PERÍODO EXTRAÍDO');
            console.log('💡 Possíveis causas:');
            console.log('   - Arquivo não contém seção "Períodos de contribuição"');
            console.log('   - Formato do arquivo não é reconhecido');
            console.log('   - Dados não seguem padrões esperados');
        }
        
    } catch (error) {
        console.error('❌ ERRO NO TESTE:', error.message);
        console.error('Stack:', error.stack);
    }
}

async function testPDFProcessor() {
    console.log('\n🧪 TESTANDO PROCESSADOR PDF');
    console.log('============================\n');
    
    try {
        const processor = new PDFINSSProcessor();
        
        // Verificar se há arquivos PDF na pasta uploads
        const uploadsDir = path.join(__dirname, 'uploads');
        const files = fs.readdirSync(uploadsDir);
        const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
        
        if (pdfFiles.length === 0) {
            console.log('❌ Nenhum arquivo PDF encontrado');
            return;
        }
        
        // Testar com o arquivo mais recente
        const latestFile = pdfFiles[pdfFiles.length - 1];
        const filePath = path.join(uploadsDir, latestFile);
        
        console.log(`📄 Testando arquivo: ${latestFile}`);
        console.log(`📁 Caminho: ${filePath}\n`);
        
        const result = await processor.processPDFINSS(filePath, 'test');
        
        console.log('✅ RESULTADO DO PROCESSAMENTO:');
        console.log(`   Sucesso: ${result.success}`);
        console.log(`   Períodos encontrados: ${result.periods ? result.periods.length : 0}`);
        console.log(`   Tipo de contexto: ${result.metadata?.context_type || 'N/A'}`);
        console.log(`   Confiança: ${result.metadata?.confidence || 0}%\n`);
        
        if (result.periods && result.periods.length > 0) {
            console.log('📋 PERÍODOS EXTRAÍDOS:');
            result.periods.forEach((period, index) => {
                console.log(`   ${index + 1}. Empresa: ${period.company}`);
                console.log(`      Início: ${period.start_date}`);
                console.log(`      Fim: ${period.end_date}`);
                console.log(`      Duração: ${period.duration_days} dias`);
                console.log(`      Método: ${period.extraction_method}`);
                console.log('');
            });
        } else {
            console.log('❌ NENHUM PERÍODO EXTRAÍDO');
            console.log('💡 Possíveis causas:');
            console.log('   - OCR não conseguiu extrair texto legível');
            console.log('   - Documento não contém períodos de contribuição');
            console.log('   - Formato do PDF não é suportado');
        }
        
        // Finalizar worker OCR
        await processor.terminate();
        
    } catch (error) {
        console.error('❌ ERRO NO TESTE:', error.message);
        console.error('Stack:', error.stack);
    }
}

async function runTests() {
    console.log('🚀 INICIANDO TESTES DE EXTRAÇÃO\n');
    
    await testExcelProcessor();
    await testPDFProcessor();
    
    console.log('\n🏁 TESTES CONCLUÍDOS');
}

if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testExcelProcessor, testPDFProcessor };
