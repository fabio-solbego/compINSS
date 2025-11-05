const { executeQuery } = require('./config/database');

async function debugDatabase() {
    try {
        console.log('🔍 DEBUGANDO BANCO DE DADOS\n');
        
        // 1. Verificar uploads recentes
        console.log('📋 UPLOADS RECENTES:');
        const uploads = await executeQuery('SELECT * FROM uploads ORDER BY created_at DESC LIMIT 5');
        uploads.forEach(upload => {
            console.log(`   ID: ${upload.id} | Arquivo: ${upload.original_name} | Criado: ${upload.created_at}`);
        });
        
        // 2. Verificar períodos salvos
        console.log('\n📊 PERÍODOS SALVOS:');
        const periods = await executeQuery('SELECT * FROM employment_periods ORDER BY created_at DESC LIMIT 10');
        console.log(`   Total de períodos: ${periods.length}`);
        
        periods.forEach(period => {
            console.log(`   Upload ID: ${period.upload_id} | Empresa: ${period.company} | ${period.start_date} a ${period.end_date}`);
        });
        
        // 3. Verificar se há períodos para o upload mais recente
        if (uploads.length > 0) {
            const latestUploadId = uploads[0].id;
            console.log(`\n🔍 PERÍODOS PARA UPLOAD ${latestUploadId}:`);
            const periodsForUpload = await executeQuery('SELECT * FROM employment_periods WHERE upload_id = ?', [latestUploadId]);
            console.log(`   Períodos encontrados: ${periodsForUpload.length}`);
            
            periodsForUpload.forEach(period => {
                console.log(`   - ${period.company} (${period.start_date} a ${period.end_date})`);
            });
        }
        
        // 4. Verificar estrutura da tabela
        console.log('\n🏗️ ESTRUTURA DA TABELA employment_periods:');
        const structure = await executeQuery('DESCRIBE employment_periods');
        structure.forEach(col => {
            console.log(`   ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
        });
        
    } catch (error) {
        console.error('❌ ERRO:', error.message);
    }
}

debugDatabase();
