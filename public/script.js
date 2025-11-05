// Estado da aplicação
let currentComparison = null;
let uploadedFiles = {
    pdf: null,
    excel: null
};

// Sistema de notificações modernas
class NotificationSystem {
    static show(message, type = 'success', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification-modern ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Trigger show animation
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Auto remove
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 300);
        }, duration);
    }
    
    static success(message) {
        this.show(message, 'success');
    }
    
    static error(message) {
        this.show(message, 'error');
    }
    
    static warning(message) {
        this.show(message, 'warning');
    }
}

// Sistema de animações e micro-interações
class AnimationSystem {
    static addBounce(element) {
        element.classList.add('micro-bounce');
        setTimeout(() => element.classList.remove('micro-bounce'), 600);
    }
    
    static addGlow(element) {
        element.classList.add('pulse-glow');
    }
    
    static removeGlow(element) {
        element.classList.remove('pulse-glow');
    }
    
    static enhanceCard(element) {
        element.classList.add('card-enhanced');
    }
    
    static modernizeButton(element) {
        element.classList.add('btn-modern');
    }
}

// Elementos DOM
const API_BASE_URL = 'http://localhost:4000';
const elements = {
    uploadForm: document.getElementById('upload-form'),
    pdfFile: document.getElementById('pdf-file'),
    excelFile: document.getElementById('excel-file'),
    pdfInfo: document.getElementById('pdf-info'),
    excelInfo: document.getElementById('excel-info'),
    compareBtn: document.getElementById('compare-btn'),
    progressSection: document.getElementById('progress-section'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    logsContainer: document.getElementById('logs-container'),
    resultsSection: document.getElementById('results-section'),
    resultsSummary: document.getElementById('results-summary'),
    detailsSection: document.getElementById('details-section'),
    historyContainer: document.getElementById('history-container'),
    loadingOverlay: document.getElementById('loading-overlay'),
    toastContainer: document.getElementById('toast-container')
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Adicionar funções ao escopo global após elas serem definidas
    setTimeout(() => {
        window.viewComparisonDetails = viewComparisonDetails;
        window.deleteComparison = deleteComparison;
        window.clearAllHistory = clearAllHistory;
        window.loadAllComparisons = loadAllComparisons;
    }, 100);
    
    initializeEventListeners();
    loadHistory();
    applyModernEnhancements();
    
    // Iniciar comparação automática se houver uploads
    setTimeout(autoStartComparison, 2000);
    
    // Mostrar notificação de boas-vindas
    setTimeout(() => {
        NotificationSystem.success('🚀 Sistema INSS Comparador 2.0 carregado com melhorias!');
    }, 1000);
});

// Função de diagnóstico
function showDiagnosticHelp() {
    const diagnosticModal = document.createElement('div');
    diagnosticModal.className = 'diagnostic-modal';
    diagnosticModal.innerHTML = `
        <div class="diagnostic-content card-enhanced glass-effect">
            <div class="diagnostic-header">
                <h2><i class="fas fa-stethoscope"></i> Diagnóstico de Arquivos</h2>
                <button onclick="closeDiagnostic()" class="close-btn">&times;</button>
            </div>
            <div class="diagnostic-body">
                <h3>🔍 Problemas Comuns e Soluções</h3>
                
                <div class="diagnostic-section">
                    <h4><i class="fas fa-file-excel"></i> Arquivo Excel Corrompido</h4>
                    <p><strong>Sintomas:</strong> Erro 500, "Can't find central directory"</p>
                    <p><strong>Solução:</strong></p>
                    <ol>
                        <li>Abra o arquivo no Microsoft Excel</li>
                        <li>Vá em <code>Arquivo → Salvar Como</code></li>
                        <li>Escolha formato <code>.xlsx</code></li>
                        <li>Salve com novo nome e tente novamente</li>
                    </ol>
                </div>
                
                <div class="diagnostic-section">
                    <h4><i class="fas fa-search"></i> Nenhum Período Encontrado</h4>
                    <p><strong>Verifique se sua planilha tem:</strong></p>
                    <ul>
                        <li>✅ Empresas com LTDA, S/A, INDÚSTRIA</li>
                        <li>✅ Datas no formato DD/MM/AAAA</li>
                        <li>✅ Dados na primeira aba da planilha</li>
                        <li>✅ Pelo menos 3 colunas preenchidas</li>
                    </ul>
                </div>
                
                <div class="diagnostic-section">
                    <h4><i class="fas fa-table"></i> Estrutura Recomendada</h4>
                    <div class="example-table">
                        <table>
                            <tr><th>Empresa</th><th>Cargo</th><th>Início</th><th>Fim</th></tr>
                            <tr><td>EMPRESA ABC LTDA</td><td>AUXILIAR</td><td>01/01/2020</td><td>31/12/2020</td></tr>
                            <tr><td>INDÚSTRIA XYZ S/A</td><td>OPERADOR</td><td>01/02/2021</td><td>30/06/2021</td></tr>
                        </table>
                    </div>
                </div>
                
                <div class="diagnostic-actions">
                    <button class="btn-modern badge-modern badge-success" onclick="testWithSampleFile()">
                        <i class="fas fa-vial"></i> Testar com Arquivo Exemplo
                    </button>
                    <button class="btn-modern badge-modern badge-warning" onclick="clearUploads()">
                        <i class="fas fa-trash"></i> Limpar Uploads
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(diagnosticModal);
    AnimationSystem.addBounce(diagnosticModal.querySelector('.diagnostic-content'));
}

function closeDiagnostic() {
    const modal = document.querySelector('.diagnostic-modal');
    if (modal) {
        modal.remove();
    }
}

function testWithSampleFile() {
    NotificationSystem.success('📝 Criando arquivo exemplo... (funcionalidade em desenvolvimento)');
    closeDiagnostic();
}

function clearUploads() {
    if (confirm('Tem certeza que deseja limpar todos os uploads?')) {
        // Limpar dados locais
        localStorage.removeItem('uploadedFiles');
        location.reload();
        NotificationSystem.success('🧹 Uploads limpos com sucesso!');
    }
    closeDiagnostic();
}

function scrollToUpload() {
    const uploadSection = document.getElementById('upload-form') || document.querySelector('.upload-section');
    if (uploadSection) {
        uploadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Destacar a seção de upload
        uploadSection.style.animation = 'pulse-glow 2s ease-in-out 3';
        
        // Mostrar notificação
        NotificationSystem.success('📄 Faça upload do extrato PDF do INSS para comparar com os períodos do Excel');
        
        // Focar no input de PDF se existir
        setTimeout(() => {
            const pdfInput = document.getElementById('pdf-file');
            if (pdfInput) {
                pdfInput.focus();
                AnimationSystem.addGlow(pdfInput.closest('.upload-area'));
            }
        }, 1000);
    }
}

// Calcular tempo total em anos, meses e dias
function calculateTotalTime(totalDays) {
    if (!totalDays || totalDays <= 0) return "0 dias";
    
    const years = Math.floor(totalDays / 365);
    const remainingDaysAfterYears = totalDays % 365;
    const months = Math.floor(remainingDaysAfterYears / 30);
    const days = remainingDaysAfterYears % 30;
    
    let result = [];
    
    if (years > 0) {
        result.push(`${years} ano${years > 1 ? 's' : ''}`);
    }
    if (months > 0) {
        result.push(`${months} mês${months > 1 ? 'es' : ''}`);
    }
    if (days > 0) {
        result.push(`${days} dia${days > 1 ? 's' : ''}`);
    }
    
    if (result.length === 0) return "0 dias";
    if (result.length === 1) return result[0];
    if (result.length === 2) return result.join(' e ');
    return result.slice(0, -1).join(', ') + ' e ' + result[result.length - 1];
}

// Mostrar status atual dos uploads
function showCurrentStatus() {
    const extractedSection = document.getElementById('extracted-data-section');
    if (!extractedSection) return;
    
    // Verificar se há dados extraídos
    const pdfData = window.extractedData?.pdf || [];
    const excelData = window.extractedData?.excel || [];
    
    if (pdfData.length === 0 && excelData.length === 0) {
        return; // Não mostrar nada se não há dados
    }
    
    // Criar indicador de status
    let statusHtml = '<div class="current-status-indicator">';
    
    if (excelData.length > 0 && pdfData.length === 0) {
        statusHtml += `
            <div class="incomplete-data-notice">
                <h4>📊 Dados Parciais Carregados</h4>
                <p><strong>${excelData.length} períodos</strong> encontrados na planilha Excel</p>
                <p>Faça upload do <strong>extrato PDF do INSS</strong> para fazer a comparação completa</p>
            </div>
        `;
    } else if (pdfData.length > 0 && excelData.length === 0) {
        statusHtml += `
            <div class="incomplete-data-notice">
                <h4>📄 Dados Parciais Carregados</h4>
                <p><strong>${pdfData.length} períodos</strong> encontrados no extrato PDF</p>
                <p>Faça upload da <strong>planilha Excel</strong> para fazer a comparação completa</p>
            </div>
        `;
    }
    
    statusHtml += '</div>';
    
    // Inserir antes da seção de dados extraídos
    const existingStatus = document.querySelector('.current-status-indicator');
    if (existingStatus) {
        existingStatus.remove();
    }
    
    extractedSection.insertAdjacentHTML('beforebegin', statusHtml);
}

// Aplicar melhorias modernas aos elementos
function applyModernEnhancements() {
    // Modernizar botões
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-success');
    buttons.forEach(btn => AnimationSystem.modernizeButton(btn));
    
    // Melhorar cards
    const cards = document.querySelectorAll('.card, .upload-area, .results-card');
    cards.forEach(card => AnimationSystem.enhanceCard(card));
    
    // Adicionar tooltips modernos
    const tooltipElements = document.querySelectorAll('[title]');
    tooltipElements.forEach(el => {
        const title = el.getAttribute('title');
        el.removeAttribute('title');
        el.classList.add('tooltip-modern');
        el.setAttribute('data-tooltip', title);
    });
    
    // Modernizar barras de progresso
    const progressBars = document.querySelectorAll('.progress');
    progressBars.forEach(bar => bar.classList.add('progress-modern'));
    
    console.log('✅ Melhorias modernas aplicadas aos elementos da interface');
}

// Event Listeners
function initializeEventListeners() {
    // Upload form
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleFormSubmit);
    }
    
    // File inputs
    const pdfFile = document.getElementById('pdf-file');
    const excelFile = document.getElementById('excel-file');
    
    if (pdfFile) {
        pdfFile.addEventListener('change', (e) => handleFileSelect(e, 'pdf'));
    }
    if (excelFile) {
        excelFile.addEventListener('change', (e) => handleFileSelect(e, 'excel'));
    }
    
    // Drag and drop
    setupDragAndDrop('pdf');
    setupDragAndDrop('excel');
    
    // Download buttons
    document.getElementById('download-json')?.addEventListener('click', () => downloadReport('json'));
    document.getElementById('download-csv')?.addEventListener('click', () => downloadReport('csv'));
    document.getElementById('download-excel')?.addEventListener('click', () => downloadReport('excel'));
    
    // View details button
    document.getElementById('view-details')?.addEventListener('click', showDetails);
    
    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });
    
    // Refresh history
    document.getElementById('refresh-history')?.addEventListener('click', loadHistory);
    
    // Delegação de eventos para botões criados dinamicamente
    document.addEventListener('click', function(e) {
        // Botão de ver diferenças
        if (e.target.textContent === 'Ver Diferenças') {
            const comparisonId = e.target.getAttribute('data-comparison-id');
            if (comparisonId) {
                viewComparisonDetails(parseInt(comparisonId));
            }
        }
        
        // Botão de deletar
        if (e.target.textContent.includes('Deletar')) {
            const comparisonId = e.target.getAttribute('data-comparison-id');
            if (comparisonId) {
                deleteComparison(parseInt(comparisonId));
            }
        }
        
        // Botão de limpar histórico
        if (e.target.classList.contains('clear-history-btn')) {
            clearAllHistory();
        }
        
        // Botão de atualizar
        if (e.target.classList.contains('refresh-comparisons-btn')) {
            loadAllComparisons();
        }
    });
    
    // Carregar histórico inicial
    loadHistory();
    
    // Inicializar estado do botão
    updateCompareButton();
}

// Setup drag and drop
function setupDragAndDrop(type) {
    const uploadArea = document.getElementById(`${type}-upload-area`);
    if (!uploadArea) return;
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const fileInput = document.getElementById(`${type}-file`);
            fileInput.files = files;
            
            // Trigger change event
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
        }
    });
}

// Manipulação de arquivos
function handleFileSelect(event, type) {
    const file = event.target.files[0];
    const uploadCard = document.getElementById(`${type}-upload-card`);
    const uploadArea = document.getElementById(`${type}-upload-area`);
    const placeholder = uploadArea.querySelector('.upload-placeholder');
    const successElement = document.getElementById(`${type}-success`);
    
    if (file) {
        // Validar tipo de arquivo
        const validTypes = {
            pdf: ['application/pdf'],
            excel: [
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-excel'
            ]
        };
        
        if (!validTypes[type].includes(file.type)) {
            NotificationSystem.error(`Tipo de arquivo inválido para ${type.toUpperCase()}`);
            event.target.value = '';
            return;
        }
        
        // Validar tamanho (50MB)
        if (file.size > 50 * 1024 * 1024) {
            NotificationSystem.error('Arquivo muito grande. Tamanho máximo: 50MB');
            event.target.value = '';
            return;
        }
        
        // Mostrar arquivo selecionado
        placeholder.style.display = 'none';
        successElement.style.display = 'flex';
        successElement.querySelector('.file-name').textContent = file.name;
        
        // Adicionar classe de sucesso ao card
        uploadCard.classList.add('file-selected');
        
        uploadedFiles[type] = file;
        
        // Verificar se ambos os arquivos foram selecionados
        updateCompareButton();
        
        NotificationSystem.success(`${type.toUpperCase()} selecionado: ${file.name}`);
        
        // Adicionar animação de bounce ao card
        AnimationSystem.addBounce(uploadCard);
    } else {
        // Resetar estado
        placeholder.style.display = 'flex';
        successElement.style.display = 'none';
        uploadCard.classList.remove('file-selected');
        uploadedFiles[type] = null;
        updateCompareButton();
    }
}

// Função para remover arquivo
function removeFile(type) {
    const fileInput = document.getElementById(`${type}-file`);
    const uploadCard = document.getElementById(`${type}-upload-card`);
    const uploadArea = document.getElementById(`${type}-upload-area`);
    const placeholder = uploadArea.querySelector('.upload-placeholder');
    const successElement = document.getElementById(`${type}-success`);
    
    // Resetar input
    fileInput.value = '';
    
    // Resetar UI
    placeholder.style.display = 'flex';
    successElement.style.display = 'none';
    uploadCard.classList.remove('file-selected');
    
    // Resetar estado
    uploadedFiles[type] = null;
    updateCompareButton();
    
    showToast(`${type.toUpperCase()} removido`, 'info');
}

function updateCompareButton() {
    const hasFiles = uploadedFiles.pdf && uploadedFiles.excel;
    const extractBtn = document.getElementById('extract-btn');
    const btnText = extractBtn.querySelector('.btn-text');
    
    if (hasFiles) {
        extractBtn.disabled = false;
        extractBtn.classList.add('ready');
        btnText.innerHTML = '<i class="fas fa-search"></i> Extrair Dados dos Arquivos';
    } else {
        extractBtn.disabled = true;
        extractBtn.classList.remove('ready');
        btnText.innerHTML = '<i class="fas fa-upload"></i> Selecione os arquivos primeiro';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Submissão do formulário - APENAS EXTRAIR DADOS
async function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!uploadedFiles.pdf || !uploadedFiles.excel) {
        showToast('Selecione ambos os arquivos antes de continuar', 'error');
        return;
    }
    
    const extractBtn = document.getElementById('extract-btn');
    const btnText = extractBtn.querySelector('.btn-text');
    const btnLoader = extractBtn.querySelector('.btn-loader');
    
    try {
        // Mostrar loading no botão
        extractBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
        
        showToast('Extraindo dados dos arquivos...', 'info');
        
        // Upload e processamento dos arquivos
        const pdfUploadId = await uploadFile(uploadedFiles.pdf, 'pdf');
        const excelUploadId = await uploadFile(uploadedFiles.excel, 'excel');
        
        // Buscar dados extraídos
        const pdfData = await getExtractedData(pdfUploadId);
        const excelData = await getExtractedData(excelUploadId);
        
        // Mostrar dados extraídos na tela
        displayExtractedData(pdfData, excelData, pdfUploadId, excelUploadId);
        
        // Resetar botão
        btnText.style.display = 'flex';
        btnLoader.style.display = 'none';
        extractBtn.disabled = false;
        
        showToast('Dados extraídos com sucesso!', 'success');
        
        // Scroll para seção de dados extraídos
        document.getElementById('extracted-data-section').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        // Resetar botão em caso de erro
        btnText.style.display = 'flex';
        btnLoader.style.display = 'none';
        extractBtn.disabled = false;
        
        NotificationSystem.error(`Erro: ${error.message}`);
        console.error('Erro na extração:', error);
    }
}

// Upload de arquivo
async function uploadFile(file, type) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
    });
    
    if (!response.ok) {
        let errorMessage = 'Erro no processamento do arquivo';
        try {
            const error = await response.json();
            errorMessage = error.message || errorMessage;
        } catch (parseError) {
            // Se não conseguir fazer parse do JSON, usar mensagem padrão
            if (response.status === 500) {
                errorMessage = 'Erro interno do servidor. Verifique se o arquivo não está corrompido.';
            } else if (response.status === 413) {
                errorMessage = 'Arquivo muito grande. Tamanho máximo permitido: 50MB.';
            } else if (response.status === 415) {
                errorMessage = 'Tipo de arquivo não suportado. Use apenas PDF ou Excel.';
            }
        }
        throw new Error(errorMessage);
    }
    
    const result = await response.json();
    return result.data.uploadId;
}

// Buscar dados extraídos de um upload
async function getExtractedData(uploadId) {
    try {
        console.log('🔍 Buscando dados extraídos para upload:', uploadId);
        
        const response = await fetch(`/api/upload/${uploadId}/periods`);
        
        console.log('📡 Resposta do servidor:', response.status, response.statusText);
        
        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Erro na resposta:', error);
            throw new Error(error.message || 'Erro ao buscar dados extraídos');
        }
        
        const result = await response.json();
        console.log('✅ Dados recebidos:', result);
        console.log('📊 Total de períodos:', result.data?.length || 0);
        
        return result.data;
    } catch (error) {
        console.error('❌ Erro em getExtractedData:', error);
        throw error;
    }
}

// Exibir dados extraídos na tela
function displayExtractedData(pdfData, excelData, pdfUploadId, excelUploadId) {
    console.log('🖥️ Exibindo dados extraídos:', {
        pdfData: pdfData?.length || 0,
        excelData: excelData?.length || 0,
        pdfUploadId,
        excelUploadId
    });
    
    const extractedSection = document.getElementById('extracted-data-section');
    const pdfContainer = document.getElementById('pdf-extracted-data');
    const excelContainer = document.getElementById('excel-extracted-data');
    const comparisonActions = document.getElementById('comparison-actions');
    
    if (!extractedSection || !pdfContainer || !excelContainer) {
        console.error('❌ Elementos DOM não encontrados!');
        return;
    }
    
    // Mostrar seção
    extractedSection.style.display = 'block';
    
    // Exibir dados do PDF
    if (pdfData && pdfData.length > 0) {
        console.log('📄 Criando tabela PDF com', pdfData.length, 'períodos');
        try {
            const tableHtml = createDataTable(pdfData, 'PDF');
            pdfContainer.innerHTML = tableHtml;
            console.log('✅ Tabela PDF inserida no DOM');
        } catch (error) {
            console.error('❌ Erro ao criar tabela PDF:', error);
            pdfContainer.innerHTML = `
                <div class="error-data">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Erro ao exibir dados do PDF</p>
                    <small>Erro: ${error.message}</small>
                </div>
            `;
        }
    } else {
        console.log('⚠️ Nenhum dado PDF para exibir');
        
        // Verificar se há dados do Excel para mostrar mensagem apropriada
        const hasExcelData = excelData && excelData.length > 0;
        
        if (hasExcelData) {
            pdfContainer.innerHTML = `
                <div class="no-data card-enhanced glass-effect">
                    <i class="fas fa-file-pdf" style="color: #ef4444; font-size: 2rem; margin-bottom: 1rem;"></i>
                    <h3>PDF do INSS não carregado</h3>
                    <p>Você tem <strong>${excelData.length} períodos</strong> na planilha Excel.</p>
                    <p>Para fazer a comparação, faça upload do extrato PDF do INSS:</p>
                    <div style="margin: 1.5rem 0;">
                        <button class="btn-modern badge-modern badge-primary" onclick="scrollToUpload()" style="cursor: pointer; border: none; padding: 0.75rem 1.5rem;">
                            <i class="fas fa-upload"></i> Fazer Upload do PDF
                        </button>
                    </div>
                    <div class="badge-modern badge-info tooltip-modern" data-tooltip="Baixe o extrato no site Meu INSS">
                        <i class="fas fa-info-circle"></i> Baixe no Meu INSS
                    </div>
                </div>
            `;
        } else {
            pdfContainer.innerHTML = `
                <div class="no-data card-enhanced glass-effect">
                    <i class="fas fa-exclamation-triangle" style="color: #f59e0b; font-size: 2rem; margin-bottom: 1rem;"></i>
                    <h3>Nenhum período encontrado no PDF</h3>
                    <p>Possíveis causas:</p>
                    <ul style="text-align: left; margin: 1rem 0;">
                        <li>Arquivo não é um extrato válido do INSS</li>
                        <li>PDF está digitalizado (imagem) - use OCR primeiro</li>
                        <li>Formato do PDF não é reconhecido pelo sistema</li>
                        <li>Dados estão em formato não padrão</li>
                    </ul>
                    <div class="badge-modern badge-warning tooltip-modern" data-tooltip="Tente usar um extrato oficial do INSS">
                        <i class="fas fa-lightbulb"></i> Dica: Use extrato oficial do INSS
                    </div>
                </div>
            `;
        }
    }
    
    // Exibir dados do Excel
    if (excelData && excelData.length > 0) {
        excelContainer.innerHTML = createDataTable(excelData, 'Excel');
    } else {
        excelContainer.innerHTML = `
            <div class="no-data card-enhanced glass-effect">
                <i class="fas fa-table" style="color: #10b981; font-size: 2rem; margin-bottom: 1rem;"></i>
                <h3>Nenhum período encontrado na planilha</h3>
                <p>Possíveis causas:</p>
                <ul style="text-align: left; margin: 1rem 0;">
                    <li>Planilha não contém empresas com indicadores (LTDA, S/A, etc.)</li>
                    <li>Datas não estão no formato DD/MM/AAAA</li>
                    <li>Estrutura da planilha não é reconhecida</li>
                    <li>Dados estão em abas diferentes da primeira</li>
                </ul>
                <div class="badge-modern badge-success tooltip-modern" data-tooltip="Estrutura recomendada: Empresa | Cargo | Data Início | Data Fim">
                    <i class="fas fa-info-circle"></i> Estrutura recomendada
                </div>
                <div style="margin-top: 1rem; padding: 1rem; background: rgba(16, 185, 129, 0.1); border-radius: 8px;">
                    <strong>Exemplo de estrutura válida:</strong><br>
                    <code>EMPRESA ABC LTDA | AUXILIAR | 01/01/2020 | 31/12/2020</code>
                </div>
                <button class="btn-modern badge-modern badge-warning" onclick="showDiagnosticHelp()" style="margin-top: 1rem; cursor: pointer; border: none;">
                    <i class="fas fa-stethoscope"></i> Diagnóstico do Arquivo
                </button>
            </div>
        `;
    }
    
    // Mostrar botões de ação se temos dados
    if ((pdfData && pdfData.length > 0) || (excelData && excelData.length > 0)) {
        comparisonActions.style.display = 'flex';
        
        // Armazenar dados para comparação posterior
        window.extractedData = { 
            pdf: pdfData, 
            excel: excelData,
            pdfUploadId: pdfUploadId,
            excelUploadId: excelUploadId
        };
        
        // Configurar event listener do botão de comparação
        const compareBtn = document.getElementById('compare-btn');
        compareBtn.onclick = () => startComparison();
        
        // Configurar event listener do botão de exportação
        const exportBtn = document.getElementById('export-excel-btn');
        exportBtn.onclick = () => exportToExcel();
        
        // Notificar sucesso na extração com detalhes
        const totalPeriods = (pdfData?.length || 0) + (excelData?.length || 0);
        const excelCount = excelData?.length || 0;
        const pdfCount = pdfData?.length || 0;
        
        if (excelCount > 0 && pdfCount > 0) {
            NotificationSystem.success(`✅ ${totalPeriods} períodos extraídos! Excel: ${excelCount}, PDF: ${pdfCount}`);
        } else if (excelCount > 0) {
            NotificationSystem.success(`📊 ${excelCount} períodos extraídos do Excel! Faça upload do PDF para comparar.`);
        } else if (pdfCount > 0) {
            NotificationSystem.success(`📄 ${pdfCount} períodos extraídos do PDF! Faça upload do Excel para comparar.`);
        } else {
            NotificationSystem.success(`✅ ${totalPeriods} períodos extraídos com sucesso!`);
        }
        
        // Mostrar status atual
        setTimeout(() => showCurrentStatus(), 500);
    } else {
        // Ocultar botões de ação se não há dados
        comparisonActions.style.display = 'none';
        
        // Notificar que não há dados para comparar
        NotificationSystem.warning('⚠️ Nenhum período encontrado nos arquivos. Verifique o formato dos documentos.');
    }
}

// Criar tabela de dados
function createDataTable(data, source) {
    console.log('📊 Criando tabela para:', source, 'com', data.length, 'períodos');
    console.log('🔍 Primeiro período:', data[0]);
    
    let html = `
        <div class="data-summary">
            <strong>${data.length} período(s) encontrado(s) no ${source}</strong>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Empresa</th>
                    <th>Cargo</th>
                    <th>Data Início</th>
                    <th>Data Fim</th>
                    <th>Duração</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    data.forEach((period, index) => {
        console.log(`📝 Processando período ${index + 1}:`, period);
        
        // Extrair dados de forma mais robusta
        const company = period.company || period.normalized?.company_normalized || 'Não informado';
        const role = period.role || period.position || period.normalized?.role_normalized || 'Não informado';
        
        // Formatar datas de forma mais robusta
        let startDate = 'Não informado';
        let endDate = 'Não informado';
        
        if (period.start_date) {
            startDate = formatDate(period.start_date);
        } else if (period.normalized?.start_date_parsed) {
            startDate = formatDate(period.normalized.start_date_parsed);
        } else if (period.normalized?.data_inicio_original) {
            startDate = period.normalized.data_inicio_original;
        }
        
        if (period.end_date) {
            endDate = formatDate(period.end_date);
        } else if (period.normalized?.end_date_parsed) {
            endDate = formatDate(period.normalized.end_date_parsed);
        } else if (period.normalized?.data_fim_original) {
            endDate = period.normalized.data_fim_original;
        }
        
        // Calcular duração
        let duration = 'N/A';
        if (period.duration_days) {
            duration = `${period.duration_days} dias`;
        } else if (period.normalized?.duration_days) {
            duration = `${period.normalized.duration_days} dias`;
        } else if (period.start_date && period.end_date) {
            const days = calculateDays(period.start_date, period.end_date);
            duration = `${days} dias`;
        }
        
        html += `
            <tr>
                <td title="${period.raw_text || ''}">${company}</td>
                <td>${role}</td>
                <td>${startDate}</td>
                <td>${endDate}</td>
                <td>${duration}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    console.log('✅ Tabela HTML gerada:', html.length, 'caracteres');
    return html;
}

// Iniciar comparação com dados já extraídos
async function startComparison() {
    if (!window.extractedData) {
        showToast('Dados não encontrados. Extraia os dados primeiro.', 'error');
        return;
    }
    
    const compareBtn = document.getElementById('compare-btn');
    const originalText = compareBtn.innerHTML;
    
    try {
        // Mostrar loading
        compareBtn.disabled = true;
        compareBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Comparando...';
        
        showToast('Iniciando comparação...', 'info');
        
        // Usar os IDs dos uploads armazenados
        const pdfUploadId = window.extractedData.pdfUploadId;
        const excelUploadId = window.extractedData.excelUploadId;
        
        const response = await fetch('/api/comparacao/comparar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                excelUploadId,
                pdfUploadId
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro ao iniciar comparação');
        }
        
        const result = await response.json();
        currentComparison = result.data.comparisonId;
        
        // Resetar botão
        compareBtn.disabled = false;
        compareBtn.innerHTML = originalText;
        
        showProgress();
        
        // Monitorar progresso
        monitorComparison(currentComparison);
        
    } catch (error) {
        // Resetar botão em caso de erro
        compareBtn.disabled = false;
        compareBtn.innerHTML = originalText;
        
        showToast(`Erro: ${error.message}`, 'error');
        console.error('Erro na comparação:', error);
    }
}

// Monitorar comparação
async function monitorComparison(comparisonId) {
    console.log('🔄 [FRONTEND] === INICIANDO MONITORAMENTO ===', comparisonId);
    
    const checkStatus = async () => {
        try {
            console.log('🔍 [FRONTEND] Consultando status para ID:', comparisonId);
            const response = await fetch(`/api/comparacao/${comparisonId}/status`);
            const result = await response.json();
            
            console.log('📊 [FRONTEND] === STATUS RECEBIDO ===', result);
            console.log('📊 [FRONTEND] Status:', result.status);
            console.log('📊 [FRONTEND] Resultado:', result.resultado);
            
            // Nova estrutura da API - status direto
            const status = result.status;
            
            updateProgress(status);
            
            if (status === 'done') {
                // Resultado está em result.resultado
                const resultData = {
                    status: 'done',
                    summary: result.resultado.summary,
                    detailed_results: result.resultado.detailed_results
                };
                showResults(resultData);
                // loadLogs(comparisonId); // Desabilitado - sistema de logs removido
                return;
            } else if (status === 'error') {
                showToast(`Erro na comparação: ${result.message}`, 'error');
                hideProgress();
                return;
            }
            
            // Continuar monitorando
            setTimeout(checkStatus, 2000);
        } catch (error) {
            console.error('Erro ao verificar status:', error);
            setTimeout(checkStatus, 5000);
        }
    };
    
    checkStatus();
}

// Auto-start da comparação
async function autoStartComparison() {
    try {
        console.log('🔍 [FRONTEND] === VERIFICANDO UPLOADS ===');
        
        // Verificar se há uploads válidos (método simplificado)
        try {
            const uploadsResponse = await fetch('/api/upload');
            if (!uploadsResponse.ok) {
                console.log('ℹ️ [FRONTEND] Não foi possível verificar uploads');
                showToast('Faça upload de arquivos PDF e Excel para iniciar a comparação', 'info');
                return;
            }
            
            const uploadsResult = await uploadsResponse.json();
            console.log('📊 [FRONTEND] Uploads disponíveis:', uploadsResult.data?.length || 0);
            
            if (!uploadsResult.data || uploadsResult.data.length < 2) {
                console.log('ℹ️ [FRONTEND] Não há uploads suficientes para comparação');
                showToast('Faça upload de arquivos PDF e Excel para iniciar a comparação', 'info');
                return;
            }
        } catch (error) {
            console.warn('⚠️ [FRONTEND] Erro ao verificar uploads:', error);
            showToast('Faça upload de arquivos PDF e Excel para iniciar a comparação', 'info');
            return;
        }
        
        console.log('🚀 [FRONTEND] === AUTO-START INICIADO ===');
        showToast('Iniciando comparação automática...', 'info');
        
        const response = await fetch('/api/comparacao/auto-start');
        const result = await response.json();
        
        console.log('📊 [FRONTEND] === RESULTADO AUTO-START ===', result);
        console.log('📊 [FRONTEND] Success:', result.success);
        console.log('📊 [FRONTEND] Data:', result.data);
        
        if (result.success && result.data && result.data.comparisonId) {
            const comparisonId = result.data.comparisonId;
            
            // Mostrar seção de progresso
            showProgress();
            
            // Iniciar monitoramento
            monitorComparison(comparisonId);
            
            showToast('Comparação iniciada automaticamente!', 'success');
        } else {
            console.log('ℹ️ [FRONTEND] Auto-start não disponível:', result.message);
            
            // Se não há uploads, mostrar mensagem informativa
            if (result.message && result.message.includes('upload')) {
                showToast('Faça upload de arquivos PDF e Excel para iniciar a comparação', 'info');
            }
        }
    } catch (error) {
        console.error('❌ [FRONTEND] Erro no auto-start:', error);
    }
}

// Atualizar progresso
function updateProgress(status) {
    const progressMap = {
        'pending': { percent: 25, text: 'Aguardando processamento...' },
        'processing': { percent: 75, text: 'Comparando períodos...' },
        'done': { percent: 100, text: 'Comparação concluída!' },
        'error': { percent: 0, text: 'Erro no processamento' }
    };
    
    const progress = progressMap[status] || progressMap['pending'];
    
    elements.progressFill.style.width = `${progress.percent}%`;
    elements.progressText.textContent = progress.text;
}

// Carregar logs
async function loadLogs(comparisonId) {
    try {
        const response = await fetch(`/api/comparacao/${comparisonId}/logs`);
        const result = await response.json();
        
        if (result.success && result.data.length > 0) {
            elements.logsContainer.innerHTML = '';
            
            result.data.forEach(log => {
                const logEntry = document.createElement('div');
                logEntry.className = `log-entry ${log.level}`;
                logEntry.innerHTML = `
                    <i class="fas fa-${getLogIcon(log.level)}"></i>
                    <strong>${formatDate(log.created_at)}</strong> - ${log.message}
                `;
                elements.logsContainer.appendChild(logEntry);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar logs:', error);
    }
}

function getLogIcon(level) {
    const icons = {
        'info': 'info-circle',
        'warn': 'exclamation-triangle',
        'error': 'times-circle'
    };
    return icons[level] || 'info-circle';
}

// Mostrar resultados ENTERPRISE
function showResults(comparisonData) {
    hideProgress();
    
    // Usar a nova interface limpa em colunas
    generateCleanComparisonContent(comparisonData, elements.resultsSummary);
    
    elements.resultsSection.style.display = 'block';
    
    // Scroll para resultados
    elements.resultsSection.scrollIntoView({ behavior: 'smooth' });
    
    showToast('✅ Análise Enterprise concluída com sucesso!', 'success');
    loadHistory();
}

// Download de relatórios
async function downloadReport(format) {
    if (!currentComparison) {
        showToast('Nenhuma comparação ativa', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const response = await fetch(`/api/comparacao/${currentComparison}/download?format=${format}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erro no download');
        }
        
        if (format === 'json') {
            const data = await response.json();
            downloadJSON(data, `relatorio_${currentComparison}.json`);
        } else {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio_${currentComparison}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }
        
        showToast(`Relatório ${format.toUpperCase()} baixado com sucesso!`, 'success');
        
    } catch (error) {
        showToast(`Erro no download: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Mostrar detalhes
function showDetails() {
    elements.detailsSection.style.display = 'block';
    elements.detailsSection.scrollIntoView({ behavior: 'smooth' });
    
    // Carregar dados dos detalhes
    loadDetailsData();
}

// Carregar dados dos detalhes
async function loadDetailsData() {
    if (!currentComparison) return;
    
    try {
        const response = await fetch(`/api/comparacao/${currentComparison}/download?format=json`);
        const data = await response.json();
        
        if (data.success) {
            populateDetailsTable('matches', data.data.matches || []);
            populateDetailsTable('excel-only', data.data.excel_only || []);
            populateDetailsTable('pdf-only', data.data.pdf_only || []);
            populateDetailsTable('conflicts', data.data.conflicts || []);
        }
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
    }
}

// Popular tabelas de detalhes
function populateDetailsTable(type, data) {
    const container = document.getElementById(`${type}-table`);
    if (!container) return;
    
    let html = '';
    
    if (data.length === 0) {
        html = '<p class="text-center">Nenhum item encontrado.</p>';
    } else {
        html = '<table class="data-table">';
        
        // Cabeçalhos baseados no tipo
        if (type === 'matches') {
            html += `
                <thead>
                    <tr>
                        <th>Empresa (Excel)</th>
                        <th>Empresa (PDF)</th>
                        <th>Período (Excel)</th>
                        <th>Período (PDF)</th>
                        <th>Similaridade</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
            `;
            
            data.forEach(item => {
                const excelPeriod = item.excel_period || {};
                const pdfPeriod = item.pdf_period || {};
                const hasConflicts = item.has_conflicts;
                
                html += `
                    <tr>
                        <td>${excelPeriod.company || '-'}</td>
                        <td>${pdfPeriod.company || '-'}</td>
                        <td>${formatDateRange(excelPeriod.start_date, excelPeriod.end_date)}</td>
                        <td>${formatDateRange(pdfPeriod.start_date, pdfPeriod.end_date)}</td>
                        <td>${((item.similarity_score || 0) * 100).toFixed(1)}%</td>
                        <td><span class="status-badge ${hasConflicts ? 'conflict' : 'match'}">${hasConflicts ? 'Com Conflito' : 'OK'}</span></td>
                    </tr>
                `;
            });
        } else if (type === 'excel-only' || type === 'pdf-only') {
            html += `
                <thead>
                    <tr>
                        <th>Empresa</th>
                        <th>Cargo</th>
                        <th>Período</th>
                        <th>Dias</th>
                    </tr>
                </thead>
                <tbody>
            `;
            
            data.forEach(period => {
                const days = calculateDays(period.start_date, period.end_date);
                html += `
                    <tr>
                        <td>${period.company || '-'}</td>
                        <td>${period.role || '-'}</td>
                        <td>${formatDateRange(period.start_date, period.end_date)}</td>
                        <td>${days}</td>
                    </tr>
                `;
            });
        } else if (type === 'conflicts') {
            html += `
                <thead>
                    <tr>
                        <th>Empresa</th>
                        <th>Tipo de Conflito</th>
                        <th>Valor Excel</th>
                        <th>Valor PDF</th>
                        <th>Diferença</th>
                    </tr>
                </thead>
                <tbody>
            `;
            
            data.forEach(conflict => {
                const conflicts = conflict.conflicts || [];
                conflicts.forEach(c => {
                    html += `
                        <tr>
                            <td>${conflict.excel_period?.company || '-'}</td>
                            <td>${formatConflictType(c.type)}</td>
                            <td>${c.excel_value || '-'}</td>
                            <td>${c.pdf_value || '-'}</td>
                            <td>${formatConflictDifference(c)}</td>
                        </tr>
                    `;
                });
            });
        }
        
        html += '</tbody></table>';
    }
    
    container.innerHTML = html;
}

// Funções auxiliares para formatação
function formatDateRange(startDate, endDate) {
    if (!startDate || !endDate) return '-';
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    return `${start} a ${end}`;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
        // Se já está no formato DD/MM/YYYY, retornar como está
        if (typeof dateString === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
            return dateString;
        }
        
        // Se está no formato YYYY-MM-DD, converter para DD/MM/YYYY
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        }
        
        // Tentar converter como Date
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return dateString; // Retornar original se não conseguir converter
        }
        
        return date.toLocaleDateString('pt-BR');
    } catch (error) {
        console.warn('Erro ao formatar data:', dateString, error);
        return dateString || '-';
    }
}

function calculateDays(startDate, endDate) {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function formatConflictType(type) {
    const types = {
        'company_mismatch': 'Empresa Diferente',
        'start_date_mismatch': 'Data Início Diferente',
        'end_date_mismatch': 'Data Fim Diferente',
        'role_mismatch': 'Cargo Diferente'
    };
    return types[type] || type;
}

function formatConflictDifference(conflict) {
    if (conflict.difference_days) {
        return `${conflict.difference_days} dias`;
    } else if (conflict.similarity) {
        return `${(conflict.similarity * 100).toFixed(1)}% similar`;
    }
    return '-';
}

// Navegação por abas
function switchTab(tabName) {
    // Atualizar botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Atualizar conteúdo
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Carregar logs (DESABILITADO - sistema de logs removido)
async function loadLogs(comparisonId) {
    console.log('📝 [FRONTEND] Sistema de logs desabilitado temporariamente');
    // Não carregar logs para evitar erro 500
    return;
}

// Carregar histórico
async function loadHistory() {
    try {
        const response = await fetch('/api/comparacao');
        const result = await response.json();
        
        if (result.success) {
            displayHistory(result.data);
            // Também atualizar a seção principal de comparações
            displayAllComparisons(result.data);
        }
    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
    }
}

// Exibir histórico
function displayHistory(comparisons) {
    const historyContent = document.getElementById('history-content');
    
    if (comparisons.length === 0) {
        historyContent.innerHTML = `
            <div class="no-data">
                <i class="fas fa-history"></i>
                <p>Nenhuma comparação realizada ainda</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <table class="history-table">
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Arquivos</th>
                    <th>Status</th>
                    <th>Resultados</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    comparisons.forEach(comparison => {
        const statusClass = comparison.status === 'completed' ? 'completed' : 
                           comparison.status === 'error' ? 'error' : 'processing';
        
        const date = new Date(comparison.created_at).toLocaleString('pt-BR');
        
        html += `
            <tr>
                <td>${date}</td>
                <td>
                    <small>PDF: ${comparison.pdf_filename || 'N/A'}</small><br>
                    <small>Excel: ${comparison.excel_filename || 'N/A'}</small>
                </td>
                <td>
                    <span class="status-badge status-${statusClass}">
                        ${comparison.status === 'completed' ? 'Concluído' : 
                          comparison.status === 'error' ? 'Erro' : 'Processando'}
                    </span>
                </td>
                <td>
                    ${comparison.status === 'completed' ? 
                        `<small>Períodos: ${comparison.summary?.total_periods || 0}</small><br>
                         <small>Matches: ${comparison.summary?.matches || 0}</small>` : 
                        '-'}
                </td>
                <td>
                    ${comparison.status === 'completed' ? 
                        `<button class="btn btn-outline btn-sm" onclick="viewComparison(${comparison.id})">
                            <i class="fas fa-eye"></i> Ver
                        </button>` : 
                        '-'}
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    historyContent.innerHTML = html;
}

function formatStatus(status) {
    const statuses = {
        'pending': 'Pendente',
        'processing': 'Processando',
        'done': 'Concluído',
        'error': 'Erro'
    };
    return statuses[status] || status;
}

// Visualizar comparação do histórico
async function viewComparison(comparisonId) {
    currentComparison = comparisonId;
    
    try {
        const response = await fetch(`/api/comparacao/${comparisonId}/status`);
        const result = await response.json();
        
        if (result.status === 'done') {
            const resultData = {
                status: 'done',
                summary: result.resultado.summary,
                detailed_results: result.resultado.detailed_results
            };
            showResults(resultData);
        }
    } catch (error) {
        showToast('Erro ao carregar comparação', 'error');
    }
}

// Download de relatório do histórico
async function downloadHistoryReport(comparisonId, format) {
    const originalComparison = currentComparison;
    currentComparison = comparisonId;
    
    await downloadReport(format);
    
    currentComparison = originalComparison;
}

// Utilitários de UI
function showProgress() {
    elements.progressSection.style.display = 'block';
    elements.progressSection.scrollIntoView({ behavior: 'smooth' });
}

function hideProgress() {
    elements.progressSection.style.display = 'none';
}

function showLoading(show) {
    elements.loadingOverlay.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        ${message}
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Remover após 5 segundos
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function getToastIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'times-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Exportar dados para Excel
async function exportToExcel() {
    try {
        if (!window.extractedData || !window.extractedData.pdfUploadId) {
            showToast('Nenhum dado PDF para exportar. Extraia os dados primeiro.', 'error');
            return;
        }

        console.log('📊 [EXPORT] Iniciando exportação para Excel...');
        showToast('Gerando planilha Excel...', 'info');

        // Listar arquivos TXT disponíveis
        const listResponse = await fetch('/api/export/list-txt');
        const listResult = await listResponse.json();

        if (!listResult.success) {
            throw new Error('Erro ao listar arquivos TXT');
        }

        // Encontrar arquivo TXT do upload atual
        const uploadId = window.extractedData.pdfUploadId;
        const txtFile = listResult.data.find(file => file.uploadId == uploadId);

        if (!txtFile) {
            throw new Error('Arquivo TXT não encontrado para este upload');
        }

        console.log('📄 [EXPORT] Arquivo TXT encontrado:', txtFile.fileName);

        // Solicitar exportação
        const exportResponse = await fetch('/api/export/txt-to-excel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                txtFileName: txtFile.fileName,
                uploadId: uploadId
            })
        });

        const exportResult = await exportResponse.json();

        if (!exportResult.success) {
            throw new Error(exportResult.message || 'Erro na exportação');
        }

        console.log('✅ [EXPORT] Planilha criada:', exportResult.data);

        // Fazer download automático
        const downloadUrl = exportResult.data.downloadUrl;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = exportResult.data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`Planilha Excel criada com ${exportResult.data.periodos} períodos!`, 'success');

    } catch (error) {
        console.error('❌ [EXPORT] Erro na exportação:', error);
        showToast(`Erro na exportação: ${error.message}`, 'error');
    }
}

// Listar arquivos TXT disponíveis
async function listTxtFiles() {
    try {
        const response = await fetch('/api/export/list-txt');
        const result = await response.json();

        if (!result.success) {
            throw new Error('Erro ao listar arquivos TXT');
        }

        return result.data;
    } catch (error) {
        console.error('❌ [EXPORT] Erro ao listar TXT:', error);
        throw error;
    }
}

// ===== SISTEMA DE COMPARAÇÕES AUTOMÁTICAS =====

// Função para carregar TODAS as comparações automaticamente
async function loadAllComparisons() {
    try {
        console.log('📊 [FRONTEND] === CARREGANDO TODAS AS COMPARAÇÕES ===');
        
        const response = await fetch('/api/comparacao/all');
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
            console.log(`📊 [FRONTEND] ${data.data.length} comparações encontradas`);
            displayAllComparisons(data.data);
            showComparisonSection();
        } else {
            console.log('📊 [FRONTEND] Nenhuma comparação encontrada');
            showNoComparisons();
        }
    } catch (error) {
        console.error('❌ [FRONTEND] Erro ao carregar comparações:', error);
        showNoComparisons();
    }
}

// Função para exibir todas as comparações
function displayAllComparisons(comparisons) {
    console.log('🎯 [FRONTEND] Exibindo comparações na tela...');
    
    const historySection = document.getElementById('history-container');
    if (!historySection) {
        console.error('❌ [FRONTEND] Seção de histórico não encontrada');
        return;
    }
    
    // Limpar conteúdo anterior
    historySection.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0;">📊 Todas as Comparações Realizadas (${comparisons.length})</h3>
            <div>
                <button class="clear-history-btn" 
                        style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                    🗑️ Limpar Histórico
                </button>
                <button class="refresh-comparisons-btn" 
                        style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🔄 Atualizar
                </button>
            </div>
        </div>
        <div class="comparison-grid" id="comparison-grid"></div>
    `;
    
    const grid = document.getElementById('comparison-grid');
    
    // Mostrar apenas as 20 comparações mais recentes para performance
    const recentComparisons = comparisons.slice(0, 20);
    
    recentComparisons.forEach((comparison, index) => {
        const card = document.createElement('div');
        card.className = 'comparison-card';
        card.style.cssText = `
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            margin: 10px 0;
            background: ${comparison.status === 'done' ? '#f8fff8' : '#fff8f8'};
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        
        // Parse do resultado se disponível
        let summary = null;
        let detailedResults = null;
        if (comparison.resultado) {
            try {
                // Verificar se já é um objeto ou se precisa fazer parse
                let resultado;
                if (typeof comparison.resultado === 'string') {
                    resultado = JSON.parse(comparison.resultado);
                } else {
                    resultado = comparison.resultado;
                }
                summary = resultado.summary;
                detailedResults = resultado.detailed_results;
            } catch (e) {
                console.warn('Erro ao parsear resultado:', e);
                // Tentar usar o objeto diretamente se o parse falhar
                if (typeof comparison.resultado === 'object') {
                    summary = comparison.resultado.summary;
                    detailedResults = comparison.resultado.detailed_results;
                }
            }
        }
        
        // Análise de diferenças
        let differencesInfo = '';
        if (detailedResults && detailedResults.matches) {
            const totalDifferences = detailedResults.matches.reduce((sum, match) => 
                sum + (match.differences ? match.differences.length : 0), 0);
            const exactMatches = detailedResults.matches.filter(m => m.is_exact_match).length;
            
            if (totalDifferences > 0) {
                differencesInfo = `
                    <div style="margin-top: 8px; font-size: 12px; color: #e67e22;">
                        ⚠️ <strong>Diferenças:</strong> ${totalDifferences} encontradas
                        | Matches exatos: ${exactMatches}/${detailedResults.matches.length}
                    </div>
                `;
            }
        }
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="margin: 0 0 10px 0; color: #333;">
                        🔄 Comparação #${comparison.id}
                        <span style="font-size: 12px; color: ${comparison.status === 'done' ? 'green' : 'red'};">
                            (${comparison.status.toUpperCase()})
                        </span>
                    </h4>
                    <p style="margin: 5px 0; font-size: 14px;">
                        📄 <strong>PDF:</strong> ${comparison.pdf_name || 'N/A'}<br>
                        📊 <strong>Excel:</strong> ${comparison.excel_name || 'N/A'}
                    </p>
                    ${summary ? `
                        <div style="margin-top: 10px; font-size: 13px; color: #666;">
                            📊 <strong>Resultados:</strong>
                            ${summary.matched_periods}/${Math.max(summary.total_excel_periods, summary.total_pdf_periods)} matches 
                            (${(summary.match_rate || 0).toFixed(1)}% taxa)
                            | Qualidade: ${(summary.quality_score || 0).toFixed(1)}%
                            ${summary.partial_matches ? `| Parciais: ${summary.partial_matches}` : ''}
                        </div>
                        ${summary.excel_only_periods > 0 || summary.pdf_only_periods > 0 ? `
                            <div style="margin-top: 5px; font-size: 12px; color: #e74c3c;">
                                📋 <strong>Únicos:</strong> Excel: ${summary.excel_only_periods} | PDF: ${summary.pdf_only_periods}
                            </div>
                        ` : ''}
                        ${summary.overlaps_found > 0 || summary.gaps_found > 0 ? `
                            <div style="margin-top: 5px; font-size: 12px; color: #f39c12;">
                                🔍 <strong>Análise:</strong> Sobreposições: ${summary.overlaps_found} | Lacunas: ${summary.gaps_found}
                            </div>
                        ` : ''}
                    ` : ''}
                    ${differencesInfo}
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12px; color: #888;">
                        ${new Date(comparison.created_at).toLocaleString('pt-BR')}
                    </div>
                    <div style="display: flex; gap: 5px; margin-top: 10px;">
                        ${comparison.status === 'done' ? `
                            <button data-comparison-id="${comparison.id}" 
                                    style="padding: 5px 10px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                                Ver Diferenças
                            </button>
                        ` : ''}
                        <button data-comparison-id="${comparison.id}" 
                                style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
                            🗑️ Deletar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar hover effect
        card.addEventListener('mouseenter', () => {
            card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            card.style.transform = 'translateY(-2px)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.boxShadow = 'none';
            card.style.transform = 'translateY(0)';
        });
        
        grid.appendChild(card);
    });
    
    // Adicionar botão para ver mais se houver mais comparações
    if (comparisons.length > 20) {
        const moreButton = document.createElement('div');
        moreButton.style.cssText = 'text-align: center; margin: 20px 0;';
        moreButton.innerHTML = `
            <button onclick="loadMoreComparisons()" 
                    style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
                Ver Mais (${comparisons.length - 20} restantes)
            </button>
        `;
        grid.appendChild(moreButton);
    }
}

// Função para mostrar seção de comparações
function showComparisonSection() {
    const historySection = document.getElementById('comparison-history');
    if (historySection) {
        historySection.style.display = 'block';
    }
}

// Função para mostrar quando não há comparações
function showNoComparisons() {
    const historySection = document.getElementById('comparison-history');
    if (historySection) {
        historySection.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <h3>📊 Nenhuma Comparação Encontrada</h3>
                <p>Faça upload de arquivos PDF e Excel para iniciar as comparações automáticas.</p>
            </div>
        `;
        historySection.style.display = 'block';
    }
}

// Função para ver detalhes de uma comparação específica
async function viewComparisonDetails(comparisonId) {
    try {
        console.log(`🔍 [FRONTEND] Carregando detalhes da comparação ${comparisonId}...`);
        
        const response = await fetch(`/api/comparacao/${comparisonId}/details`);
        const data = await response.json();
        
        if (data.success && data.data) {
            displayComparisonResultsModal(data.data);
        } else {
            showToast('Erro ao carregar detalhes da comparação', 'error');
        }
    } catch (error) {
        console.error('❌ [FRONTEND] Erro ao carregar detalhes:', error);
        showToast('Erro ao carregar detalhes', 'error');
    }
}

// Função para exibir resultados da comparação em modal
function displayComparisonResultsModal(comparison) {
    console.log('🔍 [FRONTEND] Exibindo resultados enterprise em modal...');
    
    let resultado;
    try {
        resultado = typeof comparison.resultado === 'string' ? 
            JSON.parse(comparison.resultado) : comparison.resultado;
    } catch (error) {
        showToast('Erro ao processar dados da comparação', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        overflow-y: auto;
        padding: 20px;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 0;
        max-width: 95%;
        width: 1200px;
        max-height: 90vh;
        overflow-y: auto;
        position: relative;
        margin: 20px auto;
    `;
    
    // Header do modal
    const header = document.createElement('div');
    header.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 30px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 12px 12px 0 0;
    `;
    
    header.innerHTML = `
        <h2 style="margin: 0; font-size: 24px;">🔍 Análise Detalhada Enterprise - Comparação #${comparison.id}</h2>
        <button onclick="this.closest('.modal').remove()" 
                style="background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; font-size: 18px;">
            ×
        </button>
    `;
    
    // Container para os resultados
    const resultsContainer = document.createElement('div');
    resultsContainer.id = 'modal-comparison-results';
    resultsContainer.style.padding = '0';
    
    // Gerar conteúdo limpo em colunas
    generateCleanComparisonContent(resultado, resultsContainer);
    
    content.appendChild(header);
    content.appendChild(resultsContainer);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Função para exibir diferenças detalhadas (LEGACY - manter para compatibilidade)
function displayDetailedDifferences(comparison) {
    console.log('🔍 [FRONTEND] Exibindo diferenças detalhadas...');
    
    let resultado;
    try {
        resultado = typeof comparison.resultado === 'string' ? 
            JSON.parse(comparison.resultado) : comparison.resultado;
    } catch (error) {
        showToast('Erro ao processar dados da comparação', 'error');
        return;
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 1000;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow-y: auto;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 90%;
        max-height: 90%;
        overflow-y: auto;
        position: relative;
    `;
    
    content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #333;">🔍 Análise Detalhada de Diferenças - Comparação #${comparison.id}</h2>
            <button onclick="this.closest('.modal').remove()" 
                    style="background: #dc3545; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">
                ×
            </button>
        </div>
        
        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0;">📊 Resumo Geral</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                <div><strong>Total Excel:</strong> ${resultado.summary.total_excel_periods} períodos</div>
                <div><strong>Total PDF:</strong> ${resultado.summary.total_pdf_periods} períodos</div>
                <div><strong>Matches:</strong> ${resultado.summary.matched_periods}</div>
                <div><strong>Parciais:</strong> ${resultado.summary.partial_matches || 0}</div>
                <div><strong>Excel únicos:</strong> ${resultado.summary.excel_only_periods}</div>
                <div><strong>PDF únicos:</strong> ${resultado.summary.pdf_only_periods}</div>
                <div><strong>Taxa de match:</strong> ${(resultado.summary.match_rate || 0).toFixed(1)}%</div>
                <div><strong>Qualidade:</strong> ${(resultado.summary.quality_score || 0).toFixed(1)}%</div>
            </div>
            
            <div class="summary-grid">
                <div class="stat-card">
                    <div class="stat-icon">📊</div>
                    <div class="stat-content">
                        <div class="stat-value">${summary.total_excel_periods}</div>
                        <div class="stat-label">Períodos Excel</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📄</div>
                    <div class="stat-content">
                        <div class="stat-value">${summary.total_pdf_periods}</div>
                        <div class="stat-label">Períodos PDF</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">🔗</div>
                    <div class="stat-content">
                        <div class="stat-value">${summary.matched_periods}</div>
                        <div class="stat-label">Correspondências</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📈</div>
                    <div class="stat-content">
                        <div class="stat-value">${(summary.match_rate || 0).toFixed(1)}%</div>
                        <div class="stat-label">Taxa de Match</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⭐</div>
                    <div class="stat-content">
                        <div class="stat-value">${(summary.quality_score || 0).toFixed(1)}</div>
                        <div class="stat-label">Score Qualidade</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">⚠️</div>
                    <div class="stat-content">
                        <div class="stat-value">${summary.conflicts_count || 0}</div>
                        <div class="stat-label">Conflitos</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Matches encontrados com análise detalhada
    if (detailed_results.matches && detailed_results.matches.length > 0) {
        html += '<div class="matches-section enterprise-matches"><h3>🔍 Análise Detalhada dos Períodos</h3>';
        
        detailed_results.matches.forEach((match, index) => {
            const isExact = match.is_exact_match;
            const analysis = match.analysis || {};
            const matchClass = getMatchQualityClass(analysis.match_quality);
            const riskClass = getRiskLevelClass(analysis.risk_level);
            
            html += `
                <div class="match-item enterprise-match ${matchClass}">
                    <div class="match-header">
                        <div class="match-info">
                            <span class="match-number">#${index + 1}</span>
                            <span class="match-quality-badge ${matchClass}">
                                ${getMatchQualityIcon(analysis.match_quality)} ${analysis.match_quality || 'BOM'}
                            </span>
                            <span class="risk-badge ${riskClass}">
                                ${getRiskIcon(analysis.risk_level)} ${getRiskLabel(analysis.risk_level)}
                            </span>
                        </div>
                        <div class="match-scores">
                            <span class="similarity-score">Similaridade: ${(match.similarity_score * 100).toFixed(1)}%</span>
                            <span class="confidence-score">Confiança: ${((analysis.confidence_score || 0.8) * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                    
                    <div class="period-comparison enterprise-comparison">
                        <div class="period-excel">
                            <div class="period-header">
                                <h4>📊 Planilha Excel</h4>
                                <span class="source-badge excel-badge">EXCEL</span>
                            </div>
                            <div class="period-details">
                                <div class="detail-row">
                                    <span class="detail-label">🏢 Empresa:</span>
                                    <span class="detail-value">${match.excel_period.company}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">📅 Início:</span>
                                    <span class="detail-value">${match.excel_period.formatted_dates?.start || formatDate(match.excel_period.start_date)}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">📅 Fim:</span>
                                    <span class="detail-value">${match.excel_period.formatted_dates?.end || formatDate(match.excel_period.end_date)}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">⏱️ Duração:</span>
                                    <span class="detail-value">${match.excel_period.formatted_dates?.duration_text || match.excel_period.duration_days + ' dias'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="comparison-arrow">
                            <div class="arrow-icon">${isExact ? '✅' : '⚠️'}</div>
                            <div class="arrow-line"></div>
                        </div>
                        
                        <div class="period-pdf">
                            <div class="period-header">
                                <h4>📄 Extrato PDF</h4>
                                <span class="source-badge pdf-badge">PDF</span>
                            </div>
                            <div class="period-details">
                                <div class="detail-row">
                                    <span class="detail-label">🏢 Empresa:</span>
                                    <span class="detail-value">${match.pdf_period.company}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">📅 Início:</span>
                                    <span class="detail-value">${match.pdf_period.formatted_dates?.start || formatDate(match.pdf_period.start_date)}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">📅 Fim:</span>
                                    <span class="detail-value">${match.pdf_period.formatted_dates?.end || formatDate(match.pdf_period.end_date)}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">⏱️ Duração:</span>
                                    <span class="detail-value">${match.pdf_period.formatted_dates?.duration_text || match.pdf_period.duration_days + ' dias'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    ${analysis.detailed_explanation ? `
                        <div class="analysis-explanation">
                            <h5>📋 Análise:</h5>
                            <p>${analysis.detailed_explanation}</p>
                        </div>
                    ` : ''}
                    
                    ${match.differences && match.differences.length > 0 ? `
                        <div class="differences-section enterprise-differences">
                            <div class="differences-header">
                                <h4>🔍 Diferenças Identificadas</h4>
                                <span class="differences-count">${match.differences.length} diferença(s)</span>
                            </div>
                            
                            ${match.differences.map(diff => `
                                <div class="difference-item severity-${diff.severity}">
                                    <div class="difference-header">
                                        <div class="difference-type">
                                            <span class="severity-icon">${getSeverityIcon(diff.severity)}</span>
                                            <span class="category">${diff.category || diff.type.replace('_', ' ').toUpperCase()}</span>
                                            <span class="severity-badge severity-${diff.severity}">${getSeverityLabel(diff.severity)}</span>
                                        </div>
                                    </div>
                                    
                                    <div class="difference-content">
                                        <div class="difference-reason">
                                            <strong>Motivo:</strong> ${diff.reason}
                                        </div>
                                        
                                        <div class="difference-values">
                                            <div class="value-comparison">
                                                <div class="value-item excel-value">
                                                    <span class="value-label">Excel:</span>
                                                    <span class="value-text">${diff.excel_value}</span>
                                                </div>
                                                <div class="value-item pdf-value">
                                                    <span class="value-label">PDF:</span>
                                                    <span class="value-text">${diff.pdf_value}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        ${diff.impact_analysis ? `
                                            <div class="impact-analysis">
                                                <h6>📊 Análise de Impacto:</h6>
                                                <div class="impact-grid">
                                                    <div class="impact-item">
                                                        <span class="impact-label">⚖️ Legal:</span>
                                                        <span class="impact-text">${diff.impact_analysis.legal}</span>
                                                    </div>
                                                    <div class="impact-item">
                                                        <span class="impact-label">💰 Financeiro:</span>
                                                        <span class="impact-text">${diff.impact_analysis.financial}</span>
                                                    </div>
                                                    <div class="impact-item">
                                                        <span class="impact-label">📋 Administrativo:</span>
                                                        <span class="impact-text">${diff.impact_analysis.administrative}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ` : ''}
                                        
                                        ${diff.recommendations && diff.recommendations.length > 0 ? `
                                            <div class="recommendations">
                                                <h6>💡 Recomendações:</h6>
                                                <ul class="recommendations-list">
                                                    ${diff.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                                                </ul>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="perfect-match">
                            <div class="perfect-match-icon">✅</div>
                            <div class="perfect-match-text">Match Perfeito - Todos os dados são idênticos</div>
                        </div>
                    `}
                    
                    ${analysis.business_impact ? `
                        <div class="business-impact">
                            <h5>📈 Impacto no Negócio:</h5>
                            <p class="impact-text">${analysis.business_impact}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    // Períodos exclusivos com análise
    if (detailed_results.pdf_only && detailed_results.pdf_only.length > 0) {
        html += generateExclusivePeriodsSection('pdf', detailed_results.pdf_only, '📄 Períodos Exclusivos do PDF');
    }
    
    // Análise especializada INSS
    if (results.inss_analysis) {
        html += generateINSSSpecializedAnalysis(results.inss_analysis);
    }
    
    resultsContainer.innerHTML = html;
}

// Limpar histórico completo
async function clearAllHistory() {
    if (!confirm('⚠️ Tem certeza que deseja limpar TODAS as comparações?\n\nEsta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        console.log('🗑️ [FRONTEND] Iniciando limpeza completa do histórico...');
        
        const response = await fetch('/api/comparacao/clear-history', {
            method: 'DELETE'
        });
        
        const result = await response.json();
        console.log('📋 [FRONTEND] Resposta da limpeza:', result);
        
        if (result.success) {
            showToast(`✅ ${result.data.removed_comparisons} comparações removidas com sucesso!`, 'success');
            
            // Recarregar a lista
            await loadHistory();
        } else {
            console.error(`❌ [FRONTEND] Erro ao limpar histórico:`, result.message);
            showToast(`❌ Erro ao limpar: ${result.message}`, 'error');
        }
        
    } catch (error) {
        console.error('❌ [FRONTEND] Erro na requisição para limpar histórico:', error);
        showToast('❌ Erro de conexão ao limpar histórico', 'error');
    }
}

// Deletar comparação específica
async function deleteComparison(comparisonId) {
    if (!confirm(`⚠️ Tem certeza que deseja deletar a comparação #${comparisonId}?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }
    
    try {
        console.log(`🗑️ [FRONTEND] Deletando comparação ${comparisonId}...`);
        
        const response = await fetch(`/api/comparacao/${comparisonId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        console.log('📋 [FRONTEND] Resposta da deleção:', result);
        
        if (result.success) {
            showToast(`✅ Comparação #${comparisonId} deletada com sucesso!`, 'success');
            
            // Recarregar a lista
            await loadHistory();
        } else {
            console.error(`❌ [FRONTEND] Erro ao deletar comparação ${comparisonId}:`, result.message);
            showToast(`❌ Erro ao deletar: ${result.message}`, 'error');
        }
        
    } catch (error) {
        console.error(`❌ [FRONTEND] Erro na requisição para deletar ${comparisonId}:`, error);
        showToast('❌ Erro de conexão ao deletar comparação', 'error');
    }
}

// Funções auxiliares
function getSeverityColor(severity) {
    switch (severity) {
        case 'high': return '#dc3545';
        case 'medium': return '#ffc107';
        case 'low': return '#28a745';
        default: return '#6c757d';
    }
}

function getDifferenceTypeLabel(type) {
    switch (type) {
        case 'company_name': return 'Nome da Empresa';
        case 'start_date': return 'Data de Início';
        case 'end_date': return 'Data de Fim';
        case 'duration': return 'Duração';
        default: return type;
    }
}

// Funções auxiliares para interface enterprise
function getQualityBadgeClass(score) {
    if (score >= 90) return 'quality-excellent';
    if (score >= 75) return 'quality-good';
    if (score >= 60) return 'quality-fair';
    return 'quality-poor';
}

function getQualityLabel(score) {
    if (score >= 90) return '🏆 EXCELENTE';
    if (score >= 75) return '✅ BOM';
    if (score >= 60) return '⚠️ REGULAR';
    return '❌ CRÍTICO';
}

function getMatchQualityClass(quality) {
    switch(quality) {
        case 'PERFEITO': return 'match-perfect';
        case 'BOM': return 'match-good';
        case 'BAIXO': return 'match-low';
        case 'CRÍTICO': return 'match-critical';
        default: return 'match-good';
    }
}

function getMatchQualityIcon(quality) {
    switch(quality) {
        case 'PERFEITO': return '🏆';
        case 'BOM': return '✅';
        case 'BAIXO': return '⚠️';
        case 'CRÍTICO': return '❌';
        default: return '✅';
    }
}

function getRiskLevelClass(risk) {
    switch(risk) {
        case 'high': return 'risk-high';
        case 'medium': return 'risk-medium';
        case 'low': return 'risk-low';
        default: return 'risk-low';
    }
}

function getRiskIcon(risk) {
    switch(risk) {
        case 'high': return '🚨';
        case 'medium': return '⚠️';
        case 'low': return '✅';
        default: return '✅';
    }
}

function getRiskLabel(risk) {
    switch(risk) {
        case 'high': return 'ALTO';
        case 'medium': return 'MÉDIO';
        case 'low': return 'BAIXO';
        default: return 'BAIXO';
    }
}

function getSeverityIcon(severity) {
    switch(severity) {
        case 'high': return '🚨';
        case 'medium': return '⚠️';
        case 'low': return 'ℹ️';
        default: return 'ℹ️';
    }
}

function getSeverityLabel(severity) {
    switch(severity) {
        case 'high': return 'CRÍTICA';
        case 'medium': return 'MÉDIA';
        case 'low': return 'MENOR';
        default: return 'MENOR';
    }
}

// Gerar seção de períodos exclusivos
function generateExclusivePeriodsSection(type, periods, title) {
    const typeClass = type === 'excel' ? 'excel-exclusive' : 'pdf-exclusive';
    const typeIcon = type === 'excel' ? '📊' : '📄';
    const typeBadge = type === 'excel' ? 'EXCEL' : 'PDF';
    
    let html = `<div class="exclusive-section ${typeClass}"><h3>${title}</h3>`;
    
    periods.forEach((period, index) => {
        const analysis = period.analysis || {};
        
        html += `
            <div class="exclusive-period">
                <div class="period-header">
                    <span class="period-number">#${index + 1}</span>
                    <span class="source-badge ${type}-badge">${typeBadge}</span>
                    <span class="impact-badge impact-${analysis.impact || 'high'}">
                        ${analysis.impact === 'high' ? '🚨 ALTO IMPACTO' : '⚠️ VERIFICAR'}
                    </span>
                </div>
                
                <div class="period-details">
                    <div class="detail-row">
                        <span class="detail-label">🏢 Empresa:</span>
                        <span class="detail-value">${period.company}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">📅 Período:</span>
                        <span class="detail-value">${formatDate(period.start_date)} a ${formatDate(period.end_date)}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">⏱️ Duração:</span>
                        <span class="detail-value">${period.duration_days} dias</span>
                    </div>
                </div>
                
                ${analysis.reason ? `
                    <div class="analysis-reason">
                        <h5>📋 Análise:</h5>
                        <p>${analysis.reason}</p>
                    </div>
                ` : ''}
                
                ${analysis.recommendations && analysis.recommendations.length > 0 ? `
                    <div class="recommendations">
                        <h5>💡 Recomendações:</h5>
                        <ul class="recommendations-list">
                            ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

// Gerar conteúdo limpo para comparação - Layout em colunas
function generateCleanComparisonContent(results, container) {
    if (!results || !results.detailed_results) {
        container.innerHTML = '<div class="alert alert-error">Erro ao carregar resultados da comparação</div>';
        return;
    }
    
    const { summary, detailed_results } = results;
    
    // Usar totais do summary (já calculados corretamente no backend)
    const excelTotalDays = summary.total_days_excel || 0;
    const pdfTotalDays = summary.total_days_pdf || 0;

    let html = `
        <div class="comparison-container-clean">
            <div class="comparison-totals">
                <div class="total-card excel-total">
                    <h4>📊 Planilha Excel</h4>
                    <div class="total-info">
                        <span class="count">${summary.total_excel_periods} períodos</span>
                        <span class="duration">${calculateTotalTime(excelTotalDays)}</span>
                    </div>
                </div>
                <div class="total-card pdf-total">
                    <h4>📄 Extrato PDF</h4>
                    <div class="total-info">
                        <span class="count">${summary.total_pdf_periods} períodos</span>
                        <span class="duration">${calculateTotalTime(pdfTotalDays)}</span>
                    </div>
                </div>
                <div class="total-card matches-total">
                    <h4>🔗 Correspondências</h4>
                    <div class="total-info">
                        <span class="count">${summary.matched_periods} matches</span>
                        <span class="duration">${(summary.match_rate || 0).toFixed(1)}% taxa</span>
                    </div>
                </div>
            </div>
            
            <div class="periods-comparison-grid">`;

    // Layout limpo em colunas para cada match
    if (detailed_results.matches && detailed_results.matches.length > 0) {
        detailed_results.matches.forEach((match, index) => {
            const excelPeriod = match.excel_period;
            const pdfPeriod = match.pdf_period;
            
            html += `
                <div class="period-pair-card">
                    <div class="excel-column">
                        <div class="column-header excel-header">
                            <span class="source-icon">📊</span>
                            <h4>Planilha Excel</h4>
                            <span class="source-badge excel-badge">EXCEL</span>
                        </div>
                        <div class="period-info">
                            <div class="company-name">${excelPeriod.company}</div>
                            <div class="period-dates">
                                <div class="date-item">
                                    <span class="date-label">📅 Início:</span>
                                    <span class="date-value">${excelPeriod.formatted_dates?.start || formatDate(excelPeriod.start_date)}</span>
                                </div>
                                <div class="date-item">
                                    <span class="date-label">📅 Fim:</span>
                                    <span class="date-value">${excelPeriod.formatted_dates?.end || formatDate(excelPeriod.end_date)}</span>
                                </div>
                                <div class="duration-item">
                                    <span class="duration-label">⏱️ Duração:</span>
                                    <span class="duration-value">${excelPeriod.duration_days} dias</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="pdf-column">
                        <div class="column-header pdf-header">
                            <span class="source-icon">📄</span>
                            <h4>Extrato PDF</h4>
                            <span class="source-badge pdf-badge">PDF</span>
                        </div>
                        <div class="period-info">
                            <div class="company-name">${pdfPeriod.company}</div>
                            <div class="period-dates">
                                <div class="date-item">
                                    <span class="date-label">📅 Início:</span>
                                    <span class="date-value">${pdfPeriod.formatted_dates?.start || formatDate(pdfPeriod.start_date)}</span>
                                </div>
                                <div class="date-item">
                                    <span class="date-label">📅 Fim:</span>
                                    <span class="date-value">${pdfPeriod.formatted_dates?.end || formatDate(pdfPeriod.end_date)}</span>
                                </div>
                                <div class="duration-item">
                                    <span class="duration-label">⏱️ Duração:</span>
                                    <span class="duration-value">${pdfPeriod.duration_days} dias</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `
            </div>
            
            <div class="total-time-summary">
                <div class="summary-card">
                    <h3>Resumo Total de Tempo</h3>
                    <div class="time-breakdown">
                        <div class="time-item excel-time">
                            <div class="status-indicator"></div>
                            <span class="time-label">📊 Planilha Excel</span>
                            <span class="time-value">${calculateTotalTime(excelTotalDays)}</span>
                            <div class="time-details">
                                <small>${summary.total_excel_periods} período${summary.total_excel_periods !== 1 ? 's' : ''} • ${excelTotalDays.toLocaleString('pt-BR')} dias</small>
                            </div>
                        </div>
                        <div class="time-item pdf-time">
                            <div class="status-indicator"></div>
                            <span class="time-label">📄 Extrato PDF</span>
                            <span class="time-value">${calculateTotalTime(pdfTotalDays)}</span>
                            <div class="time-details">
                                <small>${summary.total_pdf_periods} período${summary.total_pdf_periods !== 1 ? 's' : ''} • ${pdfTotalDays.toLocaleString('pt-BR')} dias</small>
                            </div>
                        </div>
                        <div class="time-item total-time">
                            <div class="status-indicator"></div>
                            <span class="time-label">🎯 Total Geral</span>
                            <span class="time-value">${calculateTotalTime(Math.max(excelTotalDays, pdfTotalDays))}</span>
                            <div class="time-details">
                                <small>Maior período • ${(summary.match_rate || 0).toFixed(1)}% compatibilidade</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="quality-indicator">
                        <div class="quality-badge ${getQualityClass(summary.quality_score)}">
                            <span class="quality-icon">${getQualityIcon(summary.quality_score)}</span>
                            <span class="quality-text">Qualidade: ${(summary.quality_score || 0).toFixed(1)}%</span>
                        </div>
                        <div class="match-stats">
                            <span class="stat-item">
                                <strong>${summary.matched_periods}</strong> correspondências
                            </span>
                            <span class="stat-separator">•</span>
                            <span class="stat-item">
                                <strong>${summary.excel_only_periods + summary.pdf_only_periods}</strong> únicos
                            </span>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// Funções auxiliares para indicadores de qualidade
function getQualityClass(score) {
    const safeScore = score || 0;
    if (safeScore >= 90) return 'quality-excellent';
    if (safeScore >= 80) return 'quality-good';
    if (safeScore >= 70) return 'quality-regular';
    if (safeScore >= 60) return 'quality-low';
    return 'quality-very-low';
}

function getQualityIcon(score) {
    const safeScore = score || 0;
    if (safeScore >= 90) return '🏆';
    if (safeScore >= 80) return '✅';
    if (safeScore >= 70) return '👍';
    if (safeScore >= 60) return '⚠️';
    return '❌';
}

// Gerar conteúdo enterprise para comparação - VERSÃO ORIGINAL COMPLETA
function generateEnterpriseComparisonContent(results, container) {
    if (!results || !results.detailed_results) {
        container.innerHTML = '<div class="alert alert-error">Erro ao carregar resultados da comparação</div>';
        return;
    }
    
    const { summary, detailed_results } = results;
    
    // Calcular totais de tempo
    const calculateTotalDays = (periods) => {
        return periods.reduce((total, period) => {
            return total + (period.duration_days || 0);
        }, 0);
    };

    const excelTotalDays = detailed_results.excel_periods ? calculateTotalDays(detailed_results.excel_periods) : 0;
    const pdfTotalDays = detailed_results.pdf_periods ? calculateTotalDays(detailed_results.pdf_periods) : 0;

    let html = `
        <div class="comparison-container-clean">
            <div class="comparison-totals">
                <div class="total-card excel-total">
                    <h4>📊 Planilha Excel</h4>
                    <div class="total-info">
                        <span class="count">${summary.total_excel_periods} períodos</span>
                        <span class="duration">${excelTotalDays} dias total</span>
                    </div>
                </div>
                <div class="total-card pdf-total">
                    <h4>📄 Extrato PDF</h4>
                    <div class="total-info">
                        <span class="count">${summary.total_pdf_periods} períodos</span>
                        <span class="duration">${pdfTotalDays} dias total</span>
                    </div>
                </div>
                <div class="total-card matches-total">
                    <h4>🔗 Correspondências</h4>
                    <div class="total-info">
                        <span class="count">${summary.matched_periods} matches</span>
                        <span class="duration">${(summary.match_rate || 0).toFixed(1)}% taxa</span>
                    </div>
                </div>
            </div>
    `;
    
    // Matches encontrados com análise detalhada
    if (detailed_results.matches && detailed_results.matches.length > 0) {
        html += '<div class="matches-section enterprise-matches"><h3>🔍 Análise Detalhada dos Períodos</h3>';
        
        detailed_results.matches.forEach((match, index) => {
            const isExact = match.is_exact_match;
            const analysis = match.analysis || {};
            const matchClass = getMatchQualityClass(analysis.match_quality);
            const riskClass = getRiskLevelClass(analysis.risk_level);
            
            html += `
                <div class="match-item enterprise-match ${matchClass}">
                    <div class="match-header">
                        <div class="match-info">
                            <span class="match-number">#${index + 1}</span>
                            <span class="match-quality-badge ${matchClass}">
                                ${getMatchQualityIcon(analysis.match_quality)} ${analysis.match_quality || 'BOM'}
                            </span>
                            <span class="risk-badge ${riskClass}">
                                ${getRiskIcon(analysis.risk_level)} ${getRiskLabel(analysis.risk_level)}
                            </span>
                        </div>
                        <div class="match-scores">
                            <span class="similarity-score">Similaridade: ${(match.similarity_score * 100).toFixed(1)}%</span>
                            <span class="confidence-score">Confiança: ${((analysis.confidence_score || 0.8) * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                    
                    <div class="period-comparison enterprise-comparison">
                        <div class="period-excel">
                            <div class="period-header">
                                <h4>📊 Planilha Excel</h4>
                                <span class="source-badge excel-badge">EXCEL</span>
                            </div>
                            <div class="period-details">
                                <div class="detail-row">
                                    <span class="detail-label">🏢 Empresa:</span>
                                    <span class="detail-value">${match.excel_period.company}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">📅 Início:</span>
                                    <span class="detail-value">${match.excel_period.formatted_dates?.start || formatDate(match.excel_period.start_date)}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">📅 Fim:</span>
                                    <span class="detail-value">${match.excel_period.formatted_dates?.end || formatDate(match.excel_period.end_date)}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">⏱️ Duração:</span>
                                    <span class="detail-value">${match.excel_period.formatted_dates?.duration_text || match.excel_period.duration_days + ' dias'}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="comparison-arrow">
                            <div class="arrow-icon">${isExact ? '✅' : '⚠️'}</div>
                            <div class="arrow-line"></div>
                        </div>
                        
                        <div class="period-pdf">
                            <div class="period-header">
                                <h4>📄 Extrato PDF</h4>
                                <span class="source-badge pdf-badge">PDF</span>
                            </div>
                            <div class="period-details">
                                <div class="detail-row">
                                    <span class="detail-label">🏢 Empresa:</span>
                                    <span class="detail-value">${match.pdf_period.company}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">📅 Início:</span>
                                    <span class="detail-value">${match.pdf_period.formatted_dates?.start || formatDate(match.pdf_period.start_date)}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">📅 Fim:</span>
                                    <span class="detail-value">${match.pdf_period.formatted_dates?.end || formatDate(match.pdf_period.end_date)}</span>
                                </div>
                                <div class="detail-row">
                                    <span class="detail-label">⏱️ Duração:</span>
                                    <span class="detail-value">${match.pdf_period.formatted_dates?.duration_text || match.pdf_period.duration_days + ' dias'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    ${analysis.detailed_explanation ? `
                        <div class="analysis-explanation">
                            <h5>📋 Análise:</h5>
                            <p>${analysis.detailed_explanation}</p>
                        </div>
                    ` : ''}
                    
                    ${match.differences && match.differences.length > 0 ? `
                        <div class="differences-section enterprise-differences">
                            <div class="differences-header">
                                <h4>🔍 Diferenças Identificadas</h4>
                                <span class="differences-count">${match.differences.length} diferença(s)</span>
                            </div>
                            
                            ${match.differences.map(diff => `
                                <div class="difference-item severity-${diff.severity}">
                                    <div class="difference-header">
                                        <div class="difference-type">
                                            <span class="severity-icon">${getSeverityIcon(diff.severity)}</span>
                                            <span class="category">${diff.category || diff.type.replace('_', ' ').toUpperCase()}</span>
                                            <span class="severity-badge severity-${diff.severity}">${getSeverityLabel(diff.severity)}</span>
                                        </div>
                                    </div>
                                    
                                    <div class="difference-content">
                                        <div class="difference-reason">
                                            <strong>Motivo:</strong> ${diff.reason}
                                        </div>
                                        
                                        <div class="difference-values">
                                            <div class="value-comparison">
                                                <div class="value-item excel-value">
                                                    <span class="value-label">Excel:</span>
                                                    <span class="value-text">${diff.excel_value}</span>
                                                </div>
                                                <div class="value-item pdf-value">
                                                    <span class="value-label">PDF:</span>
                                                    <span class="value-text">${diff.pdf_value}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        ${diff.impact_analysis ? `
                                            <div class="impact-analysis">
                                                <h6>📊 Análise de Impacto:</h6>
                                                <div class="impact-grid">
                                                    <div class="impact-item">
                                                        <span class="impact-label">⚖️ Legal:</span>
                                                        <span class="impact-text">${diff.impact_analysis.legal}</span>
                                                    </div>
                                                    <div class="impact-item">
                                                        <span class="impact-label">💰 Financeiro:</span>
                                                        <span class="impact-text">${diff.impact_analysis.financial}</span>
                                                    </div>
                                                    <div class="impact-item">
                                                        <span class="impact-label">📋 Administrativo:</span>
                                                        <span class="impact-text">${diff.impact_analysis.administrative}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ` : ''}
                                        
                                        ${diff.recommendations && diff.recommendations.length > 0 ? `
                                            <div class="recommendations">
                                                <h6>💡 Recomendações:</h6>
                                                <ul class="recommendations-list">
                                                    ${diff.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                                                </ul>
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="perfect-match">
                            <div class="perfect-match-icon">✅</div>
                            <div class="perfect-match-text">Match Perfeito - Todos os dados são idênticos</div>
                        </div>
                    `}
                    
                    ${analysis.business_impact ? `
                        <div class="business-impact">
                            <h5>📈 Impacto no Negócio:</h5>
                            <p class="impact-text">${analysis.business_impact}</p>
                        </div>
                    ` : ''}
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    // Períodos exclusivos com análise
    if (detailed_results.excel_only && detailed_results.excel_only.length > 0) {
        html += generateExclusivePeriodsSection('excel', detailed_results.excel_only, '📊 Períodos Exclusivos do Excel');
    }
    
    if (detailed_results.pdf_only && detailed_results.pdf_only.length > 0) {
        html += generateExclusivePeriodsSection('pdf', detailed_results.pdf_only, '📄 Períodos Exclusivos do PDF');
    }
    
    // Análise especializada INSS
    if (results.inss_analysis) {
        html += generateINSSSpecializedAnalysis(results.inss_analysis);
    }
    
    container.innerHTML = html;
}

// Gerar análise especializada INSS
function generateINSSSpecializedAnalysis(inssAnalysis) {
    let html = `
        <div class="inss-specialized-analysis">
            <div class="inss-header">
                <h2>🏛️ Análise Especializada INSS</h2>
                <div class="inss-summary-cards">
                    <div class="inss-card tempo-comum">
                        <div class="card-icon">📋</div>
                        <div class="card-content">
                            <div class="card-number">${inssAnalysis.tempo_comum_nao_computado.length}</div>
                            <div class="card-label">Tempo Comum Não Computado</div>
                            <div class="card-detail">${inssAnalysis.resumo_inss.total_tempo_comum_perdido} dias perdidos</div>
                        </div>
                    </div>
                    
                    <div class="inss-card omissoes">
                        <div class="card-icon">📄</div>
                        <div class="card-content">
                            <div class="card-number">${inssAnalysis.periodos_omissos.length}</div>
                            <div class="card-label">Períodos Omissos</div>
                            <div class="card-detail">Omissões no extrato</div>
                        </div>
                    </div>
                    
                    <div class="inss-card especiais">
                        <div class="card-icon">⚙️</div>
                        <div class="card-content">
                            <div class="card-number">${inssAnalysis.periodos_especiais.length}</div>
                            <div class="card-label">Períodos Especiais</div>
                            <div class="card-detail">Atividades insalubres</div>
                        </div>
                    </div>
                    
                    <div class="inss-card rurais">
                        <div class="card-icon">🌾</div>
                        <div class="card-content">
                            <div class="card-number">${inssAnalysis.periodos_rurais.length}</div>
                            <div class="card-label">Períodos Rurais</div>
                            <div class="card-detail">Atividade rural reconhecida</div>
                        </div>
                    </div>
                    
                    <div class="inss-card impacto">
                        <div class="card-icon">💰</div>
                        <div class="card-content">
                            <div class="card-number">R$ ${inssAnalysis.resumo_inss.impacto_financeiro_estimado.toLocaleString('pt-BR')}</div>
                            <div class="card-label">Impacto Financeiro</div>
                            <div class="card-detail">Estimativa de perdas</div>
                        </div>
                    </div>
                </div>
            </div>
    `;
    
    // 1. Tempo Comum Não Computado
    if (inssAnalysis.tempo_comum_nao_computado.length > 0) {
        html += `
            <div class="inss-section tempo-comum-section">
                <h3>📋 Períodos que o INSS deixou de computar como Tempo Comum</h3>
                <div class="section-description">
                    Períodos de trabalho formal que deveriam estar no seu extrato previdenciário mas não aparecem.
                </div>
                
                ${inssAnalysis.tempo_comum_nao_computado.map((periodo, index) => `
                    <div class="periodo-item tempo-comum-item urgencia-${periodo.urgencia.toLowerCase()}">
                        <div class="periodo-header">
                            <div class="periodo-info">
                                <span class="periodo-id">#${index + 1}</span>
                                <span class="urgencia-badge urgencia-${periodo.urgencia.toLowerCase()}">${periodo.urgencia}</span>
                                <span class="impacto-badge impacto-${periodo.impacto.toLowerCase()}">${periodo.impacto} IMPACTO</span>
                            </div>
                            <div class="periodo-valores">
                                <span class="dias-perdidos">${periodo.dias_perdidos} dias perdidos</span>
                                <span class="valor-estimado">R$ ${periodo.valor_estimado_perdido.toLocaleString('pt-BR')} estimado</span>
                            </div>
                        </div>
                        
                        <div class="periodo-details">
                            <div class="empresa-info">
                                <strong>🏢 Empresa:</strong> ${periodo.period.company}
                            </div>
                            <div class="periodo-info">
                                <strong>📅 Período:</strong> ${formatDate(periodo.period.start_date)} a ${formatDate(periodo.period.end_date)}
                            </div>
                            <div class="motivo-info">
                                <strong>📝 Motivo:</strong> ${periodo.motivo}
                            </div>
                        </div>
                        
                        <div class="recomendacoes-section">
                            <h5>💡 Recomendações:</h5>
                            <ul class="recomendacoes-list">
                                ${periodo.recomendacoes.map(rec => `<li>${rec}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <div class="documentos-section">
                            <h5>📋 Documentos Necessários:</h5>
                            <div class="documentos-grid">
                                ${periodo.documentos_necessarios.map(doc => `<span class="documento-tag">${doc}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // 2. Períodos Omissos
    if (inssAnalysis.periodos_omissos.length > 0) {
        html += `
            <div class="inss-section omissoes-section">
                <h3>📄 Períodos em que o INSS foi omisso no extrato</h3>
                <div class="section-description">
                    Períodos que deveriam constar no extrato previdenciário mas foram omitidos pelo INSS.
                </div>
                
                ${inssAnalysis.periodos_omissos.map((periodo, index) => `
                    <div class="periodo-item omissao-item">
                        <div class="periodo-header">
                            <div class="periodo-info">
                                <span class="periodo-id">#${index + 1}</span>
                                <span class="tipo-badge">${periodo.tipo_omissao.replace('_', ' ')}</span>
                            </div>
                            <div class="prazo-acao">
                                <span class="prazo-badge">Prazo: ${periodo.prazo_para_acao}</span>
                            </div>
                        </div>
                        
                        <div class="periodo-details">
                            <div class="empresa-info">
                                <strong>🏢 Empresa:</strong> ${periodo.period.company}
                            </div>
                            <div class="periodo-info">
                                <strong>📅 Período:</strong> ${formatDate(periodo.period.start_date)} a ${formatDate(periodo.period.end_date)} (${periodo.dias_omitidos} dias)
                            </div>
                            <div class="motivo-info">
                                <strong>🔍 Motivo Provável:</strong> ${periodo.motivo_provavel}
                            </div>
                            <div class="impacto-info">
                                <strong>⚖️ Impacto Legal:</strong> ${periodo.impacto_legal}
                            </div>
                        </div>
                        
                        <div class="acao-section">
                            <h5>🎯 Ação Recomendada:</h5>
                            <p class="acao-text">${periodo.acao_recomendada}</p>
                        </div>
                        
                        <div class="documentos-section">
                            <h5>📋 Documentos Comprobatórios:</h5>
                            <div class="documentos-grid">
                                ${periodo.documentos_comprobatorios.map(doc => `<span class="documento-tag">${doc}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // 3. Períodos Especiais
    if (inssAnalysis.periodos_especiais.length > 0) {
        html += `
            <div class="inss-section especiais-section">
                <h3>⚙️ Períodos enquadrados como Especiais</h3>
                <div class="section-description">
                    Períodos de trabalho em atividades insalubres ou perigosas que podem ter conversão de tempo.
                </div>
                
                ${inssAnalysis.periodos_especiais.map((periodo, index) => `
                    <div class="periodo-item especial-item">
                        <div class="periodo-header">
                            <div class="periodo-info">
                                <span class="periodo-id">#${index + 1}</span>
                                <span class="especial-badge">${periodo.categoria_especial}</span>
                                <span class="conversao-badge">Fator: ${periodo.fator_conversao}x</span>
                            </div>
                            <div class="tempo-convertido">
                                <span class="conversao-info">${periodo.tempo_convertido} dias convertidos</span>
                            </div>
                        </div>
                        
                        <div class="periodo-details">
                            <div class="empresa-info">
                                <strong>🏢 Empresa:</strong> ${periodo.period.company}
                            </div>
                            <div class="periodo-info">
                                <strong>📅 Período:</strong> ${formatDate(periodo.period.start_date)} a ${formatDate(periodo.period.end_date)}
                            </div>
                            <div class="atividade-info">
                                <strong>⚙️ Atividade Especial:</strong> ${periodo.tipo_atividade_especial}
                            </div>
                            <div class="beneficio-info">
                                <strong>🎁 Benefício:</strong> ${periodo.beneficio_adicional}
                            </div>
                        </div>
                        
                        <div class="comprovacao-section">
                            <h5>📋 Comprovação Necessária:</h5>
                            <p class="comprovacao-text">${periodo.comprovacao_necessaria}</p>
                            <span class="status-badge status-${periodo.status_reconhecimento.toLowerCase()}">${periodo.status_reconhecimento.replace('_', ' ')}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // 4. Períodos Rurais
    if (inssAnalysis.periodos_rurais.length > 0) {
        html += `
            <div class="inss-section rurais-section">
                <h3>🌾 Períodos rurais reconhecidos</h3>
                <div class="section-description">
                    Períodos de atividade rural que podem ter regras diferenciadas para aposentadoria.
                </div>
                
                ${inssAnalysis.periodos_rurais.map((periodo, index) => `
                    <div class="periodo-item rural-item">
                        <div class="periodo-header">
                            <div class="periodo-info">
                                <span class="periodo-id">#${index + 1}</span>
                                <span class="rural-badge">${periodo.categoria_segurado.replace('_', ' ')}</span>
                            </div>
                            <div class="idade-info">
                                <span class="idade-badge">${periodo.idade_minima_aplicavel}</span>
                            </div>
                        </div>
                        
                        <div class="periodo-details">
                            <div class="empresa-info">
                                <strong>🏢 Empresa:</strong> ${periodo.period.company}
                            </div>
                            <div class="periodo-info">
                                <strong>📅 Período:</strong> ${formatDate(periodo.period.start_date)} a ${formatDate(periodo.period.end_date)}
                            </div>
                            <div class="atividade-info">
                                <strong>🌾 Atividade Rural:</strong> ${periodo.tipo_atividade_rural.replace('_', ' ')}
                            </div>
                            <div class="regime-info">
                                <strong>📋 Regime:</strong> ${periodo.regime_previdenciario.replace('_', ' ')}
                            </div>
                        </div>
                        
                        <div class="beneficios-section">
                            <h5>🎁 Benefícios Rurais:</h5>
                            <p class="beneficios-text">${periodo.beneficios_rurais}</p>
                        </div>
                        
                        <div class="comprovacao-section">
                            <h5>📋 Comprovação Rural:</h5>
                            <p class="comprovacao-text">${periodo.comprovacao_rural}</p>
                            <span class="status-badge status-${periodo.status_reconhecimento.toLowerCase()}">${periodo.status_reconhecimento.replace('_', ' ')}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

// Inicializar carregamento automático quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    // Carregar comparações automaticamente após 2 segundos
    setTimeout(() => {
        loadAllComparisons();
    }, 2000);
});
