Set-Location 'D:\Rune Weaver'
$nodeCmd = @"
const { refreshBridge } = require('./adapters/dota2/bridge/index');
const { loadWorkspace } = require('./core/workspace/manager');
const ws = loadWorkspace('D:\\test1');
const result = refreshBridge('D:\\test1', ws);
console.log(JSON.stringify(result, null, 2));
"@

$env:NODE_NO_READLINE = "1"
npx tsx -e $nodeCmd