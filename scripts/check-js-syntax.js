#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.resolve(__dirname, '..');
const roots = [path.join(root, 'src'), path.join(root, 'scripts')];
const excluded = new Set(['node_modules', '.git', '.venv', '__pycache__']);
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
  }
}
for (const dir of roots) walk(dir);

let failed = 0;
for (const file of files.sort()) {
  const result = cp.spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    failed += 1;
    process.stderr.write(`\nSyntax failure: ${path.relative(root, file)}\n${result.stderr || result.stdout}`);
  }
}
if (failed) {
  console.error(`\n${failed} JavaScript file(s) failed syntax validation.`);
  process.exit(1);
}
console.log(`${files.length} JavaScript files passed syntax validation.`);
