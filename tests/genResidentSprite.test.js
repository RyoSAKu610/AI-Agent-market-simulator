const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

// 1. Read index.html and extract the genResidentSprite function
const html = fs.readFileSync('index.html', 'utf8');
const spriteFuncMatch = html.match(/const genResidentSprite=\(hairStyle,hc,sc,bc,ac,ec\)=>{[\s\S]*?\n};/);

if (!spriteFuncMatch) {
    console.error('Error: Could not find genResidentSprite function in index.html');
    process.exit(1);
}

const spriteFuncCode = spriteFuncMatch[0];

// 2. Set up the VM context to execute the function
const context = {};
vm.createContext(context);
// Use var instead of const to make it available in the context or just run it as an expression
const script = new vm.Script(spriteFuncCode.replace('const genResidentSprite', 'genResidentSprite'));
script.runInContext(context);
const genResidentSprite = context.genResidentSprite;

// 3. Test Cases
function testGenResidentSprite() {
    console.log('Running tests for genResidentSprite...');

    // Test colors
    const hc = '#111', sc = '#222', bc = '#333', ac = '#444', ec = '#555';

    // a. Test Palette mapping
    const resultShort = genResidentSprite('short', hc, sc, bc, ac, ec);
    const expectedPalette = {
        h: hc,
        H: ac,
        s: sc,
        e: ec,
        b: bc,
        B: ac,
        k: '#111'
    };

    // Using JSON.stringify comparison because deepStrictEqual can be sensitive to property order or other hidden traits
    assert.strictEqual(JSON.stringify(resultShort.palette), JSON.stringify(expectedPalette), 'Palette mapping should be correct');

    // b. Test default eye color
    const resultDefaultEye = genResidentSprite('short', hc, sc, bc, ac);
    assert.strictEqual(resultDefaultEye.palette.e, '#111', 'Default eye color should be #111');

    // c. Test different hair styles
    const styles = ['short', 'long', 'spiky', 'pony', 'hood', 'ears', 'hat', 'bald'];
    const heads = {
        short: "..hhhh..\n.hhhhhh.\n.hssssh.",
        long: ".hhhhhh.\nhhhhhhhh\nhHsssshH",
        spiky: "h.hhhh.h\n.hhhhhh.\n.hssssh.",
        pony: "..hhhhh.\n.hhhhhh.\n.hssssh.",
        hood: "..HHHH..\n.HHHHHH.\nHHssssHH",
        ears: "..hh.hh.\n.hhhhhh.\n.hssssh.",
        hat: ".HHHHHH.\n.Hhhhh..\n.hssssh.",
        bald: "........\n..ssss..\n.ssssss."
    };

    const face = "..sesse.\n..ssss..\n...ss...";
    const bodyI = `.bbbbbb.\n.bBbbBb.\n..bbbb..\n..b..b..\n..B..B..`;
    const bodyW = `.bbbbbb.\n.bBbbBb.\n..bbbb..\n.b....b.\n.B....B.`;

    styles.forEach(style => {
        const res = genResidentSprite(style, hc, sc, bc, ac, ec);
        const expectedIdle = heads[style] + "\n" + face + "\n" + bodyI;
        const expectedWalk = heads[style] + "\n" + face + "\n" + bodyW;

        assert.strictEqual(res.idle, expectedIdle, `Idle sprite for style ${style} should be correct`);
        assert.strictEqual(res.walk, expectedWalk, `Walk sprite for style ${style} should be correct`);
        console.log(`  ✓ Style: ${style} passed`);
    });

    // d. Test fallback hair style
    const resFallback = genResidentSprite('unknown_style', hc, sc, bc, ac, ec);
    const expectedIdleShort = heads.short + "\n" + face + "\n" + bodyI;
    assert.strictEqual(resFallback.idle, expectedIdleShort, 'Unknown style should fallback to short');
    console.log('  ✓ Fallback style passed');

    console.log('All tests for genResidentSprite passed!');
}

try {
    testGenResidentSprite();
} catch (error) {
    console.error('Tests failed:');
    console.error(error);
    process.exit(1);
}
