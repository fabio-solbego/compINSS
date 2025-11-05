/**
 * 🔍 DEBUG - VERIFICAR TEXTO EXTRAÍDO DO PDF
 */

const pdfParse = require('pdf-parse');
const fs = require('fs').promises;

async function debugPDFText() {
    console.log('🔍 DEBUGANDO TEXTO EXTRAÍDO DO PDF\n');
    
    try {
        const pdfPath = './uploads/file-1762341208773-740309905.pdf';
        
        console.log('📄 Lendo PDF:', pdfPath);
        const dataBuffer = await fs.readFile(pdfPath);
        const pdfData = await pdfParse(dataBuffer);
        
        console.log('📊 Informações do PDF:');
        console.log('   Páginas:', pdfData.numpages);
        console.log('   Tamanho do texto:', pdfData.text.length, 'caracteres');
        
        console.log('\n📝 PRIMEIROS 1000 CARACTERES DO TEXTO:');
        console.log('=' .repeat(50));
        console.log(pdfData.text.substring(0, 1000));
        console.log('=' .repeat(50));
        
        console.log('\n🔍 PROCURANDO PADRÕES ESPECÍFICOS:');
        
        // Procurar por palavras-chave INSS
        const keywords = [
            'INSS', 'PREVIDENCIA', 'PREVIDENCIÁRIO', 'EXTRATO',
            'VÍNCULOS', 'VINCULOS', 'CONTRIBUIÇÃO', 'CONTRIBUICAO',
            'EMPRESA', 'EMPREGADOR', 'PERÍODO', 'PERIODO',
            'LTDA', 'S.A.', 'S/A', 'EIRELI', 'ME', 'EPP'
        ];
        
        keywords.forEach(keyword => {
            const count = (pdfData.text.match(new RegExp(keyword, 'gi')) || []).length;
            if (count > 0) {
                console.log(`   ✅ "${keyword}": ${count} ocorrências`);
            }
        });
        
        // Procurar por padrões de data
        const datePatterns = [
            /\d{2}\/\d{2}\/\d{4}/g,
            /\d{2}-\d{2}-\d{4}/g,
            /\d{4}-\d{2}-\d{2}/g
        ];
        
        console.log('\n📅 PADRÕES DE DATA ENCONTRADOS:');
        datePatterns.forEach((pattern, i) => {
            const matches = pdfData.text.match(pattern) || [];
            if (matches.length > 0) {
                console.log(`   Padrão ${i+1}: ${matches.length} datas encontradas`);
                console.log(`   Exemplos: ${matches.slice(0, 5).join(', ')}`);
            }
        });
        
        // Procurar por linhas que podem conter períodos
        console.log('\n🔍 LINHAS COM POSSÍVEIS PERÍODOS:');
        const lines = pdfData.text.split('\n');
        let foundLines = 0;
        
        lines.forEach((line, i) => {
            const trimmedLine = line.trim();
            if (trimmedLine.length > 20 && 
                (/LTDA|S\.?A\.?|EIRELI|ME|EPP/i.test(trimmedLine) || 
                 /\d{2}\/\d{2}\/\d{4}.*\d{2}\/\d{2}\/\d{4}/.test(trimmedLine))) {
                console.log(`   Linha ${i+1}: ${trimmedLine.substring(0, 100)}...`);
                foundLines++;
                if (foundLines >= 10) return; // Limitar a 10 linhas
            }
        });
        
        if (foundLines === 0) {
            console.log('   ⚠️ Nenhuma linha com padrões de período encontrada');
        }
        
    } catch (error) {
        console.error('❌ ERRO:', error.message);
    }
}

debugPDFText();
