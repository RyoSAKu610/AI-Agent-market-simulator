const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const endpoint = fs.readFileSync(path.join(root, 'api/agent-think.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'neon-mythos-agent-thinking.js'), 'utf8');
const experience = fs.readFileSync(path.join(root, 'neon-mythos-experience.js'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

assert.ok(endpoint.includes('process.env.GROQ_API_KEY'), 'Groq key must be server-side');
assert.ok(!client.includes('GROQ_API_KEY'), 'Groq key must not appear in browser client');
assert.ok(endpoint.includes('"openai/gpt-oss-120b"'), 'must default to Groq GPT-OSS 120B');
assert.ok(endpoint.includes('return json(fallback(goal, task))'), 'provider failures must use safe fallback');
assert.ok(endpoint.includes('ALLOWED_GOALS.has(body.goal)'), 'goals must be allowlisted');
assert.ok(endpoint.includes('MAX_TEXT'), 'task size must be bounded');
assert.ok(client.includes('credentials:\'omit\''), 'cross-origin calls must not send cookies');
assert.ok(client.includes('THINK_ENDPOINT'), 'client must use fixed endpoint');
assert.ok(experience.includes('loadAgentThinking()'), 'optional client layer must be loaded');
assert.ok(sw.includes('neon-mythos-agent-thinking.js'), 'PWA cache shell must include new layer');
assert.ok(sw.includes('neon-mythos-shell-v5'), 'PWA cache version must be updated');
console.log('Agent thinking checks passed.');
