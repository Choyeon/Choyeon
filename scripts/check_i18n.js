const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Walk and collect all source files
function walk(dir, exts, files) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (item.name === 'node_modules' || item.name === '__pycache__' || item.name === '.expo') continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full, exts, files);
    else if (exts.includes(path.extname(item.name))) files.push(full);
  }
}

const files = [];
walk('app', ['.tsx', '.ts'], files);
walk('src', ['.tsx', '.ts'], files);

// Extract t('key') and t("key") calls
const tPattern = /\bt\s*\(\s*['"]([^'"]+)['"]/g;
const usedKeys = new Set();
for (const f of files) {
  const content = fs.readFileSync(f, 'utf-8');
  let m;
  while ((m = tPattern.exec(content))) usedKeys.add(m[1]);
}
console.log(`Found ${usedKeys.size} unique t() calls across ${files.length} files`);

// Load translations via vm — strip TS syntax
function loadTsObject(filepath) {
  let src = fs.readFileSync(filepath, 'utf-8');
  // Remove export const XXX = 
  src = src.replace(/^export\s+const\s+\w+\s*=\s*/m, 'module.exports = ');
  // Remove 'as const' at end
  src = src.replace(/\s+as\s+const\s*;?\s*$/, ';');
  // Remove // and /* */ comments
  src = src.replace(/\/\/.*$/gm, '');
  src = src.replace(/\/\*[\s\S]*?\*\//g, '');
  
  const sandbox = { module: { exports: {} }, exports: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  return sandbox.module.exports;
}

function flatten(obj, prefix = '') {
  const out = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const sub of flatten(v, full)) out.add(sub);
    } else {
      out.add(full);
    }
  }
  return out;
}

const zhObj = loadTsObject('src/i18n/translations/zh.ts');
const enObj = loadTsObject('src/i18n/translations/en.ts');

const zhKeys = flatten(zhObj);
const enKeys = flatten(enObj);

console.log(`zh.ts has ${zhKeys.size} keys`);
console.log(`en.ts has ${enKeys.size} keys`);

const missingZh = [...usedKeys].filter(k => !zhKeys.has(k)).sort();
const missingEn = [...usedKeys].filter(k => !enKeys.has(k)).sort();

if (missingZh.length) {
  console.log(`\n=== MISSING IN zh.ts (${missingZh.length}) ===`);
  missingZh.forEach(k => console.log(`  ${k}`));
}
if (missingEn.length) {
  console.log(`\n=== MISSING IN en.ts (${missingEn.length}) ===`);
  missingEn.forEach(k => console.log(`  ${k}`));
}
if (!missingZh.length && !missingEn.length) {
  console.log('\n✅ All t() calls have translations in both zh.ts and en.ts!');
}

// Check zh/en symmetry
const onlyZh = [...zhKeys].filter(k => !enKeys.has(k)).sort();
const onlyEn = [...enKeys].filter(k => !zhKeys.has(k)).sort();
if (onlyZh.length) console.log(`\nOnly in zh (${onlyZh.length}): ${onlyZh.join(', ')}`);
if (onlyEn.length) console.log(`\nOnly in en (${onlyEn.length}): ${onlyEn.join(', ')}`);
