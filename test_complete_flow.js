/**
 * 🧪 TESTE COMPLETO DO FLUXO - INSS COMPARADOR ENTERPRISE
 * Teste end-to-end do sistema completo
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3021';

async function testCompleteFlow() {
  console.log('🚀 Iniciando teste completo do fluxo...\n');

  try {
    // 1. Verificar se há arquivos de exemplo na pasta uploads
    console.log('1️⃣ Verificando arquivos disponíveis...');
    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('⚠️ Pasta uploads não encontrada. Criando...');
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const files = fs.readdirSync(uploadsDir);
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
    const excelFiles = files.filter(f => f.toLowerCase().endsWith('.xlsx') || f.toLowerCase().endsWith('.xls'));

    console.log(`📁 Arquivos encontrados: ${pdfFiles.length} PDFs, ${excelFiles.length} Excels`);

    if (pdfFiles.length === 0 || excelFiles.length === 0) {
      console.log('⚠️ Não há arquivos suficientes para teste. Criando arquivos de exemplo...');
      
      // Criar arquivo Excel de exemplo
      const excelContent = `Empresa,Cargo,Data Início,Data Fim
EMPRESA TESTE LTDA,Analista,01/01/2020,31/12/2020
OUTRA EMPRESA SA,Desenvolvedor,01/01/2021,31/12/2021`;
      
      fs.writeFileSync(path.join(uploadsDir, 'exemplo.csv'), excelContent);
      console.log('📄 Arquivo Excel de exemplo criado (CSV)');
      
      console.log('⚠️ Para teste completo, adicione arquivos PDF e Excel reais na pasta uploads/');
      return;
    }

    // 2. Fazer upload do primeiro PDF encontrado
    console.log('\n2️⃣ Fazendo upload do PDF...');
    const pdfPath = path.join(uploadsDir, pdfFiles[0]);
    const pdfFormData = new FormData();
    pdfFormData.append('file', fs.createReadStream(pdfPath));

    const pdfUpload = await axios.post(`${BASE_URL}/api/upload`, pdfFormData, {
      headers: {
        ...pdfFormData.getHeaders()
      }
    });

    console.log('✅ PDF enviado:', pdfUpload.data.data.fileName);
    console.log(`   Upload ID: ${pdfUpload.data.data.uploadId}`);
    console.log(`   Períodos extraídos: ${pdfUpload.data.data.periods}`);

    // 3. Fazer upload do primeiro Excel encontrado
    console.log('\n3️⃣ Fazendo upload do Excel...');
    const excelPath = path.join(uploadsDir, excelFiles[0]);
    const excelFormData = new FormData();
    excelFormData.append('file', fs.createReadStream(excelPath));

    const excelUpload = await axios.post(`${BASE_URL}/api/upload`, excelFormData, {
      headers: {
        ...excelFormData.getHeaders()
      }
    });

    console.log('✅ Excel enviado:', excelUpload.data.data.fileName);
    console.log(`   Upload ID: ${excelUpload.data.data.uploadId}`);
    console.log(`   Períodos extraídos: ${excelUpload.data.data.periods}`);

    // 4. Aguardar processamento dos arquivos
    console.log('\n4️⃣ Aguardando processamento dos arquivos...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 5. Verificar se os uploads estão prontos
    console.log('\n5️⃣ Verificando se uploads estão prontos...');
    const checkUploads = await axios.get(`${BASE_URL}/api/comparacao/check-uploads`);
    console.log('📊 Status dos uploads:', {
      pdfUploads: checkUploads.data.pdf_uploads,
      excelUploads: checkUploads.data.excel_uploads,
      readyForComparison: checkUploads.data.ready_for_comparison
    });

    if (!checkUploads.data.ready_for_comparison) {
      console.log('⚠️ Uploads não estão prontos para comparação ainda');
      return;
    }

    // 6. Iniciar comparação
    console.log('\n6️⃣ Iniciando comparação...');
    const comparison = await axios.post(`${BASE_URL}/api/comparacao/comparar`, {
      excelUploadId: excelUpload.data.data.uploadId,
      pdfUploadId: pdfUpload.data.data.uploadId
    });

    console.log('✅ Comparação iniciada:', comparison.data.data.comparisonId);

    // 7. Monitorar progresso da comparação
    console.log('\n7️⃣ Monitorando progresso da comparação...');
    let status = 'pending';
    let attempts = 0;
    const maxAttempts = 30; // 30 segundos máximo

    while (status === 'pending' || status === 'processing') {
      if (attempts >= maxAttempts) {
        console.log('⏰ Timeout - comparação está demorando muito');
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await axios.get(`${BASE_URL}/api/comparacao/${comparison.data.data.comparisonId}/status`);
      status = statusResponse.data.status;
      
      console.log(`   Status: ${status} (tentativa ${attempts + 1}/${maxAttempts})`);
      attempts++;
    }

    // 8. Verificar resultado final
    console.log('\n8️⃣ Verificando resultado final...');
    const finalStatus = await axios.get(`${BASE_URL}/api/comparacao/${comparison.data.data.comparisonId}/status`);
    
    console.log('📊 Status final:', finalStatus.data.status);
    console.log('📝 Mensagem:', finalStatus.data.message);

    if (finalStatus.data.status === 'done' && finalStatus.data.resultado) {
      const resultado = finalStatus.data.resultado;
      console.log('\n🎉 RESULTADO DA COMPARAÇÃO:');
      console.log(`   📋 Períodos Excel: ${resultado.summary.total_excel_periods}`);
      console.log(`   📄 Períodos PDF: ${resultado.summary.total_pdf_periods}`);
      console.log(`   🔗 Matches encontrados: ${resultado.summary.matched_periods}`);
      console.log(`   📊 Taxa de correspondência: ${resultado.summary.match_rate.toFixed(1)}%`);
      console.log(`   ⚡ Score de qualidade: ${resultado.summary.quality_score.toFixed(1)}%`);
      console.log(`   ⚠️ Conflitos: ${resultado.summary.conflicts_count}`);
      console.log(`   📅 Diferença de dias: ${resultado.summary.days_difference}`);
    } else if (finalStatus.data.status === 'error') {
      console.log('❌ Erro na comparação:', finalStatus.data.message);
    }

    console.log('\n🎉 Teste completo do fluxo finalizado com sucesso!');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Dados:', error.response.data);
    }
  }
}

// Executar teste
testCompleteFlow();
