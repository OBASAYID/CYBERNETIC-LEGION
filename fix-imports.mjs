import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Fix: from "./something" -> from "./something.js"
    content = content.replace(/from\s+(['"`])(\.[./][^'"`.]*?)(['"`])/g, (match, quote1, importPath, quote2) => {
      if (importPath.endsWith('.js') || importPath.endsWith('.json') || importPath.endsWith('/')) {
        return match;
      }
      return `from ${quote1}${importPath}.js${quote2}`;
    });
    
    if (content \!== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✓ ${path.relative(__dirname, filePath)}`);
      return 1;
    }
  } catch (err) {
    console.error(`✗ Error: ${err.message}`);
  }
  return 0;
}

function walkDir(dir, extensions) {
  if (\!fs.existsSync(dir)) return 0;
  let count = 0;
  
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory() && \!file.startsWith('.') && file \!== 'node_modules') {
          count += walkDir(fullPath, extensions);
        } else if (extensions.some(ext => file.endsWith(ext))) {
          count += fixImportsInFile(fullPath);
        }
      } catch (err) {}
    });
  } catch (err) {
    console.error(`Cannot read dir: ${err.message}`);
  }
  return count;
}

console.log('Fixing .js import extensions...\n');
let total = 0;
total += walkDir('./server', ['.ts', '.tsx']);
total += walkDir('./shared', ['.ts', '.tsx']);
total += walkDir('./client/src', ['.ts', '.tsx']);
console.log(`\nFixed ${total} files\! Rebuilding now...`);
