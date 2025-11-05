/**
 * 🧪 TESTE ESPECÍFICO DE EXTRAÇÃO PDF
 */

const PDFINSSProcessor = require('./src/services/pdfINSSProcessor');
const path = require('path');

async function testPDFExtraction() {
    console.log('🧪 TESTANDO EXTRAÇÃO ESPECÍFICA DE PDF\n');
    
    try {
        // Testar com diferentes arquivos PDF
        const pdfFiles = [
            './uploads/file-1762341208773-740309905.pdf', // 746KB - maior
            './uploads/file-1762262757320-212491271.pdf', // 746KB - maior
            './uploads/file-1762176413205-69688461.pdf'   // 53KB - menor
        ];
        
        for (let i = 0; i < pdfFiles.length; i++) {
            const pdfPath = pdfFiles[i];
            console.log(`\n📄 Testando PDF ${i+1}: ${path.basename(pdfPath)}`);
            
            try {
                const processor = new PDFINSSProcessor();
                const result = await processor.processPDFINSS(pdfPath, `test-${i+1}`);
                
                console.log('✅ Resultado:', {
                    períodos: result.periods?.length || 0,
                    contexto: result.metadata?.context_type,
                    confiança: result.metadata?.confidence
                });
                
                if (result.periods && result.periods.length > 0) {
                    console.log('📋 Períodos encontrados:');
                    result.periods.forEach((p, idx) => {
                        console.log(`   ${idx+1}. ${p.company} (${p.start_date} a ${p.end_date})`);
                    });
                } else {
                    console.log('⚠️ Nenhum período encontrado');
                }
                
                // Finalizar worker
                await processor.terminate();
                
            } catch (error) {
                console.error(`❌ Erro no PDF ${i+1}:`, error.message);
            }
        }
        
        console.log('\n🎉 TESTE DE PDF CONCLUÍDO');
        
    } catch (error) {
        console.error('❌ ERRO GERAL:', error.message);
    }
}

testPDFExtraction();
