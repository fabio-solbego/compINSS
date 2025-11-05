# Documentação do Projeto --- Comparador INSS (versão sem login)

> Versão ajustada da documentação técnica e de usuário para o sistema
> que compara extratos em PDF com planilhas Excel e calcula períodos de
> contribuição (INSS), **sem necessidade de login ou autenticação**.

------------------------------------------------------------------------

## 1. Visão geral

**Objetivo:** construir um sistema local e direto, sem autenticação, que
leia extratos previdenciários em PDF e planilhas Excel contendo períodos
de trabalho, normalize e compare os períodos, detecte divergências, gere
um relatório comparativo e ofereça uma interface web simples para
upload, análise e download dos resultados.

**Entradas:** - `EXTRATO.pdf` --- extrato do INSS. -
`COMPARATIVO PLANILHA TS.xlsx` --- planilha de períodos.

**Saídas:** - Relatório comparativo (JSON / CSV / Excel). - Logs de
processamento e erros.

------------------------------------------------------------------------

## 2. Tecnologias escolhidas

-   **Backend:** Node.js (Express)
-   **PDF:** `pdf-parse`
-   **Excel:** `exceljs`
-   **Banco:** MySQL (sem usuários nem autenticação por login)
-   **Frontend:** HTML, CSS e JavaScript (sem frameworks)
-   **Utilitários:** dayjs, string-similarity, lodash

------------------------------------------------------------------------

## 3. Esquema do Banco de Dados (MySQL) --- versão simplificada

Sistema totalmente local e sem login. Removidos campos e tabelas
relacionadas a usuários.

``` sql
CREATE TABLE uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255),
  type ENUM('pdf','excel') NOT NULL,
  size_bytes BIGINT,
  storage_path VARCHAR(1024),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employment_periods (
  id INT AUTO_INCREMENT PRIMARY KEY,
  upload_id INT NOT NULL,
  source ENUM('pdf','excel') NOT NULL,
  company VARCHAR(500),
  role VARCHAR(255),
  start_date DATE,
  end_date DATE,
  raw_text TEXT,
  normalized JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (upload_id) REFERENCES uploads(id)
);

CREATE TABLE comparisons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  excel_upload_id INT NOT NULL,
  pdf_upload_id INT NOT NULL,
  summary JSON,
  detailed_report_path VARCHAR(1024),
  status ENUM('pending','processing','done','error') DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (excel_upload_id) REFERENCES uploads(id),
  FOREIGN KEY (pdf_upload_id) REFERENCES uploads(id)
);

CREATE TABLE logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  comparison_id INT NULL,
  level ENUM('info','warn','error'),
  message TEXT,
  meta JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comparison_id) REFERENCES comparisons(id)
);
```

------------------------------------------------------------------------

## 4. Fluxo do Sistema

1.  Usuário acessa a página web local.
2.  Faz upload dos dois arquivos (PDF e Excel).
3.  API Node.js recebe, salva localmente e processa.
4.  Os períodos são extraídos, normalizados e comparados.
5.  Relatório gerado é exibido e pode ser baixado.

------------------------------------------------------------------------

## 5. API (Express)

### `POST /api/uploads`

Envia arquivo PDF ou Excel. Retorna `uploadId`.

### `POST /api/comparacao/comparar`

Inicia a comparação entre dois uploads (`excelUploadId`, `pdfUploadId`).

### `GET /api/comparacao/:id/status`

Consulta o andamento.

### `GET /api/comparacao/:id/download`

Baixa relatório comparativo.

### `GET /api/comparacao/:id/logs`

Mostra logs detalhados.

------------------------------------------------------------------------

## 6. Backend (Node.js)

-   Não há autenticação nem controle de usuários.
-   O sistema é pensado para uso local (em escritório ou desktop
    técnico).
-   Todos os arquivos e relatórios ficam armazenados em `uploads/`.

Bibliotecas principais:

``` json
{
  "express": "^4.x",
  "multer": "^1.x",
  "pdf-parse": "^1.x",
  "exceljs": "^4.x",
  "mysql2": "^3.x",
  "dayjs": "^1.x",
  "string-similarity": "^4.x",
  "lodash": "^4.x",
  "winston": "^3.x"
}
```

------------------------------------------------------------------------

## 7. Frontend (HTML/CSS/JS)

Interface simples, local, sem login.

### Estrutura HTML

``` html
<form id="form-upload">
  <label>Extrato PDF<input type="file" name="pdf" accept="application/pdf" required></label>
  <label>Planilha Excel<input type="file" name="excel" accept=".xlsx,.xls" required></label>
  <button type="submit">Comparar</button>
</form>
<div id="status"></div>
<div id="result"></div>
```

------------------------------------------------------------------------

## 8. Conclusão

Sistema **standalone** --- sem autenticação, voltado para uso técnico
interno. Simples de implantar e usar, com persistência apenas dos dados
e relatórios necessários para comparação de períodos de contribuição.
