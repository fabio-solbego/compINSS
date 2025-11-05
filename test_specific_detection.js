/**
 * 🔍 TESTE ESPECÍFICO - Verificar detecção de empresas específicas
 */

const excelINSSProcessor = require('./src/services/excelINSSProcessor');

// Testar detecção de empresas específicas
function testSpecificDetection() {
    console.log('🔍 Testando detecção específica de empresas...\n');
    
    const testCases = [
        'ELEUTERIO FURLANETTO',
        'STEMAC SA GRUPOS GERADORES EM RECUPERACAO JUDICIAL',
        'SINTY SIL INDUSTRIA DO VESTUÁRIO LTDA',
        'ROBERTO CARLOS VIEIRA DA SILVA', // Deve ser rejeitado
        'AUXILIAR', // Deve ser rejeitado
        'GOPE ORIENTACAO PROFISSIONAL EDUCACIONAL LTDA'
    ];
    
    testCases.forEach((testCase, index) => {
        const isCompany = excelINSSProcessor.isRealCompanyName(testCase);
        const isEntrepreneur = excelINSSProcessor.isPossibleIndividualEntrepreneur(testCase);
        
        console.log(`${index + 1}. "${testCase}"`);
        console.log(`   É empresa: ${isCompany ? '✅ SIM' : '❌ NÃO'}`);
        console.log(`   É empresário individual: ${isEntrepreneur ? '✅ SIM' : '❌ NÃO'}`);
        console.log('');
    });
    
    // Testar classificação de células
    console.log('📊 Testando classificação de células...\n');
    
    testCases.forEach((testCase, index) => {
        const cellType = excelINSSProcessor.classifyCell(testCase);
        console.log(`${index + 1}. "${testCase}" → Tipo: ${cellType}`);
    });
}

testSpecificDetection();
