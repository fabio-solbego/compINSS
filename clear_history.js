const mysql = require('mysql2/promise');

async function clearHistory() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'inss_b'
    });

    console.log('🗑️ Limpando histórico...');
    
    await connection.execute('DELETE FROM comparacao');
    await connection.execute('DELETE FROM employment_periods');
    await connection.execute('DELETE FROM uploads');
    await connection.execute('ALTER TABLE comparacao AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE employment_periods AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE uploads AUTO_INCREMENT = 1');
    
    console.log('✅ Histórico limpo com sucesso!');
    
    await connection.end();
  } catch (error) {
    console.error('❌ Erro ao limpar histórico:', error);
  }
}

clearHistory();
