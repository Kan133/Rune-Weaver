import { refreshBridge } from './adapters/dota2/bridge/index';
import { loadWorkspace } from './core/workspace/manager';

const wsResult = loadWorkspace('D:/test1');
if (!wsResult.workspace) {
    console.error('Failed to load workspace:', wsResult.issues);
    process.exit(1);
}
const result = refreshBridge('D:/test1', wsResult.workspace);
console.log(JSON.stringify(result, null, 2));