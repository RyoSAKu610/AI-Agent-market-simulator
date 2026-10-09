// Builds dist/zipangu-single.html: the whole explorer in one file that works
// offline. Every world/*.json and chapter markdown is inlined, every js module
// is folded into one module script, and the css goes into a <style>.
//
//   node tools/build-single.mjs
//
// The modules use a small, regular import/export style, so the bundler is a
// few regular expressions rather than a dependency.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => readFileSync(join(root, rel), 'utf8');

// ------------------------------------------------------------------ world and chapters

const STEMS = ['world', 'eras', 'realms', 'districts', 'creatures', 'goods', 'currencies', 'agents', 'events', 'library'];

function collectWorld() {
    const world = {};
    for (const stem of STEMS) world[stem] = JSON.parse(read(`world/${stem}.json`));
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

function parseModule(file) {
    const src = read(`js/${file}`);
    const deps = [];
    for (const m of src.matchAll(IMPORT_RE)) deps.push(m[2]);
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

function build() {
    let html = read('index.html');
    const css = read('style.css');
    const cssTag = '<link rel="stylesheet" href="style.css">';
    const jsTag = '<script type="module" src="js/app.js"></script>';
    if (!html.includes(cssTag) || !html.includes(jsTag)) throw new Error('index.html no longer has the stylesheet/script tags the builder replaces');

    const code = bundle('app.js');
    const data = `<script>window.__ZIPANGU_WORLD__ = ${inlineJson(collectWorld())};\nwindow.__ZIPANGU_DOCS__ = ${inlineJson(collectDocs())};</script>`;
    html = html
        .replace(cssTag, () => `<style>\n${css}\n</style>`)
        .replace(jsTag, () => `${data}\n<script type="module">\n${code.replace(/<\/script/gi, '<\\/script')}\n</script>`);

    mkdirSync(join(root, 'dist'), { recursive: true });
    const out = join(root, 'dist', 'zipangu-single.html');
    writeFileSync(out, html);
    console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`);
}

build();
