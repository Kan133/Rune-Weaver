const fs = require('fs');
const path = require('path');

const serverIndexDir = 'D:/test1/game/scripts/src/rune_weaver/generated/server';
const serverIndexPath = path.join(serverIndexDir, 'index.ts');

const files = fs.readdirSync(serverIndexDir)
  .filter(f => f.endsWith('.ts') && f !== 'index.ts')
  .map(f => f.replace('.ts', ''));

const moduleList = JSON.stringify(files);
const content = `/**
 * Rune Weaver Generated Server Modules
 * Auto-generated index file
 */

// Dynamic module loading to avoid Lua local variable limit
const moduleFileNames = ${moduleList};
for (const fileName of moduleFileNames) {
  require('./' + fileName);
}

export function activateRuneWeaverModules(): void {
  print('[Rune Weaver] Activating generated modules...');
  print('[Rune Weaver] All modules activated');
}
`;

fs.writeFileSync(serverIndexPath, content, 'utf-8');
console.log('Updated index.ts with', files.length, 'modules');
console.log('First 5 modules:', files.slice(0, 5));