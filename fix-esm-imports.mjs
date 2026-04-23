#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));

let totalFixed = 0;

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Match: from "./..." or from '../'
    // Replace with: from ".../. js" if not already .js or .json
    const lines = content.split('\n');
    const fixed = lines.map(line => {
      // Skip comments
      if (line.trim().startsWith('//')) return line;
      
      // Look for import statements
      if (!line.includes('from')) return line;
      
      // Replace: from "./module" with from "./module.js" (unless already .js, .json, or ends with /)
      return line.replace(/from\s+(['"`])(\.[./][^'"`.]*?)(['"`])/g, (match, q1, mod, q2) => {
        if (mod.endsWith('.js') || mod.endsWith('.json') || mod.endsWith('/')) {
          return match;
        }
        return `from ${q1}${mod}.js${q2}`;
      });
    });
    
    const newContent = fixed.join('\n');
    if (newContent !== original) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      totalFixed++;
      console.log(`  ✓ ${path.relative(__dir, filePath)}`);
      return true;
    }
  } catch (err) {
    console.error(`  ✗ ${path.relative(__dir, filePath)}: ${err.message}`);
  }
  return false;
}

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  
  try {
    const entries = fs.readdirSync(dir);
    entries.forEach(entry => {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist') {
          scanDir(fullPath);
        }
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        fixFile(fullPath);
      }
    });
  } catch (err) {
    console.error(`Error scanning ${dir}: ${err.message}`);
  }
}

console.log('Fixing ESM imports by adding .js extensions...\n');
console.log('Scanning server/');
scanDir(path.join(__dir, 'server'));
console.log('Scanning shared/');
scanDir(path.join(__dir, 'shared'));
console.log('Scanning client/src/');
scanDir(path.join(__dir, 'client', 'src'));

console.log(`\n✓ Fixed ${totalFixed} files\nNow run: npm run build`);
