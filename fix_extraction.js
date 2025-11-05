/**
 * 🔧 CORREÇÃO RÁPIDA - Tornar extração funcional
 */

const ExcelINSSProcessor = require('./src/services/excelINSSProcessor');
const EmploymentPeriod = require('./src/models/EmploymentPeriod');
const Upload = require('./src/models/Upload');

async function fixAndTest() {
    try {
        console.log('🔧 CORRIGINDO E TESTANDO EXTRAÇÃO...\n');
        
        // 1. Testar processador diretamente
        console.log('📊 Testando processador Excel...');
        const processor = new ExcelINSSProcessor();
        const result = await processor.processExcelINSS('./uploads/file-1762280240975-673524858.xlsx');
        
        console.log('✅ Processador funcionando:', result.periods.length, 'períodos extraídos');
        
        // 2. Criar upload de teste
        console.log('\n📋 Criando upload de teste...');
        const uploadId = await Upload.create({
            original_name: 'test-extraction.xlsx',
            file_path: './uploads/file-1762280240975-673524858.xlsx',
            file_size: 12000,
            file_type: 'excel'
        });
        console.log('✅ Upload criado:', uploadId);
        
        // 3. Converter e salvar períodos
        console.log('\n💾 Salvando períodos no banco...');
        for (let i = 0; i < result.periods.length; i++) {
            const period = result.periods[i];
            
            const periodData = {
                upload_id: uploadId,
                source: 'excel',
                company: period.company,
                role: period.position || 'Não informado',
                start_date: period.start_date,
                end_date: period.end_date,
                raw_text: `${period.company} - ${period.position || 'Não informado'} (${period.start_date} a ${period.end_date})`,
                normalized: {
                    company_normalized: period.company,
                    role_normalized: period.position || 'Não informado',
                    start_date_parsed: period.start_date,
                    end_date_parsed: period.end_date,
                    duration_days: period.duration_days,
                    source_row: period.linha_origem,
                    extraction_method: period.extraction_method || 'advanced_v3',
                    confidence_score: period.confidence_score || 0
                }
            };
            
            console.log(`   Salvando ${i+1}/${result.periods.length}: ${period.company}`);
            await EmploymentPeriod.create(periodData);
        }
        
        // 4. Verificar se foram salvos
        console.log('\n🔍 Verificando períodos salvos...');
        const savedPeriods = await EmploymentPeriod.findByUploadId(uploadId);
        console.log('✅ Períodos salvos no banco:', savedPeriods.length);
        
        // 5. Exibir resultado
        console.log('\n📋 PERÍODOS SALVOS COM SUCESSO:');
        savedPeriods.forEach((period, index) => {
            console.log(`${index + 1}. ${period.company} (${period.start_date} a ${period.end_date})`);
        });
        
        console.log('\n🎉 EXTRAÇÃO FUNCIONANDO PERFEITAMENTE!');
        console.log(`📊 Upload ID para teste: ${uploadId}`);
        
        return uploadId;
        
    } catch (error) {
        console.error('❌ ERRO:', error.message);
        console.error('Stack:', error.stack);
    }
}

fixAndTest();
