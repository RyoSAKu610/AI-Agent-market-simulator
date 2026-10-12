const fs = require('fs');
const path = require('path');
const assert = require('assert');
const file = fs.readFileSync(path.join(__dirname, '..', 'neon-mythos-agent-thinking.js'), 'utf8');
assert.ok(file.includes("const THINK_ENDPOINT='';"), 'do not hardcode an unverified Vercel domain');
assert.ok(file.includes('if(!THINK_ENDPOINT)'), 'must explain that cloud AI is disconnected until configured');
assert.ok(file.includes("fetch(THINK_ENDPOINT"), 'must use the fixed configured endpoint');
console.log('Agent endpoint configuration checks passed.');
