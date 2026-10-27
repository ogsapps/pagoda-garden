#!/usr/bin/env node
/**
 * Static-site checks for pagoda-garden.
 *
 * There is no build step, so CI validates the committed files that GitHub
 * Pages will actually serve: every HTML page must be well-formed enough to
 * render, and every local link/asset reference must resolve to a real file.
 *
 * Zero dependencies on purpose — the site itself has none.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', '.github', 'node_modules']);
const failures = [];
const checkedFiles = [];

function fail(file, message) {
  failures.push(`${relative(root, file).split('\\').join('/')}: ${message}`);
}

/** Collect every .html file under the repository root. */
function collectHtml(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) collectHtml(path, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(path);
  }
  return out;
}

/** Extract opening tags, so attribute scanning never sees inline JavaScript. */
function tags(html) {
  return html.match(/<[a-zA-Z][^>]*>/g) || [];
}

function attributes(tag) {
  const out = [];
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let match;
  while ((match = re.exec(tag)) !== null) {
    out.push([match[1].toLowerCase(), match[2] ?? match[3] ?? '']);
  }
  return out;
}

/** Resolve a reference from an HTML file to a path on disk, or null if not local. */
function resolveLocal(fromFile, ref) {
  const value = ref.trim();
  if (!value) return null;
  if (/^(?:https?:|mailto:|tel:|data:|javascript:|blob:)/i.test(value)) return null;
  if (value.startsWith('//')) return null;
  if (value.startsWith('#')) return null;

  const clean = value.split('#')[0].split('?')[0];
  if (!clean) return null;

  const base = clean.startsWith('/') ? root : dirname(fromFile);
  const target = isAbsolute(clean) ? clean : resolve(base, clean);

  if (!target.startsWith(root)) {
    fail(fromFile, `reference escapes the repository: ${value}`);
    return null;
  }
  if (clean.endsWith('/')) return join(target, 'index.html');
  if (existsSync(target) && statSync(target).isDirectory()) {
    const index = join(target, 'index.html');
    return existsSync(index) ? index : null;
  }
  return target;
}

const files = collectHtml(root);
if (files.length === 0) fail(root, 'no HTML files found');

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const rel = relative(root, file).split('\\').join('/');
  checkedFiles.push(rel);

  if (!/<!doctype\s+html/i.test(html.trimStart().slice(0, 200))) {
    fail(file, 'missing or late <!doctype html>');
  }
  for (const [open, close] of [['<html', '</html>'], ['<head', '</head>'], ['<body', '</body>']]) {
    if (!html.includes(open)) fail(file, `missing ${open}>`);
    if (!html.includes(close)) fail(file, `missing ${close}>`);
  }
  if (!/<title>[^<]+<\/title>/i.test(html)) fail(file, 'missing <title>');

  for (const tag of tags(html)) {
    for (const [name, value] of attributes(tag)) {
      if (name !== 'href' && name !== 'src' && name !== 'srcset') continue;
      if (name === 'srcset') {
        for (const candidate of value.split(',')) {
          const target = resolveLocal(file, candidate.trim().split(/\s+/)[0]);
          if (target && !existsSync(target)) fail(file, `missing srcset target: ${candidate.trim()}`);
        }
        continue;
      }
      const target = resolveLocal(file, value);
      if (target && !existsSync(target)) {
        fail(file, `missing link target: ${value} (expected ${relative(root, target).split('\\').join('/')})`);
      }
    }
  }
}

if (!existsSync(join(root, 'index.html'))) fail(root, 'root index.html is missing');

if (failures.length > 0) {
  console.error(`check-site: ${failures.length} problem(s) in ${checkedFiles.length} HTML file(s):\n`);
  for (const problem of failures) console.error('  ' + problem);
  process.exit(1);
}

console.log(`check-site: OK — ${checkedFiles.length} HTML file(s) validated`);
for (const file of checkedFiles) console.log('  ' + file);
