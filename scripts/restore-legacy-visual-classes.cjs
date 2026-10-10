const fs = require('node:fs');
const cp = require('node:child_process');
const ts = require('typescript');

const printer = ts.createPrinter({ removeComments: true });
const visual = /^(?:rounded(?:-|$)|shadow(?:-|$)|border(?:-|$)|[pm][trblxyse]?-(?:\d|\[)|gap(?:-[xy])?-|space-[xy]-)/;
function classes(value) {
  return value.split(/\s+/).filter(Boolean);
}
function index(source, file) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const entries = new Map();
  function visit(node) {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const opening = ts.isJsxElement(node) ? node.openingElement : node;
      const attr = opening.attributes.properties.find(a => ts.isJsxAttribute(a) && a.name.text === 'className');
      if (attr && attr.initializer && ts.isStringLiteral(attr.initializer)) {
        const result = ts.transform(node, [context => root => {
          function strip(n) {
            if (ts.isJsxAttributes(n)) return ts.factory.updateJsxAttributes(n, n.properties.filter(a => !(ts.isJsxAttribute(a) && a.name.text === 'className')));
            return ts.visitEachChild(n, strip, context);
          }
          return ts.visitNode(root, strip);
        }]);
        const key = printer.printNode(ts.EmitHint.Unspecified, result.transformed[0], tree);
        result.dispose();
        const list = entries.get(key) || [];
        list.push({ attr, value: attr.initializer.text });
        entries.set(key, list);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return { tree, entries };
}

const files = cp.execFileSync('git', ['diff', '--name-only', '--', 'client/src'], { encoding: 'utf8' }).trim().split(/\r?\n/)
  .filter(file => file.endsWith('.tsx') && /client\/src\/(features\/(accounting|attendance|salary|admin|kf)|pages)\//.test(file))
  .filter(file => !/(Sheet|Report|Followup|Examination|Prescription|Referral|Pentacam)/i.test(file));
const report = [];
for (const file of files) {
  let old;
  try { old = cp.execFileSync('git', ['show', `HEAD:${file}`], { encoding: 'utf8' }); } catch { continue; }
  const source = fs.readFileSync(file, 'utf8');
  const before = index(old, file);
  const current = index(source, file);
  const edits = [];
  for (const [key, matches] of current.entries) {
    const originals = before.entries.get(key);
    if (matches.length !== 1 || originals?.length !== 1) continue;
    const match = matches[0];
    const legacy = classes(originals[0].value).filter(token => visual.test(token));
    const existing = classes(match.value);
    if ([...existing.filter(token => visual.test(token))].sort().join(' ') === [...legacy].sort().join(' ')) continue;
    const next = [...existing.filter(token => !visual.test(token)), ...legacy].join(' ');
    if (next === match.value || !legacy.length) continue;
    const start = match.attr.initializer.getStart(current.tree);
    const end = match.attr.initializer.end;
    edits.push({ start, end, replacement: JSON.stringify(next) });
  }
  if (!edits.length) continue;
  let next = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) next = next.slice(0, edit.start) + edit.replacement + next.slice(edit.end);
  // Only className string literals may differ; all executable code stays intact.
  function withoutClasses(text) {
    const parsed = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const ranges = [];
    function visit(node) {
      if (ts.isJsxAttribute(node) && node.name.text === 'className' && node.initializer && ts.isStringLiteral(node.initializer)) ranges.push([node.initializer.getStart(parsed), node.initializer.end]);
      ts.forEachChild(node, visit);
    }
    visit(parsed);
    for (const [start, end] of ranges.sort((a, b) => b[0] - a[0])) text = text.slice(0, start) + '""' + text.slice(end);
    return text;
  }
  if (withoutClasses(source) !== withoutClasses(next)) throw new Error(`Non-visual change: ${file}`);
  if (process.argv.includes('--apply')) fs.writeFileSync(file, next);
  report.push({ file, restoredClasses: edits.length });
}
console.log(JSON.stringify({ applied: process.argv.includes('--apply'), files: report.length, changes: report.reduce((n, r) => n + r.restoredClasses, 0), report }, null, 2));
