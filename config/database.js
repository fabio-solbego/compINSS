const mysql = require('mysql2/promise');
const winston = require('winston');

// Configuração do banco de dados
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Sem senha conforme especificado
  database: 'inss_b',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Pool de conexões
const pool = mysql.createPool(dbConfig);

// Logger para database
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/database.log' }),
    new winston.transports.Console()
  ]
});

// Função para testar conexão
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    logger.info('Conexão com banco de dados estabelecida com sucesso');
    connection.release();
    return true;
  } catch (error) {
    logger.error('Erro ao conectar com banco de dados:', error.message);
    return false;
  }
}

// Função para executar queries
async function executeQuery(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    logger.error('Erro ao executar query:', { sql, params, error: error.message });
    throw error;
  }
}

// Função para executar transações
async function executeTransaction(queries) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { sql, params } of queries) {
      const [result] = await connection.execute(sql, params);
      results.push(result);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    logger.error('Erro na transação:', error.message);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testConnection,
  executeQuery,
  executeTransaction,
  logger
};
