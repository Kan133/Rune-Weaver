const { execSync } = require('child_process');
try {
  execSync('powershell -Command "Expand-Archive -Path \'D:\\x-template-master.zip\' -DestinationPath \'D:\\x-template\' -Force"', { stdio: 'inherit' });
  console.log('Extracted to D:\\x-template');
} catch(e) {
  console.error('Extract failed:', e.message);
}
