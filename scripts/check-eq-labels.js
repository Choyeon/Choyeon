const src = require('fs').readFileSync('./src/constants/index.ts', 'utf8');
const re = /(\w[\w ']*):\s*\{\s*zh:\s*'([^']+)',\s*en:\s*'([^']+)'/g;
let m;
while ((m = re.exec(src))) {
  if (m[2] === m[3] && /[a-zA-Z]/.test(m[2])) {
    console.log('SAME:', m[1], 'zh=en=' + m[2]);
  }
}
// Also check quoted keys like 'medicine ball'
const re2 = /'([^']+)':\s*\{\s*zh:\s*'([^']+)',\s*en:\s*'([^']+)'/g;
while ((m = re2.exec(src))) {
  if (m[2] === m[3] && /[a-zA-Z]/.test(m[2])) {
    console.log('QUOTED SAME:', m[1], 'zh=en=' + m[2]);
  }
}
