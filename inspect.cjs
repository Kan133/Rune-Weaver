const fs = require('fs');
const path = require('path');
const file = path.join('apps', 'cli', 'dota2', 'commands', 'doctor.ts');
const content = fs.readFileSync(file, 'utf8');
const idx = content.indexOf('console.log("Check Results");');
console.log(content.slice(idx - 80, idx + 120));
