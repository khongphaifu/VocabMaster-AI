// d:/extension/scripts/build-extension-zip.mjs
// Packages clean Chrome/Orion MV3 Extension zip into dist or public output without dev clutter

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const outPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, 'ipad', 'vocabmaster-extension.zip');

const INCLUDED_TOP = [
  'manifest.json',
  'service-worker.js',
  'content',
  'icons',
  'lib',
  'pdf',
  'popup',
  'settings',
  'sidepanel',
  'utils'
];

const pyScript = `
import os, sys, zipfile
root = sys.argv[1]
out_zip = sys.argv[2]
items = sys.argv[3:]
os.makedirs(os.path.dirname(out_zip), exist_ok=True)
count = 0
with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
    for item in items:
        full = os.path.join(root, item)
        if os.path.isfile(full):
            zf.write(full, item)
            count += 1
        elif os.path.isdir(full):
            for dirpath, _, filenames in os.walk(full):
                for fn in filenames:
                    fp = os.path.join(dirpath, fn)
                    rel = os.path.relpath(fp, root)
                    zf.write(fp, rel)
                    count += 1
print(f"Packaged {count} files -> {out_zip}")
`;

try {
  execFileSync('python3', ['-c', pyScript, ROOT, outPath, ...INCLUDED_TOP], { stdio: 'inherit' });
} catch (_) {
  execFileSync('python', ['-c', pyScript, ROOT, outPath, ...INCLUDED_TOP], { stdio: 'inherit' });
}

if (!fs.existsSync(outPath)) {
  throw new Error('Failed to create extension zip at ' + outPath);
}
