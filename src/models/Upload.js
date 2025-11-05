const { executeQuery } = require('../../config/database');

class Upload {
  constructor(data) {
    this.id = data.id;
    this.filename = data.filename;
    this.original_name = data.original_name;
    this.type = data.type;
    this.size_bytes = data.size_bytes;
    this.storage_path = data.storage_path;
    this.created_at = data.created_at;
  }

  // Criar novo upload
  static async create(uploadData) {
    const sql = `
      INSERT INTO uploads (filename, original_name, type, size_bytes, storage_path)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const params = [
      uploadData.filename,
      uploadData.original_name,
      uploadData.type,
      uploadData.size_bytes,
      uploadData.storage_path
    ];

    const result = await executeQuery(sql, params);
    return result.insertId;
  }

  // Buscar upload por ID
  static async findById(id) {
    const sql = 'SELECT * FROM uploads WHERE id = ?';
    const rows = await executeQuery(sql, [id]);
    return rows.length > 0 ? new Upload(rows[0]) : null;
  }

  // Buscar uploads por tipo
  static async findByType(type) {
    const sql = 'SELECT * FROM uploads WHERE type = ? ORDER BY created_at DESC';
    const rows = await executeQuery(sql, [type]);
    return rows.map(row => new Upload(row));
  }

  // Buscar todos os uploads
  static async findAll(limit = 50) {
    const sql = 'SELECT * FROM uploads ORDER BY created_at DESC LIMIT ?';
    const rows = await executeQuery(sql, [limit]);
    return rows.map(row => new Upload(row));
  }

  // Deletar upload
  static async delete(id) {
    const sql = 'DELETE FROM uploads WHERE id = ?';
    const result = await executeQuery(sql, [id]);
    return result.affectedRows > 0;
  }

  // Atualizar upload
  async update(updateData) {
    const fields = [];
    const values = [];
    
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(this.id);
    const sql = `UPDATE uploads SET ${fields.join(', ')} WHERE id = ?`;
    
    const result = await executeQuery(sql, values);
    return result.affectedRows > 0;
  }
}

module.exports = Upload;
