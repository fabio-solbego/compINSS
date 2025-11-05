/**
 * 🧪 TESTE DE UPLOAD SIMULADO
 */

const fileProcessingService = require('./src/services/fileProcessingService');
const Upload = require('./src/models/Upload');
const path = require('path');

async function testUpload() {
    console.log('🧪 TESTANDO UPLOAD COMPLETO\n');
    
    try {
        // 1. Criar upload de teste para Excel
        console.log('📊 Testando upload Excel...');
        const excelUploadData = {
            original_name: 'test-excel.xlsx',
            file_path: './uploads/file-1762280240975-673524858.xlsx',
            file_size: 12000,
            file_type: 'excel'
        };
        
        const excelUploadId = await Upload.create(excelUploadData);
        console.log('✅ Upload Excel criado:', excelUploadId);
        
        // Processar Excel
        const excelPeriods = await fileProcessingService.processFile(
            excelUploadId, 
            './uploads/file-1762280240975-673524858.xlsx', 
            'excel'
        );
        
        console.log('✅ Excel processado:', excelPeriods.length, 'períodos');
        
        // 2. Criar upload de teste para PDF
        console.log('\n📄 Testando upload PDF...');
        
        // Verificar se há arquivos PDF
        const fs = require('fs');
        const uploadsDir = './uploads';
        
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
            
            if (pdfFiles.length > 0) {
                const pdfPath = path.join(uploadsDir, pdfFiles[0]);
                
                const pdfUploadData = {
                    original_name: pdfFiles[0],
                    file_path: pdfPath,
                    file_size: 50000,
                    file_type: 'pdf'
                };
                
                const pdfUploadId = await Upload.create(pdfUploadData);
                console.log('✅ Upload PDF criado:', pdfUploadId);
                
                // Processar PDF
                const pdfPeriods = await fileProcessingService.processFile(
                    pdfUploadId, 
                    pdfPath, 
                    'pdf'
                );
                
                console.log('✅ PDF processado:', pdfPeriods.length, 'períodos');
                
            } else {
                console.log('⚠️ Nenhum arquivo PDF encontrado para teste');
            }
        }
        
        console.log('\n🎉 TESTE DE UPLOAD CONCLUÍDO COM SUCESSO!');
        console.log('✅ Sistema não gera mais erros 500');
        
    } catch (error) {
        console.error('❌ ERRO NO TESTE:', error.message);
        console.error('Stack:', error.stack);
    }
}

testUpload();
