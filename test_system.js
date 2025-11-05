/**
 * 🧪 TESTE COMPLETO DO SISTEMA
 */

const ExcelINSSProcessor = require('./src/services/excelINSSProcessor');
const PDFINSSProcessor = require('./src/services/pdfINSSProcessor');

async function testSystem() {
    console.log('🧪 TESTANDO SISTEMA COMPLETO\n');
    
    try {
        // 1. Testar processador Excel
        console.log('📊 Testando processador Excel...');
        const excelProcessor = new ExcelINSSProcessor();
        
        try {
            const excelResult = await excelProcessor.processExcelINSS('./uploads/file-1762280240975-673524858.xlsx');
            console.log('✅ Excel OK:', excelResult.periods?.length || 0, 'períodos');
        } catch (excelError) {
            console.log('❌ Excel falhou:', excelError.message);
        }
        
        // 2. Testar processador PDF
        console.log('\n📄 Testando processador PDF...');
        const pdfProcessor = new PDFINSSProcessor();
        
        try {
            // Verificar se há arquivos PDF
            const fs = require('fs');
            const path = require('path');
            const uploadsDir = './uploads';
            
            if (fs.existsSync(uploadsDir)) {
                const files = fs.readdirSync(uploadsDir);
                const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
                
                if (pdfFiles.length > 0) {
                    const pdfPath = path.join(uploadsDir, pdfFiles[0]);
                    const pdfResult = await pdfProcessor.processPDFINSS(pdfPath, 'test');
                    console.log('✅ PDF OK:', pdfResult.periods?.length || 0, 'períodos');
                    
                    // Finalizar worker
                    await pdfProcessor.terminate();
                } else {
                    console.log('⚠️ Nenhum arquivo PDF encontrado para teste');
                }
            } else {
                console.log('⚠️ Pasta uploads não existe');
            }
        } catch (pdfError) {
            console.log('❌ PDF falhou:', pdfError.message);
        }
        
        // 3. Testar servidor
        console.log('\n🌐 Testando servidor...');
        try {
            const response = await fetch('http://localhost:3021/');
            if (response.ok) {
                console.log('✅ Servidor OK: Status', response.status);
            } else {
                console.log('❌ Servidor erro:', response.status);
            }
        } catch (serverError) {
            console.log('❌ Servidor inacessível:', serverError.message);
        }
        
        console.log('\n🎉 TESTE CONCLUÍDO');
        
    } catch (error) {
        console.error('❌ ERRO GERAL:', error.message);
    }
}

testSystem();
