import fs from 'fs';
import path from 'path';

const root = process.cwd();
const files = [];

function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);

    if (
      e.isDirectory() &&
      !['node_modules', '.git', 'dist'].includes(e.name)
    ) {
      walk(p);
    } else if (
      /\.(js|jsx|mjs|sql|json)$/.test(e.name) &&
      path.relative(root, p).replace(/\\/g, '/') !== 'scripts/audit-static.mjs'
    ) {
      files.push(p);
    }
  }
}

walk(root);

const checks = [
  [
    'client XP writes to API profile',
    /fetch\(['"]\/api\/profile['"][^]*xp\s*[:=]/i
  ],
  [
    'admin bearer token in frontend',
    /ef-admin-token|Authorization.*Bearer.*admin/i
  ],
  [
    'browser password persistence',
    /localStorage\.[^\n]*(password|passHash)/i
  ],
  [
    'HARD fallback to full catalog',
    /mode === ['"]problems['"][^]*pool = catalog[^]*if \(pool\.length/i
  ]
];

let failed = false;

for (const [name, re] of checks) {
  const hits = files.filter(f =>
    re.test(fs.readFileSync(f, 'utf8'))
  );

  if (hits.length) {
    failed = true;
    console.log(`FAIL ${name}: ${hits.join(', ')}`);
  } else {
    console.log(`PASS ${name}`);
  }
}

console.log(`Scanned ${files.length} source files.`);
process.exitCode = failed ? 1 : 0;