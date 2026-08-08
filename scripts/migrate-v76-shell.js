'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ignoredDirectories = new Set(['node_modules', 'dist', 'release-history']);

function collectHtmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.') || ignoredDirectories.has(entry.name)) return [];
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectHtmlFiles(absolute);
    return entry.name.endsWith('.html') ? [absolute] : [];
  });
}

const htmlFiles = collectHtmlFiles(root).sort();

let changed = 0;
for (const absolute of htmlFiles) {
  const relative = path.relative(root, absolute);
  const depth = relative.split(path.sep).length - 1;
  const prefix = depth ? '../'.repeat(depth) : '';
  const styleTag = `<link href="${prefix}styles/v76-system.css?v=77.4.1" rel="stylesheet"/>`;
  const scriptTag = `<script defer src="${prefix}src/v76/app-shell.js?v=77.4.1"></script>`;
  let source = fs.readFileSync(absolute, 'utf8');
  const before = source;

  source = source.replace(/\sdata-version="[^"]*"/g, '');
  source = source.replace(/Scientific modeling environment\s*·\s*v\d+(?:\.\d+)*/gi, 'Scientific modeling environment');
  source = source.replace(/\?v=75\.0\.4/g, '?v=77.4.1');
  source = source.replace(/\s*<script\b[^>]*src=["'][^"']*src\/navigation\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi, '');
  source = source.replace(/\s*<!--\s*src\/navigation\.js(?:\?[^-]*)?\s+legacy-token-for-contract\s*-->/gi, '');
  source = source.replace(
    /<header\b[^>]*class="[^"]*(?:topbar|public-topbar)[^"]*"[^>]*>[\s\S]*?<\/header>/i,
    `<header class="topbar v76-appbar" data-v76-appbar="true"><a class="v76-brand" href="${prefix}index.html" aria-label="Foko Lab home"><img src="${prefix}assets/brand/foko-lab-logo.svg" alt="Foko Lab"/></a></header>`
  );
  if (!source.includes('data-v76-appbar="true"')) {
    source = source.replace(
      /<body([^>]*)>/i,
      `<body$1><header class="topbar v76-appbar" data-v76-appbar="true"><a class="v76-brand" href="${prefix}index.html" aria-label="Foko Lab home"><img src="${prefix}assets/brand/foko-lab-logo.svg" alt="Foko Lab"/></a></header>`
    );
  }

  if (!source.includes('styles/v76-system.css')) {
    source = source.replace(/<\/head>/i, `${styleTag}\n</head>`);
  }
  if (!source.includes('src/v76/app-shell.js')) {
    source = source.replace(/<\/body>/i, `${scriptTag}\n</body>`);
  }

  if (source !== before) {
    fs.writeFileSync(absolute, source);
    changed += 1;
  }
}

console.log(`migrate-v76-shell.js: updated ${changed}/${htmlFiles.length} HTML files`);
