const { executeQuery } = require('../../config/database');

class Comparison {
  constructor(data) {
    this.id = data.id;
    this.excel_upload_id = data.excel_upload_id;
    this.pdf_upload_id = data.pdf_upload_id;
    this.summary = data.summary;
    this.detailed_report_path = data.detailed_report_path;
    this.status = data.status;
    this.error_message = data.error_message;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Criar nova comparação
  static async create(comparisonData) {
    const sql = `
      INSERT INTO comparisons (excel_upload_id, pdf_upload_id, summary, status)
      VALUES (?, ?, ?, ?)
    `;
    
    const params = [
      comparisonData.excel_upload_id,
      comparisonData.pdf_upload_id,
      JSON.stringify(comparisonData.summary || {}),
      comparisonData.status || 'pending'
    ];

    const result = await executeQuery(sql, params);
    return result.insertId;
  }

  // Buscar comparação por ID
  static async findById(id) {
    const sql = 'SELECT * FROM comparisons WHERE id = ?';
    const rows = await executeQuery(sql, [id]);
    
    if (rows.length === 0) return null;
    
    const comparison = new Comparison(rows[0]);
    if (comparison.summary && typeof comparison.summary === 'string') {
      comparison.summary = JSON.parse(comparison.summary);
    }
    return comparison;
  }

  // Buscar comparações por status
  static async findByStatus(status) {
    const sql = 'SELECT * FROM comparisons WHERE status = ? ORDER BY created_at DESC';
    const rows = await executeQuery(sql, [status]);
    return rows.map(row => {
      const comparison = new Comparison(row);
      if (comparison.summary && typeof comparison.summary === 'string') {
        comparison.summary = JSON.parse(comparison.summary);
      }
      return comparison;
    });
  }

  // Buscar todas as comparações
  static async findAll(limit = 50) {
    const sql = 'SELECT * FROM comparisons ORDER BY created_at DESC LIMIT ?';
    const rows = await executeQuery(sql, [limit]);
    return rows.map(row => {
      const comparison = new Comparison(row);
      if (comparison.summary && typeof comparison.summary === 'string') {
        comparison.summary = JSON.parse(comparison.summary);
      }
      return comparison;
    });
  }

  // Buscar comparações com detalhes dos uploads
  static async findWithUploads(id = null) {
    let sql = `
      SELECT 
        c.*,
        e.filename as excel_filename,
        e.original_name as excel_original_name,
        p.filename as pdf_filename,
        p.original_name as pdf_original_name
      FROM comparisons c
      LEFT JOIN uploads e ON c.excel_upload_id = e.id
      LEFT JOIN uploads p ON c.pdf_upload_id = p.id
    `;
    
    let params = [];
    
    if (id) {
      sql += ' WHERE c.id = ?';
      params.push(id);
    } else {
      sql += ' ORDER BY c.created_at DESC LIMIT 50';
    }
    
    const rows = await executeQuery(sql, params);
    return rows.map(row => {
      const comparison = new Comparison(row);
      if (comparison.summary && typeof comparison.summary === 'string') {
        comparison.summary = JSON.parse(comparison.summary);
      }
      
      // Adicionar informações dos uploads
      comparison.excel_info = {
        filename: row.excel_filename,
        original_name: row.excel_original_name
      };
      comparison.pdf_info = {
        filename: row.pdf_filename,
        original_name: row.pdf_original_name
      };
      
      return comparison;
    });
  }

  // Atualizar status da comparação
  async updateStatus(status, errorMessage = null) {
    const sql = `
      UPDATE comparisons 
      SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    const result = await executeQuery(sql, [status, errorMessage, this.id]);
    if (result.affectedRows > 0) {
      this.status = status;
      this.error_message = errorMessage;
    }
    return result.affectedRows > 0;
  }

  // Atualizar summary da comparação
  async updateSummary(summary) {
    const sql = `
      UPDATE comparisons 
      SET summary = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    const result = await executeQuery(sql, [JSON.stringify(summary), this.id]);
    if (result.affectedRows > 0) {
      this.summary = summary;
    }
    return result.affectedRows > 0;
  }

  // Atualizar caminho do relatório
  async updateReportPath(reportPath) {
    const sql = `
      UPDATE comparisons 
      SET detailed_report_path = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    const result = await executeQuery(sql, [reportPath, this.id]);
    if (result.affectedRows > 0) {
      this.detailed_report_path = reportPath;
    }
    return result.affectedRows > 0;
  }

  // Atualizar comparação completa
  async update(updateData) {
    const fields = [];
    const values = [];
    
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        if (key === 'summary') {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(updateData[key]));
        } else {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      }
    });
    
    if (fields.length === 0) return false;
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(this.id);
    
    const sql = `UPDATE comparisons SET ${fields.join(', ')} WHERE id = ?`;
    
    const result = await executeQuery(sql, values);
    return result.affectedRows > 0;
  }

  // Deletar comparação
  static async delete(id) {
    const sql = 'DELETE FROM comparisons WHERE id = ?';
    const result = await executeQuery(sql, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Comparison;
