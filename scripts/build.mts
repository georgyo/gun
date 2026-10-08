// Build the published JavaScript from the TypeScript sources.
//
// The sources only use erasable TypeScript syntax (`erasableSyntaxOnly`), so
// every type annotation is simply blanked out with whitespace (ts-blank-space).
// The emitted JavaScript therefore keeps the exact same code, line numbers and
// columns as the TypeScript it came from, which keeps it diffable against the
// historical hand written JavaScript.
//
//   gun.js   <- src/*.ts bundled in the classic `USE(function(module){...})` format.
//   src/*.js <- each module of gun.js also on its own ("unbuilt"), as upstream
//               published them (`require('gun/src/book')`, rad.js, test/rad/book.html).
//   sea.js   <- sea/*.ts bundled the same way.
//   *.js     <- every other *.ts (lib/, kit/, the root entry points) emitted next to its source.
//
// Usage:
//   node --experimental-strip-types scripts/build.mts          write the outputs
//   node --experimental-strip-types scripts/build.mts --check  fail if an output is stale
//   node --experimental-strip-types scripts/build.mts gun.js lib/radix.js  only these outputs

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import tsBlankSpace from 'ts-blank-space';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
const only = new Set(process.argv.slice(2).filter((a) => !a.startsWith('--')));
const wanted = (out: string): boolean => !only.size || only.has(out);

// The runtime module loader shared by both bundles. Kept byte for byte from the
// historical bundles so that `USE` keeps working for anyone poking at it.
const HEADER = `;(function(){

  /* UNBUILD */
  function USE(arg, req){
    return req? require(arg) : arg.slice? USE[R(arg)] : function(mod, path){
      arg(mod = {exports: {}});
      USE[R(path)] = mod.exports;
    }
    function R(p){
      return p.split('/').slice(-1).toString().replace('.js','');
    }
  }
  if(typeof module !== "undefined"){ var MODULE = module }
  /* UNBUILD */
`;

interface Bundle {
  out: string;
  dir: string;
  // Module execution order. Order matters: modules register themselves on the
  // shared `Gun`/`SEA` objects as a side effect of running.
  modules: string[];
  // Prefix used to indent module bodies (and the `;USE(` lines) in the bundle.
  outer: string;
  inner: string;
  // Optional source appended verbatim after the bundle's closing `}());`.
  footer?: string;
  // Also emit every module as `<dir>/<name>.js`, wrapped in `;(function(){ ... }());`
  // exactly like the historical `lib/unbuild.js` wrote them (the wrapper keeps
  // e.g. book's `sT`/`B` from becoming globals when loaded with a <script> tag).
  unbuilt?: boolean;
}

const BUNDLES: Bundle[] = [
  {
    out: 'gun.js',
    dir: 'src',
    modules: [
      'shim', 'onto', 'book', 'valid', 'state', 'dup', 'ask', 'root', 'back', 'chain',
      'get', 'put', 'core', 'index', 'on', 'map', 'set', 'mesh', 'websocket', 'localStorage',
    ],
    outer: '\t',
    inner: '\t\t',
    footer: 'deprecated',
    unbuilt: true,
  },
  {
    out: 'sea.js',
    dir: 'sea',
    modules: [
      'root', 'https', 'base64', 'array', 'buffer', 'shim', 'settings', 'sha256', 'sha1', 'work',
      'pair', 'sign', 'verify', 'aeskey', 'encrypt', 'decrypt', 'secret', 'certify', 'sea', 'user',
      'then', 'create', 'auth', 'recall', 'share', 'index',
    ],
    outer: '  ',
    inner: '',
  },
];

// Directories (relative to the repo root) whose *.ts files are emitted 1:1 as *.js.
const STANDALONE_DIRS = ['.', 'lib', 'kit'];

// TypeScript files that exist only for type checking and produce no output.
const TYPE_ONLY = new Set(['src/types.ts', 'sea/types.ts', 'lib/types.ts']);

function strip(file: string): string {
  const source = readFileSync(join(root, file), 'utf8');
  const errors: string[] = [];
  const out = tsBlankSpace(source, (node) => {
    errors.push(`${file}: non-erasable TypeScript syntax: ${node.getText().slice(0, 80)}`);
  });
  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
  return out;
}

// Inside a bundle `require('./x')` resolves to a sibling module registered with
// `USE`, while `require('crypto', 1)` (second argument) is a real host `require`.
// This is the exact inverse of how the historical `lib/unbuild.js` split bundles.
function toUSE(code: string): string {
  return code.replace(/\brequire\(/g, 'USE(');
}

function indent(code: string, prefix: string): string {
  if (!prefix) {
    return code;
  }
  return code
    .split('\n')
    .map((line) => (line.trim() ? prefix + line : line))
    .join('\n');
}

function trimBlankEdges(code: string): string {
  return code.replace(/^(?:[ \t]*\n)+/, '').replace(/\s+$/, '');
}

function bundle(b: Bundle): string {
  let out = HEADER;
  for (const name of b.modules) {
    const file = `${b.dir}/${name}.ts`;
    const body = trimBlankEdges(toUSE(strip(file)));
    out += `\n${b.outer};USE(function(module){\n${indent(body, b.inner)}\n${b.outer}})(USE, './${name}');\n`;
  }
  out += '\n}());\n';
  if (b.footer) {
    out += '\n' + trimBlankEdges(strip(`${b.dir}/${b.footer}.ts`)) + '\n';
  }
  return out;
}

function unbuilt(b: Bundle): Array<[string, string]> {
  const outputs: Array<[string, string]> = [];
  for (const name of b.modules) {
    const out = `${b.dir}/${name}.js`;
    if (wanted(out)) {
      outputs.push([out, `;(function(){\n${strip(`${b.dir}/${name}.ts`)}\n}());`]);
    }
  }
  return outputs;
}

function standalone(): Array<[string, string]> {
  const outputs: Array<[string, string]> = [];
  for (const dir of STANDALONE_DIRS) {
    for (const name of readdirSync(join(root, dir)).sort()) {
      if (!name.endsWith('.ts') || name.endsWith('.d.ts')) {
        continue;
      }
      const file = dir === '.' ? name : `${dir}/${name}`;
      if (TYPE_ONLY.has(file)) {
        continue;
      }
      const out = file.replace(/\.ts$/, '.js');
      if (wanted(out)) {
        outputs.push([out, strip(file)]);
      }
    }
  }
  return outputs;
}

function main(): void {
  const outputs: Array<[string, string]> = [];
  for (const b of BUNDLES) {
    if (wanted(b.out)) {
      outputs.push([b.out, bundle(b)]);
    }
    if (b.unbuilt) {
      outputs.push(...unbuilt(b));
    }
  }
  outputs.push(...standalone());

  const stale: string[] = [];
  for (const [file, code] of outputs) {
    const path = join(root, file);
    const current = existsSync(path) ? readFileSync(path, 'utf8') : undefined;
    if (current === code) {
      continue;
    }
    if (check) {
      stale.push(file);
    } else {
      writeFileSync(path, code);
      console.log('build:', relative(root, path));
    }
  }
  if (stale.length) {
    console.error('Stale build output, run `npm run build`:\n  ' + stale.join('\n  '));
    process.exit(1);
  }
}

main();
