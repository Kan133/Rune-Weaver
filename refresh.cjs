const { refreshBridge } = require('D:/Rune Weaver/adapters/dota2/bridge/index');
const { loadWorkspace } = require('D:/Rune Weaver/core/workspace/manager');
const ws = loadWorkspace('D:/test1');
const result = refreshBridge('D:/test1', ws);
console.log(JSON.stringify(result, null, 2));