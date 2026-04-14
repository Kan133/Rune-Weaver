const fs = require('fs');
const path = require('path');
const file = path.join('apps','cli','dota2','commands','doctor.ts');
const content = fs.readFileSync(file,'utf8');
const idx = content.indexOf('Scenario: ${scenarioName}');
console.log(JSON.stringify(content.slice(idx-60, idx+60)));
