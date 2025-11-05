/**
 * 🔍 FERRAMENTA DE DIAGNÓSTICO - Análise de arquivos problemáticos
 */

const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

class DiagnosticTool {
    static async analyzeExcelFile(filePath) {
        console.log('🔍 DIAGNÓSTICO DE ARQUIVO EXCEL');
        console.log('================================\n');
        
        try {
            // Verificar se arquivo existe
            if (!fs.existsSync(filePath)) {
                return { error: 'Arquivo não encontrado', details: filePath };
            }

            // Informações básicas do arquivo
            const stats = fs.statSync(filePath);
            console.log('📁 Informações do arquivo:');
            console.log(`   Nome: ${path.basename(filePath)}`);
            console.log(`   Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
            console.log(`   Modificado: ${stats.mtime.toLocaleString('pt-BR')}\n`);

            // Tentar ler o arquivo
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            
            const worksheet = workbook.getWorksheet(1);
            if (!worksheet) {
                return { error: 'Nenhuma planilha encontrada' };
            }

            console.log('📊 Informações da planilha:');
            console.log(`   Nome: ${worksheet.name || 'Sem nome'}`);
            console.log(`   Linhas: ${worksheet.rowCount}`);
            console.log(`   Colunas: ${worksheet.columnCount}\n`);

            // Analisar conteúdo
            const analysis = {
                totalCells: 0,
                nonEmptyCells: 0,
                possibleCompanies: [],
                possibleDates: [],
                possibleJobs: [],
                sampleData: []
            };

            // Analisar primeiras 20 linhas
            for (let rowNum = 1; rowNum <= Math.min(20, worksheet.rowCount); rowNum++) {
                const row = worksheet.getRow(rowNum);
                const rowData = [];
                
                row.eachCell((cell, colNum) => {
                    analysis.totalCells++;
                    
                    if (cell.value) {
                        analysis.nonEmptyCells++;
                        const value = cell.value.toString().trim();
                        rowData.push(`Col${colNum}: "${value}"`);
                        
                        // Detectar possíveis empresas
                        if (this.looksLikeCompany(value)) {
                            analysis.possibleCompanies.push({ row: rowNum, col: colNum, value });
                        }
                        
                        // Detectar possíveis datas
                        if (this.looksLikeDate(value)) {
                            analysis.possibleDates.push({ row: rowNum, col: colNum, value });
                        }
                        
                        // Detectar possíveis cargos
                        if (this.looksLikeJob(value)) {
                            analysis.possibleJobs.push({ row: rowNum, col: colNum, value });
                        }
                    }
                });
                
                if (rowData.length > 0) {
                    analysis.sampleData.push(`Linha ${rowNum}: ${rowData.join(' | ')}`);
                }
            }

            // Relatório de diagnóstico
            console.log('🔍 ANÁLISE DE CONTEÚDO:');
            console.log(`   Total de células: ${analysis.totalCells}`);
            console.log(`   Células preenchidas: ${analysis.nonEmptyCells}`);
            console.log(`   Taxa de preenchimento: ${((analysis.nonEmptyCells / analysis.totalCells) * 100).toFixed(1)}%\n`);

            console.log('🏢 POSSÍVEIS EMPRESAS ENCONTRADAS:');
            if (analysis.possibleCompanies.length > 0) {
                analysis.possibleCompanies.forEach((item, index) => {
                    console.log(`   ${index + 1}. Linha ${item.row}, Col ${item.col}: "${item.value}"`);
                });
            } else {
                console.log('   ❌ Nenhuma empresa detectada');
                console.log('   💡 Dica: Empresas devem conter LTDA, S/A, INDÚSTRIA, etc.');
            }
            console.log('');

            console.log('📅 POSSÍVEIS DATAS ENCONTRADAS:');
            if (analysis.possibleDates.length > 0) {
                analysis.possibleDates.forEach((item, index) => {
                    console.log(`   ${index + 1}. Linha ${item.row}, Col ${item.col}: "${item.value}"`);
                });
            } else {
                console.log('   ❌ Nenhuma data detectada');
                console.log('   💡 Dica: Use formato DD/MM/AAAA (ex: 01/01/2020)');
            }
            console.log('');

            console.log('👔 POSSÍVEIS CARGOS ENCONTRADOS:');
            if (analysis.possibleJobs.length > 0) {
                analysis.possibleJobs.forEach((item, index) => {
                    console.log(`   ${index + 1}. Linha ${item.row}, Col ${item.col}: "${item.value}"`);
                });
            } else {
                console.log('   ❌ Nenhum cargo detectado');
            }
            console.log('');

            console.log('📋 AMOSTRA DOS DADOS (primeiras linhas):');
            analysis.sampleData.slice(0, 10).forEach(line => {
                console.log(`   ${line}`);
            });

            // Recomendações
            console.log('\n💡 RECOMENDAÇÕES:');
            if (analysis.possibleCompanies.length === 0) {
                console.log('   ⚠️  Adicione empresas com indicadores claros (LTDA, S/A, INDÚSTRIA)');
            }
            if (analysis.possibleDates.length < 2) {
                console.log('   ⚠️  Adicione datas de início e fim no formato DD/MM/AAAA');
            }
            if (analysis.nonEmptyCells < 10) {
                console.log('   ⚠️  Planilha parece estar quase vazia');
            }

            return analysis;

        } catch (error) {
            console.error('❌ Erro no diagnóstico:', error.message);
            return { error: error.message };
        }
    }

    static looksLikeCompany(text) {
        const indicators = ['ltda', 's/a', 'sa ', 'industria', 'comercio', 'materiais', 'imobiliaria', 'orientacao'];
        return text.length > 10 && indicators.some(ind => text.toLowerCase().includes(ind));
    }

    static looksLikeDate(text) {
        return /\d{1,2}\/\d{1,2}\/\d{4}/.test(text) || text instanceof Date;
    }

    static looksLikeJob(text) {
        const jobs = ['auxiliar', 'assistente', 'analista', 'gerente', 'diretor', 'vendedor', 'operador'];
        return text.length < 30 && jobs.some(job => text.toLowerCase().includes(job));
    }
}

// Usar a ferramenta
async function runDiagnostic() {
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsDir);
    const excelFiles = files.filter(f => f.toLowerCase().endsWith('.xlsx') || f.toLowerCase().endsWith('.xls'));
    
    if (excelFiles.length === 0) {
        console.log('❌ Nenhum arquivo Excel encontrado na pasta uploads');
        return;
    }

    // Analisar o arquivo mais recente
    const latestFile = excelFiles[excelFiles.length - 1];
    const filePath = path.join(uploadsDir, latestFile);
    
    console.log(`🔍 Analisando arquivo mais recente: ${latestFile}\n`);
    await DiagnosticTool.analyzeExcelFile(filePath);
}

if (require.main === module) {
    runDiagnostic();
}

module.exports = DiagnosticTool;
