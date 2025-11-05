/**
 * 🧹 LIMPEZA DE UPLOADS - Remover arquivos corrompidos
 */

const fs = require('fs');
const path = require('path');

function cleanupUploads() {
    console.log('🧹 Iniciando limpeza de uploads...\n');

    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
        console.log('❌ Pasta uploads não encontrada');
        return;
    }

    const files = fs.readdirSync(uploadsDir);
    console.log(`📁 ${files.length} arquivos encontrados na pasta uploads`);

    let removedCount = 0;
    let totalSize = 0;

    files.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        console.log(`📄 ${file} - ${(stats.size / 1024).toFixed(2)} KB`);
        
        // Remover arquivos muito pequenos (provavelmente corrompidos)
        if (stats.size < 100) { // Menos de 100 bytes
            console.log(`🗑️  Removendo arquivo muito pequeno: ${file}`);
            fs.unlinkSync(filePath);
            removedCount++;
        }
        // Remover arquivos muito grandes (mais de 50MB)
        else if (stats.size > 50 * 1024 * 1024) {
            console.log(`🗑️  Removendo arquivo muito grande: ${file}`);
            fs.unlinkSync(filePath);
            removedCount++;
        }
        // Remover arquivos antigos (mais de 1 dia)
        else if (Date.now() - stats.mtime.getTime() > 24 * 60 * 60 * 1000) {
            console.log(`🗑️  Removendo arquivo antigo: ${file}`);
            fs.unlinkSync(filePath);
            removedCount++;
        } else {
            totalSize += stats.size;
        }
    });

    console.log(`\n✅ Limpeza concluída:`);
    console.log(`   📄 Arquivos removidos: ${removedCount}`);
    console.log(`   📄 Arquivos restantes: ${files.length - removedCount}`);
    console.log(`   💾 Tamanho total: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
}

cleanupUploads();
