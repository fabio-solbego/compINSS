const ExcelINSSProcessor = require('./src/services/excelINSSProcessor');

async function quickTest() {
    try {
        console.log('🧪 Testando processador Excel melhorado...');
        
        const processor = new ExcelINSSProcessor();
        const result = await processor.processExcelINSS('./uploads/file-1762280240975-673524858.xlsx');
        
        console.log('\n✅ RESULTADO:');
        console.log('Sucesso:', result.success);
        console.log('Períodos encontrados:', result.periods ? result.periods.length : 0);
        console.log('Contexto:', result.metadata?.context_type);
        console.log('Confiança:', result.metadata?.confidence);
        
        if (result.periods && result.periods.length > 0) {
            console.log('\n📋 PERÍODOS:');
            result.periods.forEach((p, i) => {
                console.log(`${i+1}. ${p.company} (${p.start_date} a ${p.end_date})`);
            });
        } else {
            console.log('\n❌ Nenhum período extraído');
        }
        
    } catch (error) {
        console.error('❌ ERRO:', error.message);
    }
}

quickTest();
