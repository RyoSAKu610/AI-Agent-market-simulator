// Builds dist/zipangu-single.html: the whole explorer in one file that works
// offline. Every world/*.json and chapter markdown is inlined, every js module
// is folded into one module script, and the css goes into a <style>.
//
//   node tools/build-single.mjs
//   node tools/build-single.mjs --check   # only bundle the modules and parse the result (CI)
//
// The modules use a small, regular import/export style, so the bundler is a
// few regular expressions rather than a dependency.

import { readFileSync, writeFileSync, appendFileSync, statSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(join(root, rel), 'utf8');

// ------------------------------------------------------------------ world and chapters

const STEMS = ['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library'];

function collectWorld() {
    const world = {};
    for (const stem of STEMS) world[stem] = JSON.parse(read(`world/${stem}.json`));
    world.hidden = JSON.parse(read('world/hidden.json'));
    const texts = join(root, 'world', 'library.texts.json');
    world.texts = existsSync(texts) ? JSON.parse(readFileSync(texts, 'utf8')) : { works: {} };
    return world;
}

function collectDocs() {
    const docs = {};
    for (const kind of ['eras', 'realms']) {
        const dir = join(root, 'docs', kind);
        if (!existsSync(dir)) continue;
        for (const file of readdirSync(dir).filter(f => f.endsWith('.md'))) docs[`${kind}/${basename(file, '.md')}`] = readFileSync(join(dir, file), 'utf8');
    }
    if (existsSync(join(root, 'docs', 'CORRECTIONS.md'))) docs.CORRECTIONS = read('docs/CORRECTIONS.md');
    return docs;
}

// Safe to place inside a <script> element.
const inlineJson = value => JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

// ------------------------------------------------------------------ module bundling

const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*'\.\/([^']+)';?[ \t]*$/gm;
const EXPORT_DECL_RE = /^export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z0-9_$]+)/gm;
const EXPORT_LIST_RE = /^export\s*\{([^}]*)\};?[ \t]*$/gm;
const EXPORT_FROM_RE = /^export\s*\{([^}]*)\}\s*from\s*'\.\/([^']+)';?[ \t]*$/gm;
// import('./chain.js') of a module of ours: it is in the bundle already
const DYNAMIC_RE = /\bimport\(\s*'\.\/([^']+)'\s*\)/g;

function parseModule(file) {
    const src = read(`js/${file}`);
    const deps = [];
    for (const re of [IMPORT_RE, EXPORT_FROM_RE]) for (const m of src.matchAll(re)) deps.push(m[2]);
    for (const m of src.matchAll(DYNAMIC_RE)) deps.push(m[1]);
    return { file, src, deps };
}

function order(entry) {
    const seen = new Set(), out = [];
    const visit = file => {
        if (seen.has(file)) return;
        seen.add(file);
        const mod = parseModule(file);
        mod.deps.forEach(visit);
        out.push(mod);
    };
    visit(entry);
    return out;
}

const idOf = file => '__m_' + basename(file, '.js').replace(/[^A-Za-z0-9_]/g, '_');

function wrap(mod) {
    const exported = [];
    let body = mod.src
        .replace(EXPORT_FROM_RE, (_, names, from) => {
            const pairs = names.split(',').map(s => s.trim()).filter(Boolean).map(s => s.split(/\s+as\s+/));
            pairs.forEach(([a, b]) => exported.push(b ? `${b}: ${idOf(from)}.${a}` : `${a}: ${idOf(from)}.${a}`));
            return '';
        })
        .replace(DYNAMIC_RE, (_, from) => `Promise.resolve(${idOf(from)})`)
        .replace(IMPORT_RE, (_, names, from) => {
            const list = names.split(',').map(s => s.trim()).filter(Boolean)
                .map(s => { const [a, b] = s.split(/\s+as\s+/); return b ? `${a}: ${b}` : a; });
            return `const { ${list.join(', ')} } = ${idOf(from)};`;
        })
        .replace(EXPORT_LIST_RE, (_, names) => {
            names.split(',').map(s => s.trim()).filter(Boolean).forEach(s => {
                const [a, b] = s.split(/\s+as\s+/);
                exported.push(b ? `${b}: ${a}` : a);
            });
            return '';
        })
        .replace(EXPORT_DECL_RE, (match, name) => { exported.push(name); return match.replace(/^export\s+/, ''); });
    if (/^export\s+default/m.test(body) || /import\.meta/.test(body)) throw new Error(`${mod.file}: default exports and import.meta are not supported by the bundler`);
    if (/^import\s/m.test(body)) throw new Error(`${mod.file}: an import the bundler could not read`);
    return `const ${idOf(mod.file)} = (() => {\n${body}\nreturn { ${exported.join(', ')} };\n})();`;
}

// The entry module has no exports; wrapping it just runs it, last.
const bundle = entry => order(entry).map(wrap).join('\n\n');

// ------------------------------------------------------------------ assemble

const { VISUALS, visualKey } = await import('data:text/javascript;base64,' + Buffer.from(read('js/visual-manifest.js')).toString('base64'));
function* visualFiles() {
    for (const visual of VISUALS.filter(v => v.status === 'ready')) {
        for (const [suffix, file] of [['', visual.file], [':companion', visual.companion], [':poses', visual.poses]]) {
            if (!file) continue;
            const path = join(root, 'assets/visuals', file);
            if (!existsSync(path)) throw new Error('Reviewed visual is missing: ' + file);
            yield [visualKey(visual) + suffix, path];
        }
    }
}

// Keep original PNGs in separate non-executable blocks. Blob URLs avoid making
// several copies of hundreds of megabytes of base64 in image attributes.
const visualLoader = `window.__ZIPANGU_VISUALS__ = {};
for (const node of document.querySelectorAll('script[data-visual-key]')) {
    const key = node.dataset.visualKey;
    Object.defineProperty(window.__ZIPANGU_VISUALS__, key, { configurable: true, get() {
        const raw = atob(node.textContent.trim());
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
        Object.defineProperty(window.__ZIPANGU_VISUALS__, key, { value: url });
        node.remove();
        return url;
    } });
}`;

// The bundled modules must parse: node --check on a copy in the temp folder.
function checkBundle() {
    const file = join(tmpdir(), `zipangu-bundle-${process.pid}.mjs`);
    writeFileSync(file, bundle('app.js'));
    const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    rmSync(file, { force: true });
    if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
    console.log('single-file bundle parses');
}

function build() {
    // The single-file artifact uses installed serif/monospace fallbacks offline.
    let html = read('index.html').replace(/^<link[^\n]+https:\/\/fonts\.(?:googleapis|gstatic)\.com[^\n]*>\n/gm, '')
        // the offline copy inlines its scripts, which the site's Content-Security-Policy forbids
        .replace(/^<!-- Only this site[\s\S]*?-->\n<meta http-equiv="Content-Security-Policy"[^\n]*>\n/m, '');
    const css = read('style.css');
    const cssTag = '<link rel="stylesheet" href="style.css">';
    const jsTag = '<script type="module" src="js/app.js"></script>';
    if (!html.includes(cssTag) || !html.includes(jsTag)) throw new Error('index.html no longer has the stylesheet/script tags the builder replaces');

    const code = bundle('app.js');
    const data = `<script>window.__ZIPANGU_WORLD__ = ${inlineJson(collectWorld())};\nwindow.__ZIPANGU_DOCS__ = ${inlineJson(collectDocs())};\n${visualLoader}</script>`;
    html = html
        .replace(cssTag, () => `<style>\n${css}\n</style>`)
        .replace(jsTag, () => `__ZIPANGU_PNG_BLOCKS__${data}\n<script type="module">\n${code.replace(/<\/script/gi, '<\\/script')}\n</script>`);

    mkdirSync(join(root, 'dist'), { recursive: true });
    const out = join(root, 'dist', 'zipangu-single.html');
    const files = [...visualFiles()]; // Validate before replacing the artifact.
    const [before, after] = html.split('__ZIPANGU_PNG_BLOCKS__');
    writeFileSync(out, before);
    for (const [key, path] of files) appendFileSync(out, `<script type="application/octet-stream" data-visual-key="${key}">${readFileSync(path).toString('base64')}</script>\n`);
    appendFileSync(out, after);
    console.log(`wrote ${out} (${(statSync(out).size / 1024).toFixed(0)} KB, ${files.length} original PNG blocks)`);
}

if (process.argv.includes('--check')) checkBundle();
else build();
