/**
 * 🏢 SETUP DO BANCO DE DADOS - INSS COMPARADOR ENTERPRISE
 * Script para criar e verificar estrutura do banco de dados
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'inss_b'
};

async function setupDatabase() {
  let connection;
  
  try {
    console.log('🔌 Conectando ao MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado ao banco de dados inss_b');

    // Verificar e criar tabela uploads
    console.log('📋 Verificando tabela uploads...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS uploads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        type ENUM('pdf', 'excel') NOT NULL,
        size_bytes INT NOT NULL,
        storage_path TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela uploads verificada/criada');

    // Verificar e criar tabela employment_periods
    console.log('📋 Verificando tabela employment_periods...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS employment_periods (
        id INT AUTO_INCREMENT PRIMARY KEY,
        upload_id INT NOT NULL,
        company_name VARCHAR(500),
        role VARCHAR(255),
        start_date DATE,
        end_date DATE,
        raw_text TEXT,
        source_type ENUM('pdf', 'excel') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (upload_id) REFERENCES uploads(id) ON DELETE CASCADE,
        INDEX idx_upload_id (upload_id),
        INDEX idx_dates (start_date, end_date),
        INDEX idx_company (company_name)
      )
    `);
    console.log('✅ Tabela employment_periods verificada/criada');

    // Verificar e criar tabela comparacao
    console.log('📋 Verificando tabela comparacao...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS comparacao (
        id INT AUTO_INCREMENT PRIMARY KEY,
        upload_excel_id INT NOT NULL,
        upload_pdf_id INT NOT NULL,
        status ENUM('pending', 'processing', 'done', 'error') DEFAULT 'pending',
        resultado LONGTEXT,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (upload_excel_id) REFERENCES uploads(id) ON DELETE CASCADE,
        FOREIGN KEY (upload_pdf_id) REFERENCES uploads(id) ON DELETE CASCADE,
        INDEX idx_status (status),
        INDEX idx_created (created_at)
      )
    `);
    console.log('✅ Tabela comparacao verificada/criada');

    // Verificar e criar tabela logs
    console.log('📋 Verificando tabela logs...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        comparison_id INT,
        level ENUM('info', 'warning', 'error') NOT NULL,
        message TEXT NOT NULL,
        details JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (comparison_id) REFERENCES comparacao(id) ON DELETE CASCADE,
        INDEX idx_comparison (comparison_id),
        INDEX idx_level (level),
        INDEX idx_created (created_at)
      )
    `);
    console.log('✅ Tabela logs verificada/criada');

    // Verificar dados existentes
    const [uploads] = await connection.execute('SELECT COUNT(*) as count FROM uploads');
    const [periods] = await connection.execute('SELECT COUNT(*) as count FROM employment_periods');
    const [comparisons] = await connection.execute('SELECT COUNT(*) as count FROM comparacao');
    
    console.log('\n📊 ESTATÍSTICAS DO BANCO:');
    console.log(`📁 Uploads: ${uploads[0].count}`);
    console.log(`📋 Períodos: ${periods[0].count}`);
    console.log(`🔍 Comparações: ${comparisons[0].count}`);

    console.log('\n🎉 Banco de dados configurado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao configurar banco de dados:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Executar setup
setupDatabase();
