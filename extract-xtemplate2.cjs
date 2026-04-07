const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Try using tar/7z or just copy approach
try {
  // Use .NET System.IO.Compression via PowerShell with -NoProfile
  const result = execSync(
    `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::ExtractToDirectory('D:\\\\x-template-master.zip', 'D:\\\\x-template')"`,
    { stdio: 'pipe', encoding: 'utf-8' }
  );
  console.log('Extracted successfully');
} catch(e) {
  console.error('Error:', e.stderr || e.message);
}
