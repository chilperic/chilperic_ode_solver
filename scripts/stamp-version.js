#!/usr/bin/env node
/* Foko Lab build-time asset token stamper.
   Usage:
     node scripts/stamp-version.js            # uses VERSION.json token
     node scripts/stamp-version.js 71.40.0    # explicit token
   This is intentionally build-time only: it rewrites static asset version-query tokens
   before packaging/deploying GitHub Pages output. */
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const versionPath = path.join(root, 'VERSION.json');
const version = process.argv[2] || (fs.existsSync(versionPath) ? JSON.parse(fs.readFileSync(versionPath, 'utf8')).token : null);
if (!version) {
  console.error('No token supplied and VERSION.json is missing.');
  process.exit(1);
}
const exts = new Set(['.html', '.js', '.css', '.md', '.json']);
const skipDirs = new Set(['.git', 'node_modules', '.venv', '__pycache__']);
let scanned = 0, changed = 0, replacements = 0;
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (skipDirs.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (exts.has(path.extname(name).toLowerCase())) stamp(p);
  }
}
function stamp(file) {
  scanned += 1;
  const old = fs.readFileSync(file, 'utf8');
  const next = old.replace(new RegExp('\\?' + 'v=' + '[0-9]+(?:\\.[0-9]+){1,3}', 'g'), () => {
    replacements += 1;
    return '?' + 'v=' + version;
  });
  if (next !== old) {
    fs.writeFileSync(file, next);
    changed += 1;
  }
}
walk(root);
console.log(`Stamped asset token ${version}: ${replacements} replacements in ${changed} files (${scanned} scanned).`);
