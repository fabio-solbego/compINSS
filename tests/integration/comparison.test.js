/**
 * 🧪 TESTES DE INTEGRAÇÃO ENTERPRISE - SISTEMA DE COMPARAÇÃO
 * Cobertura completa de testes para o módulo de comparação
 */

const request = require('supertest');
const app = require('../../server');
const { executeQuery } = require('../../config/database');
const path = require('path');
const fs = require('fs');

describe('🧪 Sistema de Comparação - Testes de Integração', () => {
  let authToken;
  let testUserId;
  let pdfUploadId;
  let excelUploadId;
  let comparisonId;

  // ========================================
  // 🔧 Setup e Teardown
  // ========================================
  
  beforeAll(async () => {
    // Limpar dados de teste
    await executeQuery('DELETE FROM comparacao WHERE id > 0');
    await executeQuery('DELETE FROM uploads WHERE id > 0');
    await executeQuery('DELETE FROM employment_periods WHERE id > 0');
    await executeQuery('ALTER TABLE comparacao AUTO_INCREMENT = 1');
    await executeQuery('ALTER TABLE uploads AUTO_INCREMENT = 1');
    
    // Criar usuário de teste
    const testUser = await executeQuery(`
      INSERT INTO users (name, email, password, role) 
      VALUES ('Test User', 'test@inss.com', '$2b$10$hash', 'admin')
    `);
    testUserId = testUser.insertId;
    
    // Obter token de autenticação
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@inss.com',
        password: 'TestPassword123!'
      });
    
    authToken = loginResponse.body.data.accessToken;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await executeQuery('DELETE FROM users WHERE id = ?', [testUserId]);
    await executeQuery('DELETE FROM comparacao WHERE id > 0');
    await executeQuery('DELETE FROM uploads WHERE id > 0');
    await executeQuery('DELETE FROM employment_periods WHERE id > 0');
  });

  // ========================================
  // 📤 Testes de Upload
  // ========================================
  
  describe('📤 Upload de Arquivos', () => {
    test('Deve fazer upload de PDF com sucesso', async () => {
      const testPdfPath = path.join(__dirname, '../fixtures/test-extrato.pdf');
      
      // Criar arquivo de teste se não existir
      if (!fs.existsSync(testPdfPath)) {
        fs.writeFileSync(testPdfPath, 'PDF test content');
      }

      const response = await request(app)
        .post('/api/upload/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('pdf', testPdfPath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.upload_id).toBeDefined();
      expect(response.body.data.original_name).toContain('test-extrato.pdf');
      
      pdfUploadId = response.body.data.upload_id;
    });

    test('Deve fazer upload de Excel com sucesso', async () => {
      const testExcelPath = path.join(__dirname, '../fixtures/test-planilha.xlsx');
      
      // Criar arquivo de teste se não existir
      if (!fs.existsSync(testExcelPath)) {
        fs.writeFileSync(testExcelPath, 'Excel test content');
      }

      const response = await request(app)
        .post('/api/upload/excel')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('excel', testExcelPath)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.upload_id).toBeDefined();
      expect(response.body.data.original_name).toContain('test-planilha.xlsx');
      
      excelUploadId = response.body.data.upload_id;
    });

    test('Deve rejeitar arquivo com tipo inválido', async () => {
      const testTxtPath = path.join(__dirname, '../fixtures/test-invalid.txt');
      fs.writeFileSync(testTxtPath, 'Invalid file content');

      const response = await request(app)
        .post('/api/upload/pdf')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('pdf', testTxtPath)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Tipo de arquivo não permitido');
    });

    test('Deve rejeitar upload sem autenticação', async () => {
      const testPdfPath = path.join(__dirname, '../fixtures/test-extrato.pdf');

      const response = await request(app)
        .post('/api/upload/pdf')
        .attach('pdf', testPdfPath)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('NO_TOKEN');
    });
  });

  // ========================================
  // 🔍 Testes de Comparação
  // ========================================
  
  describe('🔍 Sistema de Comparação', () => {
    beforeAll(async () => {
      // Inserir períodos de teste para simular dados extraídos
      const testPeriods = [
        {
          upload_id: pdfUploadId,
          company: 'EMPRESA TESTE LTDA',
          start_date: '2020-01-01',
          end_date: '2020-12-31',
          duration_days: 365
        },
        {
          upload_id: pdfUploadId,
          company: 'OUTRA EMPRESA SA',
          start_date: '2021-01-01',
          end_date: '2021-06-30',
          duration_days: 180
        }
      ];

      const excelPeriods = [
        {
          upload_id: excelUploadId,
          company: 'EMPRESA TESTE LTDA',
          start_date: '2020-01-01',
          end_date: '2020-12-31',
          duration_days: 365
        },
        {
          upload_id: excelUploadId,
          company: 'EMPRESA DIFERENTE LTDA',
          start_date: '2021-01-01',
          end_date: '2021-06-30',
          duration_days: 180
        }
      ];

      for (const period of testPeriods) {
        await executeQuery(`
          INSERT INTO employment_periods (upload_id, company, start_date, end_date, duration_days)
          VALUES (?, ?, ?, ?, ?)
        `, [period.upload_id, period.company, period.start_date, period.end_date, period.duration_days]);
      }

      for (const period of excelPeriods) {
        await executeQuery(`
          INSERT INTO employment_periods (upload_id, company, start_date, end_date, duration_days)
          VALUES (?, ?, ?, ?, ?)
        `, [period.upload_id, period.company, period.start_date, period.end_date, period.duration_days]);
      }
    });

    test('Deve iniciar comparação com sucesso', async () => {
      const response = await request(app)
        .post('/api/comparacao/comparar')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pdfUploadId: pdfUploadId,
          excelUploadId: excelUploadId
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.comparisonId).toBeDefined();
      expect(response.body.data.status).toBe('pending');
      
      comparisonId = response.body.data.comparisonId;
    });

    test('Deve aguardar conclusão da comparação', async () => {
      // Aguardar processamento (máximo 30 segundos)
      let attempts = 0;
      let status = 'pending';
      
      while (attempts < 30 && status !== 'done' && status !== 'error') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await request(app)
          .get(`/api/comparacao/${comparisonId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        status = statusResponse.body.data?.status || statusResponse.body.status;
        attempts++;
      }

      expect(status).toBe('done');
    }, 35000); // Timeout de 35 segundos

    test('Deve retornar detalhes da comparação', async () => {
      const response = await request(app)
        .get(`/api/comparacao/${comparisonId}/details`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.resultado).toBeDefined();
      
      const resultado = JSON.parse(response.body.data.resultado);
      
      // Validar estrutura do resultado
      expect(resultado.summary).toBeDefined();
      expect(resultado.summary.total_excel_periods).toBe(2);
      expect(resultado.summary.total_pdf_periods).toBe(2);
      expect(resultado.summary.matched_periods).toBeGreaterThan(0);
      expect(resultado.summary.match_rate).toBeDefined();
      expect(resultado.summary.quality_score).toBeDefined();
      
      // Validar resultados detalhados
      expect(resultado.detailed_results).toBeDefined();
      expect(resultado.detailed_results.matches).toBeDefined();
      expect(resultado.detailed_results.excel_only).toBeDefined();
      expect(resultado.detailed_results.pdf_only).toBeDefined();
    });

    test('Deve listar todas as comparações', async () => {
      const response = await request(app)
        .get('/api/comparacao/all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('status');
      expect(response.body.data[0]).toHaveProperty('pdf_name');
      expect(response.body.data[0]).toHaveProperty('excel_name');
    });

    test('Deve deletar comparação específica', async () => {
      const response = await request(app)
        .delete(`/api/comparacao/${comparisonId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted_id).toBe(comparisonId);
    });
  });

  // ========================================
  // 🗑️ Testes de Limpeza
  // ========================================
  
  describe('🗑️ Limpeza de Histórico', () => {
    beforeAll(async () => {
      // Criar algumas comparações de teste
      for (let i = 0; i < 3; i++) {
        await executeQuery(`
          INSERT INTO comparacao (upload_pdf_id, upload_excel_id, status, created_at)
          VALUES (?, ?, 'done', NOW())
        `, [pdfUploadId, excelUploadId]);
      }
    });

    test('Deve limpar todo o histórico', async () => {
      const response = await request(app)
        .delete('/api/comparacao/clear-history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.removed_comparisons).toBeGreaterThan(0);
      expect(response.body.data.timestamp).toBeDefined();
    });

    test('Deve confirmar histórico vazio após limpeza', async () => {
      const response = await request(app)
        .get('/api/comparacao/all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.total).toBe(0);
      expect(response.body.data).toHaveLength(0);
    });
  });

  // ========================================
  // 🔒 Testes de Segurança
  // ========================================
  
  describe('🔒 Segurança e Validação', () => {
    test('Deve aplicar rate limiting', async () => {
      // Fazer muitas requisições rapidamente
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/comparacao/comparar')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              pdfUploadId: pdfUploadId,
              excelUploadId: excelUploadId
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // Pelo menos uma deve ser bloqueada por rate limiting
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('Deve validar parâmetros de entrada', async () => {
      const response = await request(app)
        .post('/api/comparacao/comparar')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pdfUploadId: 'invalid',
          excelUploadId: null
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('inválido');
    });

    test('Deve rejeitar acesso sem autorização adequada', async () => {
      // Criar token com role limitada
      const limitedUser = await executeQuery(`
        INSERT INTO users (name, email, password, role) 
        VALUES ('Limited User', 'limited@inss.com', '$2b$10$hash', 'user')
      `);

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'limited@inss.com',
          password: 'TestPassword123!'
        });

      const limitedToken = loginResponse.body.data.accessToken;

      const response = await request(app)
        .delete('/api/comparacao/clear-history')
        .set('Authorization', `Bearer ${limitedToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Permissão insuficiente');

      // Limpar usuário de teste
      await executeQuery('DELETE FROM users WHERE id = ?', [limitedUser.insertId]);
    });
  });

  // ========================================
  // 📊 Testes de Performance
  // ========================================
  
  describe('📊 Performance e Escalabilidade', () => {
    test('Deve processar comparação em tempo aceitável', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .post('/api/comparacao/comparar')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pdfUploadId: pdfUploadId,
          excelUploadId: excelUploadId
        });

      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // Menos de 5 segundos para iniciar
    });

    test('Deve lidar com múltiplas comparações simultâneas', async () => {
      const promises = [];
      
      for (let i = 0; i < 3; i++) {
        promises.push(
          request(app)
            .post('/api/comparacao/comparar')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              pdfUploadId: pdfUploadId,
              excelUploadId: excelUploadId
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // Todas devem ser aceitas (mesmo que processadas sequencialmente)
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  // ========================================
  // 🔍 Testes de Algoritmo de Comparação
  // ========================================
  
  describe('🔍 Algoritmo de Comparação', () => {
    test('Deve identificar matches exatos', async () => {
      // Inserir períodos idênticos
      await executeQuery(`
        INSERT INTO employment_periods (upload_id, company, start_date, end_date, duration_days)
        VALUES (?, 'EMPRESA IDENTICA LTDA', '2022-01-01', '2022-12-31', 365)
      `, [pdfUploadId]);

      await executeQuery(`
        INSERT INTO employment_periods (upload_id, company, start_date, end_date, duration_days)
        VALUES (?, 'EMPRESA IDENTICA LTDA', '2022-01-01', '2022-12-31', 365)
      `, [excelUploadId]);

      const comparisonResponse = await request(app)
        .post('/api/comparacao/comparar')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pdfUploadId: pdfUploadId,
          excelUploadId: excelUploadId
        });

      const newComparisonId = comparisonResponse.body.data.comparisonId;

      // Aguardar processamento
      let attempts = 0;
      let status = 'pending';
      
      while (attempts < 20 && status !== 'done' && status !== 'error') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await request(app)
          .get(`/api/comparacao/${newComparisonId}/status`)
          .set('Authorization', `Bearer ${authToken}`);
        
        status = statusResponse.body.data?.status || statusResponse.body.status;
        attempts++;
      }

      const detailsResponse = await request(app)
        .get(`/api/comparacao/${newComparisonId}/details`)
        .set('Authorization', `Bearer ${authToken}`);

      const resultado = JSON.parse(detailsResponse.body.data.resultado);
      
      // Deve ter pelo menos um match exato
      const exactMatches = resultado.detailed_results.matches.filter(m => m.is_exact_match);
      expect(exactMatches.length).toBeGreaterThan(0);
    }, 25000);

    test('Deve detectar diferenças específicas', async () => {
      // Inserir períodos com diferenças conhecidas
      await executeQuery(`
        INSERT INTO employment_periods (upload_id, company, start_date, end_date, duration_days)
        VALUES (?, 'EMPRESA COM DIFERENCA LTDA', '2023-01-01', '2023-06-30', 180)
      `, [pdfUploadId]);

      await executeQuery(`
        INSERT INTO employment_periods (upload_id, company, start_date, end_date, duration_days)
        VALUES (?, 'EMPRESA COM DIFERENCA SA', '2023-01-01', '2023-07-31', 211)
      `, [excelUploadId]);

      const comparisonResponse = await request(app)
        .post('/api/comparacao/comparar')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          pdfUploadId: pdfUploadId,
          excelUploadId: excelUploadId
        });

      const newComparisonId = comparisonResponse.body.data.comparisonId;

      // Aguardar processamento
      let attempts = 0;
      let status = 'pending';
      
      while (attempts < 20 && status !== 'done' && status !== 'error') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await request(app)
          .get(`/api/comparacao/${newComparisonId}/status`)
          .set('Authorization', `Bearer ${authToken}`);
        
        status = statusResponse.body.data?.status || statusResponse.body.status;
        attempts++;
      }

      const detailsResponse = await request(app)
        .get(`/api/comparacao/${newComparisonId}/details`)
        .set('Authorization', `Bearer ${authToken}`);

      const resultado = JSON.parse(detailsResponse.body.data.resultado);
      
      // Deve detectar diferenças
      const matchesWithDifferences = resultado.detailed_results.matches.filter(m => 
        m.differences && m.differences.length > 0
      );
      
      expect(matchesWithDifferences.length).toBeGreaterThan(0);
      
      // Verificar tipos de diferenças detectadas
      const allDifferences = matchesWithDifferences.flatMap(m => m.differences);
      const differenceTypes = allDifferences.map(d => d.type);
      
      expect(differenceTypes).toContain('company_name');
      expect(differenceTypes).toContain('end_date');
      expect(differenceTypes).toContain('duration');
    }, 25000);
  });
});

// ========================================
// 🛠️ Utilitários de Teste
// ========================================

/**
 * Aguardar conclusão de comparação
 */
async function waitForComparison(comparisonId, authToken, maxAttempts = 30) {
  let attempts = 0;
  let status = 'pending';
  
  while (attempts < maxAttempts && status !== 'done' && status !== 'error') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const statusResponse = await request(app)
      .get(`/api/comparacao/${comparisonId}/status`)
      .set('Authorization', `Bearer ${authToken}`);
    
    status = statusResponse.body.data?.status || statusResponse.body.status;
    attempts++;
  }
  
  return status;
}

/**
 * Criar dados de teste
 */
async function createTestData(pdfUploadId, excelUploadId) {
  const testPeriods = [
    {
      upload_id: pdfUploadId,
      company: 'EMPRESA TESTE A LTDA',
      start_date: '2020-01-01',
      end_date: '2020-12-31',
      duration_days: 365
    },
    {
      upload_id: excelUploadId,
      company: 'EMPRESA TESTE A LTDA',
      start_date: '2020-01-01',
      end_date: '2020-12-31',
      duration_days: 365
    }
  ];

  for (const period of testPeriods) {
    await executeQuery(`
      INSERT INTO employment_periods (upload_id, company, start_date, end_date, duration_days)
      VALUES (?, ?, ?, ?, ?)
    `, [period.upload_id, period.company, period.start_date, period.end_date, period.duration_days]);
  }
}
