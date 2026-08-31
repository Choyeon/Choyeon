const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) results.push(...walk(p));
    else if (/\.(tsx?|jsx?)$/.test(p)) results.push(p);
  }
  return results;
}

const files = walk('app').concat(walk('src'));
const tKeys = new Set();
const re = /t\(\s*['"]([^'"]+)['"]\s*\)/g;
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = re.exec(src))) tKeys.add(m[1]);
}

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

// Eval zh.ts and en.ts
const zhSrc = fs.readFileSync('./src/i18n/translations/zh.ts', 'utf8');
const enSrc = fs.readFileSync('./src/i18n/translations/en.ts', 'utf8');

const tmpZh = path.join(require('os').tmpdir(), 'zh-t.js');
const tmpEn = path.join(require('os').tmpdir(), 'en-t.js');
fs.writeFileSync(tmpZh, zhSrc.replace('export default', 'module.exports =').replace(/ as const/g, '').replace(/ as \w+/g, ''));
fs.writeFileSync(tmpEn, enSrc.replace('export default', 'module.exports =').replace(/ as const/g, '').replace(/ as \w+/g, ''));

const zhFlat = flatten(require(tmpZh));
const enFlat = flatten(require(tmpEn));

const missingZh = [...tKeys].filter(k => !(k in zhFlat)).sort();
const missingEn = [...tKeys].filter(k => !(k in enFlat)).sort();

console.log('Total t() keys used:', tKeys.size);
console.log('zh.ts missing:', missingZh.length ? missingZh.join(', ') : 'NONE');
console.log('en.ts missing:', missingEn.length ? missingEn.join(', ') : 'NONE');
