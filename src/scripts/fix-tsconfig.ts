import * as fs from 'fs';
import * as path from 'path';

/**
 * Script para corrigir tsconfig.json
 * Exclui arquivos do prisma/seed.ts do build
 */

const rootDir = path.resolve(__dirname, '../..');
const tsconfigPath = path.join(rootDir, 'tsconfig.json');

console.log(`📝 Fixing tsconfig.json at: ${tsconfigPath}`);

try {
    const tsconfigContent = fs.readFileSync(tsconfigPath, 'utf-8');
    const tsconfig = JSON.parse(tsconfigContent);

    // Adicionar exclusões se não existirem
    if (!tsconfig.exclude) {
        tsconfig.exclude = [];
    }

    // Garantir que o diretório prisma está excluído exceto schema.prisma
    const excludes = [
        "node_modules",
        "dist",
        "**/*.test.ts",
        "**/*.spec.ts",
        "prisma/**/*.ts",
        "prisma/**/*.js"
    ];

    excludes.forEach(pattern => {
        if (!tsconfig.exclude.includes(pattern)) {
            tsconfig.exclude.push(pattern);
        }
    });

    // Salvar o arquivo atualizado
    fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));

    console.log('✅ tsconfig.json atualizado com sucesso!');
    console.log('   Exclusões adicionadas:');
    tsconfig.exclude.forEach((ex: string) => console.log(`   - ${ex}`));
} catch (error) {
    console.error('❌ Erro ao atualizar tsconfig.json:', error);
    process.exit(1);
}
