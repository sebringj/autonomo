const fs = require('fs');
const path = require('path');
function searchFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (['node_modules', 'dist', 'coverage', '.git', '.expo'].includes(file)) continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchFiles(fullPath);
    } else if (file.match(/\.(ts|tsx|js|jsx|json|md|html)$/)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('github:sebringj/autonomo#') || content.includes('github:sebringj/autonomo/')) {
        console.log('FOUND in ' + fullPath);
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('github:sebringj/autonomo#') || lines[i].includes('github:sebringj/autonomo/')) {
            console.log('  Line ' + (i + 1) + ': ' + lines[i].trim());
          }
        }
      }
    }
  }
}
searchFiles('.');
