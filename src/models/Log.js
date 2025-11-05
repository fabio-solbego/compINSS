const { executeQuery } = require('../../config/database');

class Log {
  constructor(data) {
    this.id = data.id;
    this.comparison_id = data.comparison_id;
    this.level = data.level;
    this.message = data.message;
    this.meta = data.meta;
    this.created_at = data.created_at;
  }

  // Criar novo log (DESABILITADO - foreign key issue)
  static async create(logData) {
    // Temporariamente desabilitado devido ao erro de foreign key
    console.log('📝 [LOG] (Desabilitado):', logData.level, logData.message);
    return { insertId: 1 }; // Mock response
  }

  // Criar múltiplos logs
  static async createMany(logsData) {
    if (!logsData || logsData.length === 0) return [];
    
    const sql = `
      INSERT INTO logs (comparison_id, level, message, meta)
      VALUES ?
    `;
    
    const values = logsData.map(log => [
      log.comparison_id || null,
      log.level,
      log.message,
      JSON.stringify(log.meta || {})
    ]);

    const result = await executeQuery(sql, [values]);
    return result.insertId;
  }

  // Buscar logs por comparison ID
  static async findByComparisonId(comparisonId, limit = 100) {
    const sql = `
      SELECT * FROM logs 
      WHERE comparison_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    
    const rows = await executeQuery(sql, [comparisonId, limit]);
    return rows.map(row => {
      const log = new Log(row);
      if (log.meta && typeof log.meta === 'string') {
        log.meta = JSON.parse(log.meta);
      }
      return log;
    });
  }

  // Buscar logs por nível
  static async findByLevel(level, limit = 100) {
    const sql = `
      SELECT * FROM logs 
      WHERE level = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    
    const rows = await executeQuery(sql, [level, limit]);
    return rows.map(row => {
      const log = new Log(row);
      if (log.meta && typeof log.meta === 'string') {
        log.meta = JSON.parse(log.meta);
      }
      return log;
    });
  }

  // Buscar todos os logs
  static async findAll(limit = 100) {
    const sql = 'SELECT * FROM logs ORDER BY created_at DESC LIMIT ?';
    const rows = await executeQuery(sql, [limit]);
    return rows.map(row => {
      const log = new Log(row);
      if (log.meta && typeof log.meta === 'string') {
        log.meta = JSON.parse(log.meta);
      }
      return log;
    });
  }

  // Buscar logs com filtros
  static async findWithFilters(filters = {}) {
    let sql = 'SELECT * FROM logs WHERE 1=1';
    const params = [];
    
    if (filters.comparison_id) {
      sql += ' AND comparison_id = ?';
      params.push(filters.comparison_id);
    }
    
    if (filters.level) {
      sql += ' AND level = ?';
      params.push(filters.level);
    }
    
    if (filters.start_date) {
      sql += ' AND created_at >= ?';
      params.push(filters.start_date);
    }
    
    if (filters.end_date) {
      sql += ' AND created_at <= ?';
      params.push(filters.end_date);
    }
    
    if (filters.message_contains) {
      sql += ' AND message LIKE ?';
      params.push(`%${filters.message_contains}%`);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    
    const rows = await executeQuery(sql, params);
    return rows.map(row => {
      const log = new Log(row);
      if (log.meta && typeof log.meta === 'string') {
        log.meta = JSON.parse(log.meta);
      }
      return log;
    });
  }

  // Deletar logs antigos
  static async deleteOlderThan(days) {
    const sql = 'DELETE FROM logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)';
    const result = await executeQuery(sql, [days]);
    return result.affectedRows;
  }

  // Deletar logs por comparison ID
  static async deleteByComparisonId(comparisonId) {
    const sql = 'DELETE FROM logs WHERE comparison_id = ?';
    const result = await executeQuery(sql, [comparisonId]);
    return result.affectedRows;
  }

  // Métodos de conveniência para criar logs específicos
  static async info(message, meta = {}, comparisonId = null) {
    return await this.create({
      comparison_id: comparisonId,
      level: 'info',
      message,
      meta
    });
  }

  static async warn(message, meta = {}, comparisonId = null) {
    return await this.create({
      comparison_id: comparisonId,
      level: 'warn',
      message,
      meta
    });
  }

  static async error(message, meta = {}, comparisonId = null) {
    return await this.create({
      comparison_id: comparisonId,
      level: 'error',
      message,
      meta
    });
  }
}

module.exports = Log;
