const fileProcessingService = require('./src/services/fileProcessingService');
const EmploymentPeriod = require('./src/models/EmploymentPeriod');
const Upload = require('./src/models/Upload');

async function testFullFlow() {
    try {
        console.log('🧪 TESTANDO FLUXO COMPLETO DE PROCESSAMENTO\n');
        
        // 1. Criar um upload de teste
        console.log('📋 Criando upload de teste...');
        const uploadData = {
            original_name: 'test-file.xlsx',
            file_path: './uploads/file-1762280240975-673524858.xlsx',
            file_size: 12000,
            file_type: 'excel'
        };
        
        const uploadId = await Upload.create(uploadData);
        console.log('✅ Upload criado com ID:', uploadId);
        
        // 2. Processar arquivo
        console.log('\n📊 Processando arquivo...');
        const periods = await fileProcessingService.processFile(
            uploadId, 
            './uploads/file-1762280240975-673524858.xlsx', 
            'excel'
        );
        
        console.log('✅ Processamento concluído:', periods.length, 'períodos');
        
        // 3. Verificar se foram salvos no banco
        console.log('\n🔍 Verificando períodos salvos no banco...');
        const savedPeriods = await EmploymentPeriod.findByUploadId(uploadId);
        console.log('✅ Períodos encontrados no banco:', savedPeriods.length);
        
        // 4. Exibir períodos salvos
        if (savedPeriods.length > 0) {
            console.log('\n📋 PERÍODOS SALVOS:');
            savedPeriods.forEach((period, index) => {
                console.log(`${index + 1}. ${period.company}`);
                console.log(`   Cargo: ${period.role}`);
                console.log(`   Período: ${period.start_date} a ${period.end_date}`);
                console.log(`   Fonte: ${period.source}`);
                console.log('');
            });
        } else {
            console.log('❌ Nenhum período foi salvo no banco!');
        }
        
        // 5. Testar rota da API
        console.log('🌐 Testando busca via modelo...');
        const apiPeriods = await EmploymentPeriod.findByUploadId(uploadId);
        console.log('✅ Períodos via API:', apiPeriods.length);
        
        return { uploadId, periods: savedPeriods };
        
    } catch (error) {
        console.error('❌ ERRO NO TESTE:', error.message);
        console.error('Stack:', error.stack);
    }
}

testFullFlow();
