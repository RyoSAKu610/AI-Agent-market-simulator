const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');

// getBld / BUILDING_BY_ID are indexed lookups that replaced linear
// BUILDINGS.find searches. They must return exactly what the search did.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('const MAP_W = ');
const end = html.indexOf('const toCellSet = ');
if (start === -1 || end === -1 || end < start) {
    console.error('Error: could not find the MAP DATA block (MAP_W ... getBld) in index.html');
    process.exit(1);
}

const { MAP_W, MAP_H, BUILDINGS, BUILDING_BY_ID, getBld } = vm.runInNewContext(
    html.slice(start, end) + ';({ MAP_W, MAP_H, BUILDINGS, BUILDING_BY_ID, getBld })',
    {}
);
const linear = (x, y) => BUILDINGS.find(b => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h);

function testGetBldMatchesLinearSearch() {
    let hits = 0;
    for (let y = -2; y < MAP_H + 2; y++) {
        for (let x = -2; x < MAP_W + 2; x++) {
            assert.strictEqual(getBld(x, y), linear(x, y), `getBld(${x}, ${y})`);
            if (getBld(x, y)) hits++;
        }
    }
    [[2.5, 1.5], [-0.5, 3], [MAP_W - 0.5, 2], [undefined, 1], [NaN, NaN], [null, null]].forEach(([x, y]) => {
        assert.strictEqual(getBld(x, y), linear(x, y), `getBld(${x}, ${y})`);
    });
    assert.ok(hits > 0, 'expected some tiles to be covered by buildings');
    console.log(`  ✓ getBld matches linear search on every tile (${hits} building tiles)`);
}

function testBuildingById() {
    BUILDINGS.forEach(b => assert.strictEqual(BUILDING_BY_ID.get(b.id), BUILDINGS.find(x => x.id === b.id), b.id));
    ['', undefined, 'missing', 'constructor'].forEach(id => assert.strictEqual(BUILDING_BY_ID.get(id), undefined, String(id)));
    console.log(`  ✓ BUILDING_BY_ID resolves all ${BUILDINGS.length} buildings`);
}

try {
    console.log('Running building lookup tests...');
    testGetBldMatchesLinearSearch();
    testBuildingById();
    console.log('All building lookup tests passed!');
} catch (error) {
    console.error('Tests failed:');
    console.error(error);
    process.exit(1);
}
