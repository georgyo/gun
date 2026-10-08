// Shows how the built JavaScript differs from the last hand written JavaScript
// release (upstream amark/gun before the TypeScript conversion).
//
// Because the build only blanks out types, any difference reported here is a
// real change in runtime code and should be intentional (and documented in
// TYPESCRIPT.md when it is observable).
//
// Usage:
//   node --experimental-strip-types scripts/diff-upstream.mts [--stat] [file.js ...]
//
// The baseline git ref can be overridden with GUN_UPSTREAM_REF.

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ref = process.env.GUN_UPSTREAM_REF || '054ca85f59d8a8fe6779c19fa34be985e16cfbc9';
const args = process.argv.slice(2);
const stat = args.includes('--stat');

function outputs(): string[] {
  const files = ['gun.js', 'sea.js'];
  for (const dir of ['.', 'lib', 'kit']) {
    for (const name of readdirSync(join(root, dir)).sort()) {
      if (name.endsWith('.ts') && !name.endsWith('.d.ts') && name !== 'types.ts') {
        files.push((dir === '.' ? '' : dir + '/') + name.replace(/\.ts$/, '.js'));
      }
    }
  }
  return files;
}

function upstream(file: string): string {
  try {
    return execFileSync('git', ['show', `${ref}:${file}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

const files = args.filter((a) => !a.startsWith('--'));
const tmp = mkdtempSync(join(tmpdir(), 'gun-diff-'));
let changed = 0;
try {
  for (const file of files.length ? files : outputs()) {
    const a = join(tmp, 'a');
    const b = join(tmp, 'b');
    writeFileSync(a, upstream(file));
    writeFileSync(b, existsSync(join(root, file)) ? readFileSync(join(root, file), 'utf8') : '');
    try {
      execFileSync('git', ['diff', '--no-index', '-w', '--ignore-blank-lines', ...(stat ? ['--numstat'] : []), '--', a, b], {
        encoding: 'utf8',
      });
    } catch (e) {
      changed++;
      const out = String((e as { stdout?: unknown }).stdout ?? '');
      if (stat) {
        const [add, del] = out.trim().split(/\s+/);
        console.log(`${file}: +${add} -${del}`);
      } else {
        console.log(out.replaceAll(`a${a}`, `a/${file}`).replaceAll(`b${b}`, `b/${file}`).replaceAll(a, `a/${file}`).replaceAll(b, `b/${file}`));
      }
    }
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`diff-upstream: ${changed} file(s) differ from ${ref.slice(0, 10)}`);
