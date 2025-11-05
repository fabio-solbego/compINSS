const { executeQuery } = require('../../config/database');

class Comparacao {
  constructor(data) {
    this.id = data.id;
    this.upload_pdf_id = data.upload_pdf_id;
    this.upload_excel_id = data.upload_excel_id;
    this.status = data.status;
    this.resultado = data.resultado;
    this.error_message = data.error_message;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Criar nova comparação
  static async create(comparacaoData) {
    const sql = `
      INSERT INTO comparacao (upload_pdf_id, upload_excel_id, status, resultado)
      VALUES (?, ?, ?, ?)
    `;
    
    const params = [
      comparacaoData.upload_pdf_id,
      comparacaoData.upload_excel_id,
      comparacaoData.status || 'pending',
      comparacaoData.resultado ? JSON.stringify(comparacaoData.resultado) : null
    ];

    const result = await executeQuery(sql, params);
    return result.insertId;
  }

  // Buscar comparação por ID
  static async findById(id) {
    const sql = 'SELECT * FROM comparacao WHERE id = ?';
    const rows = await executeQuery(sql, [id]);
    
    if (rows.length === 0) return null;
    
    const comparacao = new Comparacao(rows[0]);
    if (comparacao.resultado && typeof comparacao.resultado === 'string') {
      try {
        comparacao.resultado = JSON.parse(comparacao.resultado);
      } catch (error) {
        console.log('⚠️ [COMPARACAO] Erro ao parsear resultado:', error.message);
      }
    }
    return comparacao;
  }

  // Buscar comparação por upload_id (PDF ou Excel)
  static async findByUploadId(uploadId) {
    const sql = `
      SELECT * FROM comparacao 
      WHERE upload_pdf_id = ? OR upload_excel_id = ? 
      ORDER BY id DESC 
      LIMIT 1
    `;
    const rows = await executeQuery(sql, [uploadId, uploadId]);
    
    if (rows.length === 0) return null;
    
    const comparacao = new Comparacao(rows[0]);
    if (comparacao.resultado && typeof comparacao.resultado === 'string') {
      try {
        comparacao.resultado = JSON.parse(comparacao.resultado);
      } catch (error) {
        console.log('⚠️ [COMPARACAO] Erro ao parsear resultado:', error.message);
      }
    }
    return comparacao;
  }

  // Buscar comparações por status
  static async findByStatus(status) {
    const sql = 'SELECT * FROM comparacao WHERE status = ? ORDER BY created_at DESC';
    const rows = await executeQuery(sql, [status]);
    return rows.map(row => {
      const comparacao = new Comparacao(row);
      if (comparacao.resultado && typeof comparacao.resultado === 'string') {
        try {
          comparacao.resultado = JSON.parse(comparacao.resultado);
        } catch (error) {
          console.log('⚠️ [COMPARACAO] Erro ao parsear resultado:', error.message);
        }
      }
      return comparacao;
    });
  }

  // Buscar todas as comparações
  static async findAll(limit = 50) {
    const sql = 'SELECT * FROM comparacao ORDER BY created_at DESC LIMIT ?';
    const rows = await executeQuery(sql, [limit]);
    return rows.map(row => {
      const comparacao = new Comparacao(row);
      if (comparacao.resultado && typeof comparacao.resultado === 'string') {
        try {
          comparacao.resultado = JSON.parse(comparacao.resultado);
        } catch (error) {
          console.log('⚠️ [COMPARACAO] Erro ao parsear resultado:', error.message);
        }
      }
      return comparacao;
    });
  }

  // Atualizar status da comparação
  async updateStatus(status, errorMessage = null) {
    const sql = `
      UPDATE comparacao 
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

  // Atualizar resultado da comparação
  async updateResultado(resultado) {
    const sql = `
      UPDATE comparacao 
      SET resultado = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    const result = await executeQuery(sql, [JSON.stringify(resultado), this.id]);
    if (result.affectedRows > 0) {
      this.resultado = resultado;
    }
    return result.affectedRows > 0;
  }

  // Atualizar comparação completa
  async update(updateData) {
    const fields = [];
    const values = [];
    
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        if (key === 'resultado') {
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
    
    const sql = `UPDATE comparacao SET ${fields.join(', ')} WHERE id = ?`;
    
    const result = await executeQuery(sql, values);
    return result.affectedRows > 0;
  }

  // Deletar comparação
  static async delete(id) {
    const sql = 'DELETE FROM comparacao WHERE id = ?';
    const result = await executeQuery(sql, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = Comparacao;
