/**
 * 🔍 TESTE ESPECÍFICO - Linha 29 (ELEUTERIO FURLANETTO)
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const excelINSSProcessor = require('./src/services/excelINSSProcessor');

async function testLinha29() {
    console.log('🔍 Testando especificamente a linha 29 (ELEUTERIO FURLANETTO)...\n');

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

        // Testar linha 29 especificamente
        const row29 = worksheet.getRow(29);
        
        console.log('📋 CONTEÚDO DA LINHA 29:');
        row29.eachCell((cell, colNum) => {
            if (cell.value) {
                console.log(`   Col${colNum}: "${cell.value}"`);
            }
        });

        // Testar pré-filtro
        const hasRowPotential = excelINSSProcessor.hasRowPotential(row29);
        console.log(`\n🔍 Pré-filtro (hasRowPotential): ${hasRowPotential ? '✅ PASSOU' : '❌ REJEITADO'}`);

        // Testar extração da linha
        const cache = new Map();
        const period = excelINSSProcessor.extractPeriodFromRowOptimized(row29, 29, cache);
        
        console.log(`\n📊 Extração de período: ${period ? '✅ SUCESSO' : '❌ FALHOU'}`);
        
        if (period) {
            console.log('✅ Período extraído:', {
                empresa: period.company,
                cargo: period.role,
                inicio: period.start_date,
                fim: period.end_date
            });
        } else {
            console.log('❌ Nenhum período foi extraído da linha 29');
            
            // Debug detalhado
            console.log('\n🔍 DEBUG DETALHADO:');
            
            const rowData = [];
            row29.eachCell((cell, colNum) => {
                const value = excelINSSProcessor.getCellValue(cell);
                if (!value) return;
                
                const cellType = excelINSSProcessor.classifyCell(value);
                rowData.push({ col: colNum, value, type: cellType });
                console.log(`   Col${colNum}: "${value}" → Tipo: ${cellType}`);
            });
            
            const empresas = rowData.filter(d => d.type === 'empresa');
            const datas = rowData.filter(d => d.type === 'data');
            
            console.log(`\n📊 Resumo:`);
            console.log(`   Empresas encontradas: ${empresas.length}`);
            console.log(`   Datas encontradas: ${datas.length}`);
            
            if (empresas.length > 0) {
                console.log(`   Empresa: ${empresas[0].value}`);
            }
            
            if (datas.length > 0) {
                console.log(`   Datas: ${datas.map(d => d.value).join(', ')}`);
            }
        }

    } catch (error) {
        console.error('❌ Erro no teste:', error.message);
    }
}

testLinha29();
