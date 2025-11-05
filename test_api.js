/**
 * 🧪 TESTE DAS APIS - INSS COMPARADOR ENTERPRISE
 * Script para testar todas as rotas da API
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3021';

async function testAPI() {
  console.log('🧪 Iniciando testes da API...\n');

  try {
    // 1. Teste Health Check
    console.log('1️⃣ Testando Health Check...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', health.data.status);
    console.log(`   Versão: ${health.data.version}`);
    console.log(`   Uptime: ${Math.round(health.data.uptime)}s\n`);

    // 2. Teste rota principal
    console.log('2️⃣ Testando rota principal...');
    const home = await axios.get(`${BASE_URL}/`);
    console.log('✅ Página principal carregada\n');

    // 3. Teste rotas de upload
    console.log('3️⃣ Testando rotas de upload...');
    const uploadList = await axios.get(`${BASE_URL}/api/upload`);
    console.log('✅ Rota de upload funcionando:', uploadList.data.message);

    // 4. Teste rotas de comparação
    console.log('4️⃣ Testando rotas de comparação...');
    const comparisons = await axios.get(`${BASE_URL}/api/comparacao`);
    console.log('✅ Lista de comparações:', comparisons.data.success);

    // 5. Teste verificação de uploads
    console.log('5️⃣ Testando verificação de uploads...');
    const checkUploads = await axios.get(`${BASE_URL}/api/comparacao/check-uploads`);
    console.log('✅ Verificação de uploads:', checkUploads.data.success);
    console.log(`   PDFs disponíveis: ${checkUploads.data.pdf_uploads}`);
    console.log(`   Excels disponíveis: ${checkUploads.data.excel_uploads}`);
    console.log(`   Pronto para comparação: ${checkUploads.data.ready_for_comparison}`);

    // 6. Teste auto-start se houver dados
    if (checkUploads.data.ready_for_comparison) {
      console.log('\n6️⃣ Testando auto-start de comparação...');
      const autoStart = await axios.get(`${BASE_URL}/api/comparacao/auto-start`);
      console.log('✅ Auto-start:', autoStart.data.success);
      console.log(`   Mensagem: ${autoStart.data.message}`);
      
      if (autoStart.data.data && autoStart.data.data.comparisonId) {
        console.log(`   ID da comparação: ${autoStart.data.data.comparisonId}`);
        
        // Aguardar um pouco e verificar status
        console.log('\n⏳ Aguardando processamento...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const status = await axios.get(`${BASE_URL}/api/comparacao/${autoStart.data.data.comparisonId}/status`);
        console.log('📊 Status da comparação:', status.data.status);
        console.log('   Mensagem:', status.data.message);
      }
    }

    console.log('\n🎉 Todos os testes passaram! Sistema funcionando corretamente.');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Dados:', error.response.data);
    }
  }
}

// Executar testes
testAPI();
