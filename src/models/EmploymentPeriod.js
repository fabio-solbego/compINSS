const { executeQuery } = require('../../config/database');

class EmploymentPeriod {
  constructor(data) {
    this.id = data.id;
    this.upload_id = data.upload_id;
    this.source = data.source;
    this.company = data.company;
    this.role = data.role;
    this.start_date = data.start_date;
    this.end_date = data.end_date;
    this.raw_text = data.raw_text;
    this.normalized = data.normalized;
    this.created_at = data.created_at;
  }

  // Criar novo período de emprego
  static async create(periodData) {
    const sql = `
      INSERT INTO employment_periods 
      (upload_id, source, company, role, start_date, end_date, raw_text, normalized)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      periodData.upload_id,
      periodData.source,
      periodData.company,
      periodData.role,
      periodData.start_date,
      periodData.end_date,
      periodData.raw_text,
      JSON.stringify(periodData.normalized)
    ];

    const result = await executeQuery(sql, params);
    return result.insertId;
  }

  // Criar múltiplos períodos
  static async createMany(periodsData) {
    if (!periodsData || periodsData.length === 0) return [];
    
    // Criar placeholders para cada período
    const placeholders = periodsData.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    
    const sql = `
      INSERT INTO employment_periods 
      (upload_id, source, company, role, start_date, end_date, raw_text, normalized)
      VALUES ${placeholders}
    `;
    
    // Flatten dos valores
    const values = [];
    periodsData.forEach(period => {
      values.push(
        period.upload_id,
        period.source,
        period.company,
        period.role,
        period.start_date,
        period.end_date,
        period.raw_text,
        JSON.stringify(period.normalized)
      );
    });

    const result = await executeQuery(sql, values);
    return result.insertId;
  }

  // Buscar períodos por upload ID
  static async findByUploadId(uploadId) {
    const sql = 'SELECT * FROM employment_periods WHERE upload_id = ? ORDER BY start_date';
    const rows = await executeQuery(sql, [uploadId]);
    return rows.map(row => {
      const period = new EmploymentPeriod(row);
      if (period.normalized && typeof period.normalized === 'string') {
        period.normalized = JSON.parse(period.normalized);
      }
      return period;
    });
  }

  // Buscar períodos por fonte (pdf ou excel)
  static async findBySource(source, uploadId = null) {
    let sql = 'SELECT * FROM employment_periods WHERE source = ?';
    let params = [source];
    
    if (uploadId) {
      sql += ' AND upload_id = ?';
      params.push(uploadId);
    }
    
    sql += ' ORDER BY start_date';
    
    const rows = await executeQuery(sql, params);
    return rows.map(row => {
      const period = new EmploymentPeriod(row);
      if (period.normalized && typeof period.normalized === 'string') {
        period.normalized = JSON.parse(period.normalized);
      }
      return period;
    });
  }

  // Buscar período por ID
  static async findById(id) {
    const sql = 'SELECT * FROM employment_periods WHERE id = ?';
    const rows = await executeQuery(sql, [id]);
    
    if (rows.length === 0) return null;
    
    const period = new EmploymentPeriod(rows[0]);
    if (period.normalized && typeof period.normalized === 'string') {
      period.normalized = JSON.parse(period.normalized);
    }
    return period;
  }

  // Deletar períodos por upload ID
  static async deleteByUploadId(uploadId) {
    const sql = 'DELETE FROM employment_periods WHERE upload_id = ?';
    const result = await executeQuery(sql, [uploadId]);
    return result.affectedRows;
  }

  // Buscar períodos com sobreposição de datas
  static async findOverlapping(startDate, endDate, excludeId = null) {
    let sql = `
      SELECT * FROM employment_periods 
      WHERE (start_date <= ? AND end_date >= ?) 
         OR (start_date <= ? AND end_date >= ?)
         OR (start_date >= ? AND end_date <= ?)
    `;
    
    let params = [endDate, startDate, startDate, startDate, startDate, endDate];
    
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    
    const rows = await executeQuery(sql, params);
    return rows.map(row => {
      const period = new EmploymentPeriod(row);
      if (period.normalized && typeof period.normalized === 'string') {
        period.normalized = JSON.parse(period.normalized);
      }
      return period;
    });
  }

  // Atualizar período
  async update(updateData) {
    const fields = [];
    const values = [];
    
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        if (key === 'normalized') {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(updateData[key]));
        } else {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      }
    });
    
    if (fields.length === 0) return false;
    
    values.push(this.id);
    const sql = `UPDATE employment_periods SET ${fields.join(', ')} WHERE id = ?`;
    
    const result = await executeQuery(sql, values);
    return result.affectedRows > 0;
  }
}

module.exports = EmploymentPeriod;
